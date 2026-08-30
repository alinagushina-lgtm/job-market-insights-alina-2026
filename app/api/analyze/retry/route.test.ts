import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  claimAiRetry: vi.fn(),
  verifyTurnstile: vi.fn(),
  analyzeMarket: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAuthenticatedContext: mocks.getAuthenticatedContext }))
vi.mock("@/lib/credits/service", () => ({ claimAiRetry: mocks.claimAiRetry }))
vi.mock("@/lib/turnstile/verify", () => ({ verifyTurnstile: mocks.verifyTurnstile }))
vi.mock("@/lib/openrouter/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/openrouter/client")>(),
  analyzeMarket: mocks.analyzeMarket,
}))

import { POST } from "@/app/api/analyze/retry/route"

const analysisRunId = "11111111-1111-4111-8111-111111111111"
const facts = {
  sample: { jobCount: 1, searchedTitle: "Developer", country: "WORLD", city: null },
  skills: { frequent: [], rare: [] },
  salary: { currency: "USD", comparableValueCount: 0, min: null, max: null },
  profile: { level: "middle" as const, yearsExperience: 3, skills: ["typescript"] },
  jobs: [{
    id: "job-1",
    title: "Developer",
    company: "Example",
    level: "middle" as const,
    workMode: "remote" as const,
    skills: ["TypeScript"],
    description: "Build software",
    salaryGroup: "unknown" as const,
  }],
}

function request(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/analyze/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisRunId, facts, turnstileToken: "token", ...overrides }),
  })
}

describe("POST /api/analyze/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "info").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    mocks.getAuthenticatedContext.mockResolvedValue({ userId: "user-1", email: "student@example.com", supabase: {} })
    mocks.verifyTurnstile.mockResolvedValue({ success: true })
    mocks.claimAiRetry.mockResolvedValue("allowed")
    mocks.analyzeMarket.mockResolvedValue({ summary: "AI ready" })
  })

  it("отклоняет гостя до проверки формы и LLM", async () => {
    mocks.getAuthenticatedContext.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    expect(mocks.analyzeMarket).not.toHaveBeenCalled()
  })

  it("отклоняет неизвестный или использованный запуск", async () => {
    mocks.claimAiRetry.mockResolvedValue("used_or_foreign")

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(mocks.analyzeMarket).not.toHaveBeenCalled()
  })

  it("вызывает LLM один раз для разрешённого запуска", async () => {
    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ mode: "ai", report: { summary: "AI ready" } })
    expect(mocks.claimAiRetry).toHaveBeenCalledWith({}, analysisRunId)
    expect(mocks.analyzeMarket).toHaveBeenCalledTimes(1)
  })
})
