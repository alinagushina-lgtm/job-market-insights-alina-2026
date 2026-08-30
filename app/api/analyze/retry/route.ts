import type { AnalysisFacts } from "@/lib/analysis/build-facts"
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
