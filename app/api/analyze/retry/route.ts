import type { AnalysisFacts } from "@/lib/analysis/build-facts"
import { getAuthenticatedContext } from "@/lib/auth/session"
import { claimAiRetry } from "@/lib/credits/service"
import { retryAnalysisRequestSchema } from "@/lib/domain/retry-analysis-schema"
import { logServerEvent, requestId as createRequestId } from "@/lib/observability/server-log"
import { analyzeMarket, OpenRouterAnalysisError } from "@/lib/openrouter/client"
import { verifyTurnstile } from "@/lib/turnstile/verify"

export const maxDuration = 60

const MAX_BODY_BYTES = 40_000

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

export async function POST(request: Request) {
  const requestId = createRequestId(request)
  const startedAt = Date.now()

  let authContext: Awaited<ReturnType<typeof getAuthenticatedContext>>
  try {
    authContext = await getAuthenticatedContext()
  } catch {
    return Response.json({ error: "Сервис аккаунтов временно недоступен" }, { status: 503 })
  }
  if (!authContext) return Response.json({ error: "Войдите в аккаунт" }, { status: 401 })

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BODY_BYTES) return Response.json({ error: "Слишком большой запрос" }, { status: 413 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Не удалось прочитать запрос" }, { status: 400 })
  }
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Слишком большой запрос" }, { status: 413 })
  }

  const parsed = retryAnalysisRequestSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "Данные для повторного анализа устарели" }, { status: 400 })

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, undefined, clientIp(request))
  if (!turnstile.success) {
    const status = turnstile.code === "configuration" ? 503 : 403
    return Response.json(
      { error: status === 503 ? "Защита формы пока не настроена" : "Подтвердите, что вы не робот" },
      { status },
    )
  }

  const retryPermission = await claimAiRetry(authContext.supabase, parsed.data.analysisRunId)
  if (retryPermission === "unavailable") {
    return Response.json({ error: "Не удалось проверить право на повтор. Попробуйте позже." }, { status: 503 })
  }
  if (retryPermission === "used_or_foreign") {
    return Response.json({ error: "Бесплатный повтор уже использован или результат вам не принадлежит." }, { status: 409 })
  }

  const facts = parsed.data.facts as AnalysisFacts
  try {
    const report = await analyzeMarket(facts, {
      signal: request.signal,
      onAttempt: (attempt) => logServerEvent(
        attempt.outcome === "failure" ? "warn" : "info",
        "analysis.retry_openrouter_attempt",
        { requestId, selectedJobCount: facts.jobs.length, ...attempt },
      ),
    })
    logServerEvent("info", "analysis.retry_complete", {
      requestId,
      analysisRunId: parsed.data.analysisRunId,
      durationMs: Date.now() - startedAt,
      selectedJobCount: facts.jobs.length,
    })
    return Response.json({ report, mode: "ai" }, {
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    })
  } catch (error) {
    const analysisError = error instanceof OpenRouterAnalysisError ? error : null
    logServerEvent("warn", "analysis.retry_failed", {
      requestId,
      analysisRunId: parsed.data.analysisRunId,
      durationMs: Date.now() - startedAt,
      code: analysisError?.code ?? "unknown",
      diagnostic: analysisError?.diagnostic,
    })
    return Response.json(
      { error: "AI-анализ всё ещё недоступен. Резервный отчёт сохранён — попробуйте повторить позже." },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    )
  }
}
