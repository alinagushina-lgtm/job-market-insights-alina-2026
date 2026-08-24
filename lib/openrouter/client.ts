import { z } from "zod"

import type { AnalysisFacts } from "@/lib/analysis/build-facts"
import { MARKET_REPORT_JSON_SCHEMA, marketReportSchema, type MarketReport } from "@/lib/domain/report"
import { buildMarketPrompt } from "@/lib/openrouter/prompt"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
export const OPENROUTER_MODEL = "google/gemini-3.7-flash"

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
  ) {
    super(message)
    this.name = "OpenRouterAnalysisError"
  }
}

type Fetcher = typeof fetch

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

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(90_000)
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
  signal?: AbortSignal,
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
      max_tokens: 4000,
      provider: { require_parameters: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "job_market_report", strict: true, schema: MARKET_REPORT_JSON_SCHEMA },
      },
    }),
    signal: requestSignal(signal),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterAnalysisError("Ключ OpenRouter не принят", "authorization")
    }
    throw new OpenRouterAnalysisError("Сервис анализа временно недоступен", "upstream", `http_${response.status}`)
  }

  const completion = completionSchema.safeParse(await response.json())
  if (!completion.success) {
    throw new OpenRouterAnalysisError(
      "Модель вернула неполный ответ",
      "invalid_response",
      completion.error.issues[0]?.path.join(".") || "completion_schema",
    )
  }

  try {
    const parsed = marketReportSchema.parse(parseJsonContent(completion.data.choices[0].message.content))
    return normalizeReport(parsed, facts)
  } catch (error) {
    const diagnostic = error instanceof z.ZodError
      ? `${error.issues[0]?.path.join(".")}:${error.issues[0]?.message}`
      : error instanceof Error ? error.name : "json_parse"
    throw new OpenRouterAnalysisError("Модель вернула ответ неверного формата", "invalid_response", diagnostic)
  }
}

export async function analyzeMarket(
  facts: AnalysisFacts,
  options: { apiKey?: string; fetcher?: Fetcher; signal?: AbortSignal } = {},
) {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterAnalysisError("OpenRouter не настроен", "configuration")
  const fetcher = options.fetcher ?? fetch

  try {
    return await requestReport(facts, apiKey, fetcher, options.signal)
  } catch (error) {
    if (error instanceof OpenRouterAnalysisError && error.code === "invalid_response") {
      return requestReport(facts, apiKey, fetcher, options.signal)
    }
    if (error instanceof OpenRouterAnalysisError) throw error
    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new OpenRouterAnalysisError("Анализ занял слишком много времени", "timeout")
    }
    const diagnostic = error instanceof Error ? `${error.name}:${error.message}`.slice(0, 240) : "unknown"
    throw new OpenRouterAnalysisError("Сервис анализа временно недоступен", "upstream", diagnostic)
  }
}
