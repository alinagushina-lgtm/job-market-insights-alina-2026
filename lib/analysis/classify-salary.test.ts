import { describe, expect, it } from "vitest"

import { classifySalary } from "@/lib/analysis/classify-salary"
import type { NormalizedJob } from "@/lib/domain/job"
import type { JobSearch } from "@/lib/domain/search-schema"

const search: JobSearch = {
  title: "Бухгалтер",
  country: "KZ",
  workMode: "any",
  level: "any",
  minSalary: 400000,
  salaryCurrency: "KZT",
}

const job: NormalizedJob = {
  id: "1",
  title: "Бухгалтер",
  company: "Компания",
  sourceUrl: "https://example.com/1",
  city: ["Almaty"],
  country: ["Kazakhstan"],
  locationLabel: "Almaty, Kazakhstan",
  workMode: "onsite",
  level: "middle",
  employmentType: ["FULL_TIME"],
  skills: ["1C"],
  descriptionText: "",
}

describe("classifySalary", () => {
  it("разделяет подходящие, неизвестные, несопоставимые и низкие зарплаты", () => {
    expect(classifySalary({ ...job, salary: { min: 450000, currency: "KZT", period: "month" } }, search)).toBe("matching")
    expect(classifySalary(job, search)).toBe("unknown")
    expect(classifySalary({ ...job, salary: { min: 500000, currency: "RUB", period: "month" } }, search)).toBe("incomparable")
    expect(classifySalary({ ...job, salary: { max: 350000, currency: "KZT", period: "month" } }, search)).toBe("below")
  })
})
