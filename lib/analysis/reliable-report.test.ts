import { describe, expect, it } from "vitest"

import { buildAnalysisFacts } from "@/lib/analysis/build-facts"
import { buildAiFacts, buildFallbackReport, selectJobsForAi } from "@/lib/analysis/reliable-report"
import type { JobWithSalaryGroup } from "@/lib/domain/job"
import { marketReportSchema } from "@/lib/domain/report"
import type { JobSearch, UserProfile } from "@/lib/domain/search-schema"

const search: JobSearch = {
  title: "Software Developer",
  country: "WORLD",
  workMode: "any",
  level: "any",
  salaryCurrency: "USD",
}
const profile: UserProfile = { level: "middle", yearsExperience: 3, skills: ["typescript", "react"] }

function job(index: number, overrides: Partial<JobWithSalaryGroup> = {}): JobWithSalaryGroup {
  return {
    id: `job-${index}`,
    title: `Developer ${index}`,
    company: "Example",
    sourceUrl: `https://example.com/${index}`,
    city: [],
    country: ["US"],
    locationLabel: "United States",
    workMode: "remote",
    level: "middle",
    employmentType: ["full-time"],
    skills: index % 2 ? ["TypeScript", "React"] : ["Python"],
    descriptionText: "x".repeat(1800),
    salaryGroup: "unknown",
    ...overrides,
  }
}

describe("reliable analysis", () => {
  it.each([1, 8, 20])("строит валидный резервный отчет для %i вакансий", (count) => {
    const jobs = Array.from({ length: count }, (_, index) => job(index + 1))
    const facts = buildAnalysisFacts(jobs, search, profile)
    const report = buildFallbackReport(facts)

    expect(() => marketReportSchema.parse(report)).not.toThrow()
    expect(report.summary).toContain(`${count}`)
    expect(report.roadmap).toHaveLength(3)
    expect(report.matchScores).toHaveLength(count)
    expect(report.frequentSkills[0]?.count).toBeLessThanOrEqual(count)
  })

  it("передает модели не более 8 вакансий и сокращает описания", () => {
    const jobs = Array.from({ length: 20 }, (_, index) => job(index + 1))
    const facts = buildAiFacts(jobs, search, profile)

    expect(facts.sample.jobCount).toBe(20)
    expect(facts.jobs).toHaveLength(8)
    expect(facts.jobs.every((item) => item.description.length <= 700)).toBe(true)
  })

  it("выбирает более релевантные вакансии и сохраняет порядок при равенстве", () => {
    const jobs = [
      job(1, { skills: ["Python"], level: "senior" }),
      job(2, { skills: ["TypeScript", "React"], level: "middle" }),
      job(3, { skills: ["TypeScript", "React"], level: "middle" }),
    ]

    expect(selectJobsForAi(jobs, search, profile, 2).map((item) => item.id)).toEqual(["job-2", "job-3"])
  })
})
