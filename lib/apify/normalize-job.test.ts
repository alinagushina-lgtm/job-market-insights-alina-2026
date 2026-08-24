import { describe, expect, it } from "vitest"

import { normalizeApifyJob, normalizeApifyJobs } from "@/lib/apify/normalize-job"

const rawJob = {
  id: 123,
  title: "Accountant",
  organization: "Example Ltd",
  url: "https://example.com/jobs/123",
  date_posted: "2026-08-20T10:00:00Z",
  locations_derived: [{ city: "Almaty", admin: "Almaty", country: "Kazakhstan" }],
  ai_work_arrangement: "Hybrid",
  ai_experience_level: "2-5",
  ai_salary_min_value: 400000,
  ai_salary_max_value: 550000,
  ai_salary_currency: "KZT",
  ai_salary_unit_text: "MONTH",
  ai_key_skills: ["1C", "IFRS"],
  ai_employment_type: ["FULL_TIME"],
  description_text: "Financial reporting and tax accounting.",
}

describe("normalizeApifyJob", () => {
  it("преобразует документированную структуру Actor", () => {
    expect(normalizeApifyJob(rawJob)).toMatchObject({
      id: "123",
      title: "Accountant",
      company: "Example Ltd",
      locationLabel: "Almaty, Kazakhstan",
      workMode: "hybrid",
      level: "middle",
      salary: { min: 400000, max: 550000, currency: "KZT", period: "month" },
      skills: ["1C", "IFRS"],
    })
  })

  it("отбрасывает запись без исходной ссылки и дубликаты", () => {
    expect(normalizeApifyJob({ ...rawJob, url: "javascript:alert(1)" })).toBeNull()
    expect(normalizeApifyJobs([rawJob, rawJob])).toHaveLength(1)
  })
})
