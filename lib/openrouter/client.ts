import { z } from "zod"

import type { AnalysisFacts } from "@/lib/analysis/build-facts"
import { MARKET_REPORT_JSON_SCHEMA, marketReportSchema, type MarketReport } from "@/lib/domain/report"
import { buildMarketPrompt } from "@/lib/openrouter/prompt"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
export const OPENROUTER_MODEL = "google/gemini-3.7-flash"
export const OPENROUTER_ATTEMPT_TIMEOUT_MS = 25_000
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 500

const completionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ).min(1),
})

export class OpenRouterAnalysisError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "authorization" | "timeout" | "invalid_response" | "upstream",
    readonly diagnostic?: string,
    readonly retriable = false,
  ) {
    super(message)
    this.name = "OpenRouterAnalysisError"
  }
}

export type OpenRouterAttemptEvent = {
  attempt: number
  outcome: "success" | "retry" | "failure"
  durationMs: number
  code?: OpenRouterAnalysisError["code"]
  diagnostic?: string
}

type Fetcher = typeof fetch
type AnalyzeMarketOptions = {
  apiKey?: string
  fetcher?: Fetcher
  signal?: AbortSignal
  timeoutMs?: number
  retryDelayMs?: number
  sleep?: (milliseconds: number) => Promise<void>
  onAttempt?: (event: OpenRouterAttemptEvent) => void
}

function parseJsonContent(content: string) {
  const trimmed = content.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    return JSON.parse(withoutFence) as unknown
  } catch (firstError) {
    const objectStart = withoutFence.indexOf("{")
    const objectEnd = withoutFence.lastIndexOf("}")
    if (objectStart === -1 || objectEnd <= objectStart) throw firstError
    return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1)) as unknown
  }
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

function normalizeReport(report: MarketReport, facts: AnalysisFacts): MarketReport {
  const jobIds = new Set(facts.jobs.map((job) => job.id))
  const scoresById = new Map(report.matchScores.filter((item) => jobIds.has(item.jobId)).map((item) => [item.jobId, item]))

  return {
    ...report,
    frequentSkills: facts.skills.frequent,
    rareSkills: facts.skills.rare.map((skill) => skill.name),
    matchScores: facts.jobs.flatMap((job) => {
      const score = scoresById.get(job.id)
      return score ? [score] : []
    }),
  }
}

async function requestReport(
  facts: AnalysisFacts,
  apiKey: string,
  fetcher: Fetcher,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<MarketReport> {
  const response = await fetcher(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "Job Market Insights",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: buildMarketPrompt(facts) }],
      temperature: 0.2,
      max_tokens: 2500,
      provider: { require_parameters: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "job_market_report", strict: true, schema: MARKET_REPORT_JSON_SCHEMA },
      },
    }),
    signal: requestSignal(signal, timeoutMs),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterAnalysisError("Ключ OpenRouter не принят", "authorization", `http_${response.status}`)
    }
    const retriable = response.status === 429 || response.status >= 500
    throw new OpenRouterAnalysisError(
      "Сервис анализа временно недоступен",
      "upstream",
      `http_${response.status}`,
      retriable,
    )
  }

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    throw new OpenRouterAnalysisError("Модель вернула ответ неверного формата", "invalid_response", "response_json", true)
  }

  const completion = completionSchema.safeParse(responseBody)
  if (!completion.success) {
    throw new OpenRouterAnalysisError(
      "Модель вернула неполный ответ",
      "invalid_response",
      completion.error.issues[0]?.path.join(".") || "completion_schema",
      true,
    )
  }

  try {
    const parsed = marketReportSchema.parse(parseJsonContent(completion.data.choices[0].message.content))
    return normalizeReport(parsed, facts)
  } catch (error) {
    const diagnostic = error instanceof z.ZodError
      ? `${error.issues[0]?.path.join(".")}:${error.issues[0]?.message}`
      : error instanceof Error ? error.name : "json_parse"
    throw new OpenRouterAnalysisError("Модель вернула ответ неверного формата", "invalid_response", diagnostic, true)
  }
}

function normalizeAttemptError(error: unknown) {
  if (error instanceof OpenRouterAnalysisError) return error
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new OpenRouterAnalysisError("Анализ занял слишком много времени", "timeout", error.name, true)
  }
  const diagnostic = error instanceof Error ? `${error.name}:${error.message}`.slice(0, 240) : "unknown"
  return new OpenRouterAnalysisError("Сервис анализа временно недоступен", "upstream", diagnostic, true)
}

export async function analyzeMarket(facts: AnalysisFacts, options: AnalyzeMarketOptions = {}) {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterAnalysisError("OpenRouter не настроен", "configuration")
  const fetcher = options.fetcher ?? fetch
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const timeoutMs = options.timeoutMs ?? OPENROUTER_ATTEMPT_TIMEOUT_MS
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now()
    try {
      const report = await requestReport(facts, apiKey, fetcher, options.signal, timeoutMs)
      options.onAttempt?.({ attempt, outcome: "success", durationMs: Date.now() - startedAt })
      return report
    } catch (rawError) {
      const error = normalizeAttemptError(rawError)
      const willRetry = attempt < MAX_ATTEMPTS && error.retriable && !options.signal?.aborted
      options.onAttempt?.({
        attempt,
        outcome: willRetry ? "retry" : "failure",
        durationMs: Date.now() - startedAt,
        code: error.code,
        diagnostic: error.diagnostic,
      })
      if (!willRetry) throw error
      await sleep(retryDelayMs)
    }
  }

  throw new OpenRouterAnalysisError("Сервис анализа временно недоступен", "upstream")
}
