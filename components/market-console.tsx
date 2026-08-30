"use client"

import { FormEvent, useCallback, useState } from "react"

import { JobBoard } from "@/components/job-board"
import { MarketReport } from "@/components/market-report"
import { ThinkingStage } from "@/components/thinking-stage"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/components/account-provider"
import { buildAiFacts } from "@/lib/analysis/reliable-report"
import { findCachedResult, requestCacheKey, saveResult } from "@/lib/client/history"
import { readNdjson } from "@/lib/client/stream"
import { COUNTRIES, SALARY_CURRENCIES, countryByCode, countryByInput } from "@/lib/domain/countries"
import type { JobWithSalaryGroup } from "@/lib/domain/job"
import { JOB_TITLE_OPTIONS } from "@/lib/domain/job-titles"
import type { MarketReport as MarketReportData } from "@/lib/domain/report"
import {
  JOB_LEVELS,
  PROFILE_LEVELS,
  WORK_MODES,
  type JobSearch,
  type SearchRequest,
} from "@/lib/domain/search-schema"
import type { AnalysisMode, AnalysisStatus, StreamEvent } from "@/lib/domain/stream-event"

const FIELD_CLASS = "mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
const LABEL_CLASS = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
const LEVEL_LABELS = { any: "Любой", junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" }
const WORK_LABELS = { any: "Любой", remote: "Удалённо", hybrid: "Гибрид", onsite: "Офис" }

type RequestWithoutToken = Omit<SearchRequest, "turnstileToken">
type ResultState = {
  jobs: JobWithSalaryGroup[]
  report?: MarketReportData
  mode?: AnalysisMode
  warning?: string
  cached?: boolean
  analysisRunId?: string
  retryUsed?: boolean
}

function splitSkills(value: string) {
  return Array.from(new Set(value.split(/[,;\n]/).map((skill) => skill.trim().toLowerCase()).filter(Boolean)))
}

export function MarketConsole() {
  const { credits, setCredits } = useAccount()
  const [title, setTitle] = useState("")
  const [alternateTitle, setAlternateTitle] = useState("")
  const [country, setCountry] = useState<JobSearch["country"] | null>("WORLD")
  const [countryInput, setCountryInput] = useState(countryByCode("WORLD").name)
  const [city, setCity] = useState("")
  const [workMode, setWorkMode] = useState<JobSearch["workMode"]>("any")
  const [jobLevel, setJobLevel] = useState<JobSearch["level"]>("any")
  const [minSalary, setMinSalary] = useState("")
  const [salaryCurrency, setSalaryCurrency] = useState<JobSearch["salaryCurrency"]>("USD")
  const [profileLevel, setProfileLevel] = useState<SearchRequest["profile"]["level"]>("middle")
  const [yearsExperience, setYearsExperience] = useState("3")
  const [skills, setSkills] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileVersion, setTurnstileVersion] = useState(0)
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")
  const [result, setResult] = useState<ResultState | null>(null)
  const [lastRequest, setLastRequest] = useState<RequestWithoutToken | null>(null)
  const [retryingAi, setRetryingAi] = useState(false)

  const handleTurnstileToken = useCallback((token: string) => setTurnstileToken(token), [])

  function changeCountry(value: string) {
    setCountryInput(value)
    const selectedCountry = countryByInput(value)
    setCountry(selectedCountry?.code ?? null)
    if (!selectedCountry) return

    setSalaryCurrency(selectedCountry.currency)
    if (selectedCountry.code === "WORLD") setCity("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setResult(null)

    const normalizedSkills = splitSkills(skills)
    if (!title.trim() || !normalizedSkills.length) {
      setError("Укажите профессию и хотя бы один навык.")
      return
    }
    if (!country) {
      setError("Выберите страну из списка или вариант «Весь мир».")
      return
    }

    const requestWithoutToken = {
      search: {
        title: title.trim(),
        alternateTitle: alternateTitle.trim() || undefined,
        country,
        city: country === "WORLD" ? undefined : city.trim() || undefined,
        workMode,
        level: jobLevel,
        minSalary: minSalary ? Number(minSalary) : undefined,
        salaryCurrency,
      },
      profile: { level: profileLevel, yearsExperience: Number(yearsExperience), skills: normalizedSkills },
    } satisfies RequestWithoutToken
    setLastRequest(requestWithoutToken)
    const cacheKey = requestCacheKey(requestWithoutToken)
    const cached = findCachedResult(localStorage, cacheKey)
    if (cached) {
      setResult({
        jobs: cached.jobs,
        report: cached.report,
        mode: cached.mode,
        warning: cached.warning,
        cached: true,
        analysisRunId: cached.analysisRunId,
      })
      return
    }

    if (!turnstileToken) {
      setError("Завершите проверку безопасности перед поиском.")
      return
    }
    if (credits <= 0) {
      setError("Кредиты закончились. Сохранённые результаты по-прежнему доступны 6 часов.")
      return
    }

    const payload: SearchRequest = { ...requestWithoutToken, turnstileToken }
    setStatus("verifying")
    setStatusMessage("Проверяем форму и защиту от роботов")
    setTurnstileToken("")
    setTurnstileVersion((version) => version + 1)

    let streamedJobs: JobWithSalaryGroup[] = []
    let streamedReport: MarketReportData | undefined
    let streamedMode: AnalysisMode | undefined
    let streamedWarning: string | undefined
    let streamedAnalysisRunId: string | undefined

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        if (response.status === 402) setCredits(0)
        throw new Error(body?.error ?? "Сервер не принял запрос")
      }

      await readNdjson(response, (streamEvent: StreamEvent) => {
        if (streamEvent.type === "status") {
          setStatus(streamEvent.status)
          setStatusMessage(streamEvent.message)
        } else if (streamEvent.type === "credits") {
          streamedAnalysisRunId = streamEvent.analysisRunId
          setCredits(streamEvent.remainingCredits)
          setResult((current) => ({
            ...(current ?? { jobs: streamedJobs }),
            analysisRunId: streamedAnalysisRunId,
          }))
        } else if (streamEvent.type === "jobs") {
          streamedJobs = streamEvent.jobs
          setResult({ jobs: streamedJobs, analysisRunId: streamedAnalysisRunId })
        } else if (streamEvent.type === "analysis") {
          streamedReport = streamEvent.report
          streamedMode = streamEvent.mode
          if (streamedMode === "ai") streamedWarning = undefined
          setResult({ jobs: streamedJobs, report: streamedReport, mode: streamedMode, warning: streamedWarning, analysisRunId: streamedAnalysisRunId })
        } else if (streamEvent.type === "warning") {
          streamedWarning = streamEvent.message
          setResult({ jobs: streamedJobs, report: streamedReport, mode: streamedMode, warning: streamedWarning, analysisRunId: streamedAnalysisRunId })
        } else if (streamEvent.type === "error") {
          if (streamEvent.code === "credits_exhausted") setCredits(0)
          setError(streamEvent.message)
        }
      })

      if (streamedJobs.length || streamedWarning) {
        saveResult(localStorage, {
          key: cacheKey,
          createdAt: Date.now(),
          jobs: streamedJobs,
          report: streamedReport,
          mode: streamedMode,
          warning: streamedWarning,
          analysisRunId: streamedAnalysisRunId,
        })
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось выполнить поиск")
    } finally {
      setStatus(null)
    }
  }

  async function handleRetryAi() {
    if (!result?.report || result.mode !== "fallback" || !result.analysisRunId || result.retryUsed || !lastRequest || retryingAi) return
    setError("")
    if (!turnstileToken) {
      setError("Завершите проверку безопасности, затем повторите AI-анализ.")
      return
    }

    const token = turnstileToken
    const facts = buildAiFacts(result.jobs, lastRequest.search, lastRequest.profile)
    const cacheKey = requestCacheKey(lastRequest)
    setRetryingAi(true)
    setStatus("analyzing")
    setStatusMessage("Повторяем только AI-анализ — вакансии заново не ищем")
    setTurnstileToken("")
    setTurnstileVersion((version) => version + 1)

    try {
      const response = await fetch("/api/analyze/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisRunId: result.analysisRunId, facts, turnstileToken: token }),
      })
      const body = await response.json().catch(() => null) as { error?: string; report?: MarketReportData } | null
      if (!response.ok || !body?.report) throw new Error(body?.error ?? "Не удалось повторить AI-анализ")

      const nextResult: ResultState = { ...result, report: body.report, mode: "ai", warning: undefined, cached: false, retryUsed: true }
      setResult(nextResult)
      saveResult(localStorage, {
        key: cacheKey,
        createdAt: Date.now(),
        jobs: nextResult.jobs,
        report: nextResult.report,
        mode: nextResult.mode,
        analysisRunId: nextResult.analysisRunId,
      })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Не удалось повторить AI-анализ"
      setResult((current) => current ? { ...current, warning: message, retryUsed: true } : current)
    } finally {
      setRetryingAi(false)
      setStatus(null)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 shadow-sm lg:p-7">
        <div className="flex flex-col gap-2 border-b border-border pb-5">
          <p className={LABEL_CLASS}>точный поиск · до 20 вакансий · последние 7 дней</p>
          <h2 className="text-2xl font-medium tracking-tight">Что вы ищете</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Выберите русскую подсказку для английского поиска или введите собственное название профессии.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <label>
            <span className={LABEL_CLASS}>профессия *</span>
            <input
              required
              minLength={2}
              maxLength={80}
              list="job-title-options"
              aria-describedby="job-title-hint"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD_CLASS}
              placeholder="Выберите или введите профессию"
            />
            <datalist id="job-title-options">
              {JOB_TITLE_OPTIONS.map((option) => <option key={option.query} value={option.label}>{option.query}</option>)}
            </datalist>
            <span id="job-title-hint" className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
              Для собственного варианта лучше использовать английское название.
            </span>
          </label>
          <label>
            <span className={LABEL_CLASS}>альтернативное название</span>
            <input maxLength={80} value={alternateTitle} onChange={(event) => setAlternateTitle(event.target.value)} className={FIELD_CLASS} placeholder="Например, accountant" />
          </label>
          <label>
            <span className={LABEL_CLASS}>страна *</span>
            <input
              required
              list="country-options"
              aria-describedby="country-hint"
              value={countryInput}
              onChange={(event) => changeCountry(event.target.value)}
              className={FIELD_CLASS}
              placeholder="Начните вводить страну"
            />
            <datalist id="country-options">
              {COUNTRIES.map((item) => <option key={item.code} value={item.name}>{item.englishName}</option>)}
            </datalist>
            <span id="country-hint" className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
              Можно выбрать конкретную страну или искать по всему миру.
            </span>
          </label>
          <label>
            <span className={LABEL_CLASS}>город</span>
            <input
              maxLength={80}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:opacity-55`}
              placeholder={country === "WORLD" ? "Не нужен для поиска по миру" : "Например, Берлин"}
              disabled={country === "WORLD"}
              aria-describedby="city-hint"
            />
            <span id="city-hint" className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
              {country === "WORLD" ? "Выберите страну, чтобы уточнить город." : "Необязательно: город уточняет поиск."}
            </span>
          </label>
          <label>
            <span className={LABEL_CLASS}>формат работы</span>
            <select value={workMode} onChange={(event) => setWorkMode(event.target.value as JobSearch["workMode"])} className={FIELD_CLASS}>
              {WORK_MODES.map((item) => <option key={item} value={item}>{WORK_LABELS[item]}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL_CLASS}>уровень вакансии</span>
            <select value={jobLevel} onChange={(event) => setJobLevel(event.target.value as JobSearch["level"])} className={FIELD_CLASS}>
              {JOB_LEVELS.map((item) => <option key={item} value={item}>{LEVEL_LABELS[item]}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL_CLASS}>минимальная зарплата</span>
            <input type="number" min="1" max="1000000000" value={minSalary} onChange={(event) => setMinSalary(event.target.value)} className={FIELD_CLASS} placeholder="Например, 200000" />
          </label>
          <label>
            <span className={LABEL_CLASS}>валюта зарплаты</span>
            <select value={salaryCurrency} onChange={(event) => setSalaryCurrency(event.target.value as JobSearch["salaryCurrency"])} className={FIELD_CLASS}>
              {SALARY_CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="mt-7 border-t border-border pt-6">
          <legend className="px-2 text-lg font-medium">Ваш профиль для сравнения</legend>
          <div className="mt-3 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={LABEL_CLASS}>ваш уровень *</span>
              <select value={profileLevel} onChange={(event) => setProfileLevel(event.target.value as SearchRequest["profile"]["level"])} className={FIELD_CLASS}>
                {PROFILE_LEVELS.map((item) => <option key={item} value={item}>{LEVEL_LABELS[item]}</option>)}
              </select>
            </label>
            <label>
              <span className={LABEL_CLASS}>лет опыта *</span>
              <input required type="number" min="0" max="60" step="0.5" value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} className={FIELD_CLASS} />
            </label>
            <label className="md:col-span-2 lg:col-span-1">
              <span className={LABEL_CLASS}>навыки через запятую *</span>
              <input required value={skills} onChange={(event) => setSkills(event.target.value)} className={FIELD_CLASS} placeholder="1C, Excel, МСФО" />
            </label>
          </div>
        </fieldset>

        <div className="mt-7 flex flex-col gap-5 border-t border-border pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <TurnstileWidget key={turnstileVersion} onToken={handleTurnstileToken} />
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Новый анализ расходует 1 кредит. Повтор одинакового запроса берётся из кэша бесплатно до 6 часов.
            </p>
          </div>
          <Button type="submit" size="lg" disabled={Boolean(status) || retryingAi || credits <= 0} className="min-w-44">
            {status ? "Выполняется…" : "Найти и разобрать"}
          </Button>
        </div>

        {error ? <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      </form>

      {status ? <ThinkingStage status={status} message={statusMessage} /> : null}
      {result?.cached ? <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">Показан сохранённый результат: он моложе 6 часов.</p> : null}
      {result?.warning ? <p role="status" className="rounded-lg border border-signal/40 bg-signal/10 px-4 py-3 text-sm">{result.warning}</p> : null}
      {result ? <JobBoard jobs={result.jobs} report={result.report} /> : null}
      {result?.report ? (
        <MarketReport
          report={result.report}
          jobCount={result.jobs.length}
          mode={result.mode ?? "fallback"}
          onRetryAi={result.mode === "fallback" && result.analysisRunId && !result.retryUsed ? handleRetryAi : undefined}
          retrying={retryingAi}
        />
      ) : null}
    </div>
  )
}
