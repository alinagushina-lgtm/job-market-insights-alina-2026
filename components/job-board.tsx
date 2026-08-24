"use client"

import { useDeferredValue, useMemo, useState } from "react"

import type { JobWithSalaryGroup, SalaryGroup } from "@/lib/domain/job"
import type { MarketReport } from "@/lib/domain/report"

const GROUP_LABELS: Record<SalaryGroup, { title: string; note: string }> = {
  matching: { title: "Подходят по зарплате", note: "Верхняя граница не ниже вашего минимума" },
  unknown: { title: "Без указанной зарплаты", note: "Работодатель не опубликовал вилку" },
  incomparable: { title: "Нельзя сравнить напрямую", note: "Другая валюта или период оплаты" },
  below: { title: "Ниже зарплатного ориентира", note: "Известная верхняя граница ниже вашего минимума" },
}

const GROUP_ORDER = Object.keys(GROUP_LABELS) as SalaryGroup[]
const WORK_MODE_LABELS = { remote: "удалённо", hybrid: "гибрид", onsite: "офис", unknown: "формат не указан" }

function formatSalary(job: JobWithSalaryGroup) {
  const salary = job.salary
  if (!salary || (salary.min === undefined && salary.max === undefined)) return "зарплата не указана"
  const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
  const amount = salary.min === salary.max
    ? number.format(salary.min ?? salary.max ?? 0)
    : `${salary.min !== undefined ? number.format(salary.min) : "?"}–${salary.max !== undefined ? number.format(salary.max) : "?"}`
  const period = salary.period === "month" ? "в месяц" : salary.period === "year" ? "в год" : salary.period === "hour" ? "в час" : ""
  return `${amount} ${salary.currency ?? ""} ${period}`.trim()
}

function JobCard({ job, score }: { job: JobWithSalaryGroup; score?: { score: number; reason: string } }) {
  return (
    <article className="animate-fade-rise flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm [content-visibility:auto]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-pretty text-base font-medium leading-snug tracking-tight">{job.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.locationLabel}</p>
        </div>
        {score ? (
          <div className="shrink-0 text-right" title={score.reason}>
            <p className="font-mono text-lg font-medium tabular-nums">{score.score}%</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">совпадение</p>
          </div>
        ) : null}
      </div>

      {score ? (
        <div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${score.score}%` }} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{score.reason}</p>
        </div>
      ) : null}

      {job.skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 8).map((skill) => (
            <span key={skill} className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
        <span className="text-foreground">{formatSalary(job)}</span>
        <span>{WORK_MODE_LABELS[job.workMode]}</span>
        <span>{job.level === "unknown" ? "уровень не указан" : job.level}</span>
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-sans text-sm font-medium text-primary hover:underline"
        >
          Открыть вакансию ↗
        </a>
      </div>
    </article>
  )
}

export function JobBoard({ jobs, report }: { jobs: JobWithSalaryGroup[]; report?: MarketReport }) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const scoreMap = useMemo(() => new Map(report?.matchScores.map((score) => [score.jobId, score]) ?? []), [report])
  const groups = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return GROUP_ORDER.map((group) => ({
      group,
      jobs: jobs.filter((job) =>
        job.salaryGroup === group && (!needle || `${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase().includes(needle)),
      ),
    })).filter((entry) => entry.jobs.length)
  }, [deferredQuery, jobs])

  return (
    <section id="vacancies" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">выборка · {jobs.length} вакансий</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Найденные вакансии</h2>
        </div>
        <label className="w-full max-w-xs">
          <span className="sr-only">Фильтр вакансий</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Должность, компания, навык"
            className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>

      {groups.length ? groups.map(({ group, jobs: groupJobs }) => (
        <section key={group} aria-labelledby={`salary-group-${group}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 id={`salary-group-${group}`} className="text-lg font-medium">{GROUP_LABELS[group].title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{GROUP_LABELS[group].note}</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{groupJobs.length}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {groupJobs.map((job) => <JobCard key={job.id} job={job} score={scoreMap.get(job.id)} />)}
          </div>
        </section>
      )) : (
        <p className="rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm text-muted-foreground">
          {jobs.length
            ? "По этому фильтру вакансий нет."
            : "Вакансии не найдены. Попробуйте английское название, другую страну или поиск по всему миру."}
        </p>
      )}
    </section>
  )
}
