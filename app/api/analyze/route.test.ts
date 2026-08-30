import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchJobs: vi.fn(),
  analyzeMarket: vi.fn(),
  verifyTurnstile: vi.fn(),
}))

vi.mock("@/lib/jobs/search", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/jobs/search")>(),
  searchJobs: mocks.searchJobs,
}))
vi.mock("@/lib/openrouter/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/openrouter/client")>(),
  analyzeMarket: mocks.analyzeMarket,
}))
vi.mock("@/lib/turnstile/verify", () => ({ verifyTurnstile: mocks.verifyTurnstile }))

import { POST } from "@/app/api/analyze/route"
import { buildAnalysisFacts } from "@/lib/analysis/build-facts"
import { buildFallbackReport } from "@/lib/analysis/reliable-report"
import type { NormalizedJob } from "@/lib/domain/job"
import type { StreamEvent } from "@/lib/domain/stream-event"
import { OpenRouterAnalysisError } from "@/lib/openrouter/client"

const search = {
  title: "Software Developer",
  country: "WORLD" as const,
  workMode: "any" as const,
  level: "any" as const,
  salaryCurrency: "USD",
}
const profile = { level: "middle" as const, yearsExperience: 3, skills: ["typescript"] }
const job: NormalizedJob = {
  id: "job-1",
  title: "Software Developer",
  company: "Example",
  sourceUrl: "https://example.com/job-1",
  city: [],
  country: ["US"],
  locationLabel: "United States",
  workMode: "remote",
  level: "middle",
  employmentType: ["full-time"],
  skills: ["TypeScript", "React"],
  descriptionText: "Build a web application",
}

function request() {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search, profile, turnstileToken: "test-token" }),
  })
}

async function events(response: Response) {
  return (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as StreamEvent)
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    mocks.verifyTurnstile.mockResolvedValue({ success: true })
    mocks.searchJobs.mockResolvedValue([job])
  })

  it("отдает резервный отчет до успешного AI-отчета", async () => {
    const fallback = buildFallbackReport(buildAnalysisFacts([{ ...job, salaryGroup: "unknown" }], search, profile))
    mocks.analyzeMarket.mockResolvedValue({ ...fallback, summary: "AI-отчет готов" })

    const result = await events(await POST(request()))
    const reports = result.filter((event) => event.type === "analysis")

    expect(reports.map((event) => event.mode)).toEqual(["fallback", "ai"])
    expect(reports[0]).toMatchObject({ report: { summary: expect.stringContaining("В выборке 1") } })
    expect(reports[1]).toMatchObject({ report: { summary: "AI-отчет готов" } })
    expect(result.at(-1)).toEqual({ type: "complete" })
  })

  it("сохраняет резервный отчет и завершает поток при сбое OpenRouter", async () => {
    mocks.analyzeMarket.mockRejectedValue(
      new OpenRouterAnalysisError("Сервис анализа временно недоступен", "upstream", "http_503", true),
    )

    const result = await events(await POST(request()))
    const reports = result.filter((event) => event.type === "analysis")

    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ mode: "fallback" })
    expect(result).toContainEqual(expect.objectContaining({ type: "warning", code: "ai_fallback" }))
    expect(result.at(-1)).toEqual({ type: "complete" })
  })
})
