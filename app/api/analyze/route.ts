import { buildAnalysisFacts } from "@/lib/analysis/build-facts"
import { buildAiFacts, buildFallbackReport } from "@/lib/analysis/reliable-report"
import { groupJobsBySalary } from "@/lib/analysis/classify-salary"
import { getAuthenticatedContext } from "@/lib/auth/session"
import { consumeAnalysisCredit, getCreditBalance } from "@/lib/credits/service"
import { searchRequestSchema } from "@/lib/domain/search-schema"
import type { StreamEvent } from "@/lib/domain/stream-event"
import { JobSearchError, searchJobs } from "@/lib/jobs/search"
import { logServerEvent, requestId as createRequestId } from "@/lib/observability/server-log"
import { analyzeMarket, OpenRouterAnalysisError } from "@/lib/openrouter/client"
import { encodeStreamEvent } from "@/lib/stream/ndjson"
import { verifyTurnstile } from "@/lib/turnstile/verify"

export const maxDuration = 180

const MAX_BODY_BYTES = 32_000

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

export async function POST(request: Request) {
  const requestId = createRequestId(request)
  const requestStartedAt = Date.now()

  let authContext: Awaited<ReturnType<typeof getAuthenticatedContext>>
  try {
    authContext = await getAuthenticatedContext()
  } catch {
    return jsonError("Сервис аккаунтов временно недоступен", 503)
  }
  if (!authContext) return jsonError("Войдите в аккаунт", 401)

  const currentCredits = await getCreditBalance(authContext.supabase, authContext.userId)
  if (currentCredits === null) return jsonError("Не удалось проверить баланс кредитов", 503)
  if (currentCredits <= 0) return jsonError("Кредиты закончились", 402)

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BODY_BYTES) return jsonError("Слишком большой запрос", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("Не удалось прочитать запрос", 400)
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) {
    return jsonError("Слишком большой запрос", 413)
  }

  const parsed = searchRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Проверьте поля формы", issues: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    )
  }

  const turnstileStartedAt = Date.now()
  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, undefined, clientIp(request))
  if (!turnstile.success) {
    const status = turnstile.code === "configuration" ? 503 : 403
    logServerEvent("warn", "analysis.turnstile_failed", {
      requestId,
      durationMs: Date.now() - turnstileStartedAt,
      code: turnstile.code,
      status,
    })
    const message = status === 503 ? "Защита формы пока не настроена" : "Подтвердите, что вы не робот"
    return jsonError(message, status)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: StreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encodeStreamEvent(event))
        } catch {
          closed = true
        }
      }
      const close = () => {
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // The browser may close the stream while an upstream request is finishing.
          }
        }
      }

      try {
        send({ type: "status", status: "searching", message: "Ищем свежие вакансии за последние 7 дней" })
        const searchStartedAt = Date.now()
        const rawJobs = await searchJobs(parsed.data.search)
        const jobs = groupJobsBySalary(rawJobs, parsed.data.search)
        logServerEvent("info", "analysis.jobs_ready", {
          requestId,
          durationMs: Date.now() - searchStartedAt,
          jobCount: jobs.length,
        })
        if (jobs.length === 0) {
          send({ type: "jobs", jobs, searchedAt: new Date().toISOString() })
          send({
            type: "warning",
            code: "empty_sample",
            message: "Английских вакансий по этому сочетанию профессии и места не найдено. Попробуйте английское название, другую страну или поиск по всему миру.",
          })
          send({ type: "complete" })
          logServerEvent("info", "analysis.complete", {
            requestId,
            durationMs: Date.now() - requestStartedAt,
            jobCount: 0,
            mode: "empty",
          })
          close()
          return
        }

        const location = [parsed.data.search.country, parsed.data.search.city].filter(Boolean).join(":")
        const credit = await consumeAnalysisCredit(
          authContext.supabase,
          parsed.data.search.title,
          location,
        )
        if (credit.status === "unavailable") {
          send({ type: "error", code: "credits_unavailable", message: "Не удалось списать кредит. Попробуйте ещё раз позже." })
          send({ type: "complete" })
          close()
          return
        }
        if (credit.status === "exhausted") {
          send({ type: "error", code: "credits_exhausted", message: "Кредиты закончились" })
          send({ type: "complete" })
          close()
          return
        }

        send({
          type: "credits",
          analysisRunId: credit.analysisRunId,
          remainingCredits: credit.remainingCredits,
        })
        send({ type: "jobs", jobs, searchedAt: new Date().toISOString() })
        logServerEvent("info", "analysis.credit_consumed", {
          requestId,
          analysisRunId: credit.analysisRunId,
          remainingCredits: credit.remainingCredits,
        })

        const fullFacts = buildAnalysisFacts(jobs, parsed.data.search, parsed.data.profile)
        const fallbackReport = buildFallbackReport(fullFacts)
        send({ type: "analysis", report: fallbackReport, mode: "fallback" })
        logServerEvent("info", "analysis.fallback_ready", { requestId, jobCount: jobs.length })

        send({ type: "status", status: "analyzing", message: "Уточняем резервный отчёт с помощью AI" })
        const aiFacts = buildAiFacts(jobs, parsed.data.search, parsed.data.profile)
        try {
          const report = await analyzeMarket(aiFacts, {
            signal: request.signal,
            onAttempt: (attempt) => logServerEvent(
              attempt.outcome === "failure" ? "warn" : "info",
              "analysis.openrouter_attempt",
              { requestId, selectedJobCount: aiFacts.jobs.length, ...attempt },
            ),
          })
          send({ type: "analysis", report, mode: "ai" })
          logServerEvent("info", "analysis.ai_ready", { requestId, selectedJobCount: aiFacts.jobs.length })
        } catch (error) {
          const code = error instanceof OpenRouterAnalysisError ? error.code : "unknown"
          const diagnostic = error instanceof OpenRouterAnalysisError ? error.diagnostic : undefined
          logServerEvent("warn", "analysis.ai_fallback", { requestId, code, diagnostic })
          send({
            type: "warning",
            code: "ai_fallback",
            message: "AI-анализ сейчас недоступен. Показан полноценный резервный отчёт по найденным вакансиям — AI можно повторить отдельно.",
          })
        }

        send({ type: "complete" })
        logServerEvent("info", "analysis.complete", {
          requestId,
          durationMs: Date.now() - requestStartedAt,
          jobCount: jobs.length,
        })
        close()
      } catch (error) {
        const message =
          error instanceof JobSearchError ? error.message : "Не удалось получить вакансии. Попробуйте ещё раз позже."
        logServerEvent("error", "analysis.job_search_failed", {
          requestId,
          durationMs: Date.now() - requestStartedAt,
          code: error instanceof JobSearchError ? error.code : "unknown",
        })
        send({ type: "error", code: "job_search_failed", message })
        send({ type: "complete" })
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  })
}
