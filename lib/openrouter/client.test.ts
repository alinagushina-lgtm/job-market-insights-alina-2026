import { describe, expect, it, vi } from "vitest"

import { analyzeMarket, OPENROUTER_MODEL } from "@/lib/openrouter/client"
import type { AnalysisFacts } from "@/lib/analysis/build-facts"

const facts = {
  sample: { jobCount: 1, searchedTitle: "Бухгалтер", country: "KZ", city: "Алматы" },
  skills: { frequent: [{ name: "1C", count: 1 }], rare: [{ name: "1C", count: 1 }] },
  salary: { currency: "KZT", comparableValueCount: 1, min: 400000, max: 400000 },
  profile: { level: "middle", yearsExperience: 3, skills: ["1c"] },
  jobs: [
    {
      id: "job-1",
      title: "Accountant",
      company: "Example",
      level: "middle",
      workMode: "hybrid",
      skills: ["1C"],
      description: "Accounting",
      salaryGroup: "matching",
    },
  ],
} satisfies AnalysisFacts

const validReport = {
  summary: "В выборке одна вакансия.",
  sampleNotice: "Вывод основан на одной вакансии.",
  frequentSkills: [{ name: "Выдуманный навык", count: 20 }],
  rareSkills: ["Выдуманный навык"],
  typicalRequirements: ["Знание 1C"],
  strengths: ["Есть 1C"],
  gaps: [],
  roadmap: [
    { title: "Углубить 1C", why: "Навык есть в выборке", priority: 1 },
    { title: "Изучить отчётность", why: "Полезно для роли", priority: 2 },
    { title: "Подготовить кейсы", why: "Для собеседования", priority: 3 },
  ],
  matchScores: [
    { jobId: "job-1", score: 82, reason: "Совпадает 1C" },
    { jobId: "unknown", score: 99, reason: "Не существует" },
  ],
}

function responseWith(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function responseWithText(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("analyzeMarket", () => {
  it("заменяет частоты детерминированными фактами и отбрасывает неизвестные jobId", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) => responseWith(validReport))
    const report = await analyzeMarket(facts, { apiKey: "test", fetcher: fetcher as unknown as typeof fetch })

    expect(report.frequentSkills).toEqual([{ name: "1C", count: 1 }])
    expect(report.rareSkills).toEqual(["1C"])
    expect(report.matchScores).toHaveLength(1)
    const request = fetcher.mock.calls[0]?.[1]
    expect(request).toBeDefined()
    expect(JSON.parse(String(request?.body))).toMatchObject({ model: OPENROUTER_MODEL, max_tokens: 2500 })
  })

  it("принимает JSON в markdown-блоке или после короткого вступления", async () => {
    const fenced = `Результат анализа:\n\n\`\`\`json\n${JSON.stringify(validReport)}\n\`\`\``
    const fetcher = vi.fn(async () => responseWithText(fenced)) as unknown as typeof fetch

    await expect(analyzeMarket(facts, { apiKey: "test", fetcher })).resolves.toMatchObject({
      summary: validReport.summary,
    })
  })

  it("повторяет запрос один раз при неверной структуре", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(responseWith({ summary: "неполный ответ" }))
      .mockResolvedValueOnce(responseWith(validReport)) as unknown as typeof fetch

    await expect(analyzeMarket(facts, { apiKey: "test", fetcher })).resolves.toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("повторяет HTTP 429 и сообщает результат каждой попытки", async () => {
    const attempts: Array<{ attempt: number; outcome: string; diagnostic?: string }> = []
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(responseWith(validReport)) as unknown as typeof fetch

    await expect(analyzeMarket(facts, {
      apiKey: "test",
      fetcher,
      sleep: async () => undefined,
      onAttempt: (event) => attempts.push(event),
    })).resolves.toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(attempts).toMatchObject([
      { attempt: 1, outcome: "retry", diagnostic: "http_429" },
      { attempt: 2, outcome: "success" },
    ])
  })

  it("не повторяет ошибку авторизации", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch

    await expect(analyzeMarket(facts, { apiKey: "test", fetcher })).rejects.toMatchObject({ code: "authorization" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("ограничивает зависшую попытку таймаутом и делает не более двух попыток", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "TimeoutError")), { once: true })
      })) as unknown as typeof fetch

    await expect(analyzeMarket(facts, {
      apiKey: "test",
      fetcher,
      timeoutMs: 5,
      retryDelayMs: 0,
    })).rejects.toMatchObject({ code: "timeout" })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
