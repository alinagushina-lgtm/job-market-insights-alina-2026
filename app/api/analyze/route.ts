import { buildAnalysisFacts } from "@/lib/analysis/build-facts"
import { groupJobsBySalary } from "@/lib/analysis/classify-salary"
import { searchRequestSchema } from "@/lib/domain/search-schema"
import type { StreamEvent } from "@/lib/domain/stream-event"
import { JobSearchError, searchJobs } from "@/lib/jobs/search"
import { analyzeMarket, OpenRouterAnalysisError } from "@/lib/openrouter/client"
import { encodeStreamEvent } from "@/lib/stream/ndjson"
import { verifyTurnstile } from "@/lib/turnstile/verify"

const MAX_BODY_BYTES = 32_000

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

export async function POST(request: Request) {
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

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, undefined, clientIp(request))
  if (!turnstile.success) {
    const status = turnstile.code === "configuration" ? 503 : 403
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
        const rawJobs = await searchJobs(parsed.data.search)
        const jobs = groupJobsBySalary(rawJobs, parsed.data.search)
        send({ type: "jobs", jobs, searchedAt: new Date().toISOString() })

        if (jobs.length === 0) {
          send({
            type: "warning",
            code: "empty_sample",
            message: "Английских вакансий по этому сочетанию профессии и места не найдено. Попробуйте английское название, другую страну или поиск по всему миру.",
          })
          send({ type: "complete" })
          close()
          return
        }

        send({ type: "status", status: "analyzing", message: `Анализируем требования в ${jobs.length} вакансиях` })
        try {
          const facts = buildAnalysisFacts(jobs, parsed.data.search, parsed.data.profile)
          const report = await analyzeMarket(facts, { signal: request.signal })
          send({ type: "analysis", report })
        } catch (error) {
          if (error instanceof OpenRouterAnalysisError) {
            console.warn("OpenRouter analysis failed", { code: error.code, diagnostic: error.diagnostic })
          }
          const message =
            error instanceof OpenRouterAnalysisError
              ? `${error.message}. Вакансии уже доступны ниже.`
              : "Не удалось завершить анализ. Вакансии уже доступны ниже."
          send({ type: "warning", code: "analysis_unavailable", message })
        }

        send({ type: "complete" })
        close()
      } catch (error) {
        const message =
          error instanceof JobSearchError ? error.message : "Не удалось получить вакансии. Попробуйте ещё раз позже."
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
    },
  })
}
