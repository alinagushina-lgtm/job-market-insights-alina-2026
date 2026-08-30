import { describe, expect, it } from "vitest"

import { retryAnalysisRequestSchema } from "@/lib/domain/retry-analysis-schema"

const facts = {
  sample: { jobCount: 1, searchedTitle: "Developer", country: "WORLD", city: null },
  skills: { frequent: [], rare: [] },
  salary: { currency: "USD", comparableValueCount: 0, min: null, max: null },
  profile: { level: "middle", yearsExperience: 3, skills: ["typescript"] },
  jobs: [{
    id: "job-1",
    title: "Developer",
    company: "Example",
    level: "middle",
    workMode: "remote",
    skills: ["TypeScript"],
    description: "Build software",
    salaryGroup: "unknown",
  }],
}

describe("retryAnalysisRequestSchema", () => {
  it("требует UUID оплаченного запуска", () => {
    expect(retryAnalysisRequestSchema.safeParse({ analysisRunId: "not-a-uuid", facts, turnstileToken: "token" }).success).toBe(false)
    expect(retryAnalysisRequestSchema.safeParse({
      analysisRunId: "11111111-1111-4111-8111-111111111111",
      facts,
      turnstileToken: "token",
    }).success).toBe(true)
  })
})
