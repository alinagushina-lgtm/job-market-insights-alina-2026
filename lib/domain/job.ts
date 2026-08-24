import type { SalaryCurrency } from "@/lib/domain/search-schema"

export type NormalizedWorkMode = "remote" | "hybrid" | "onsite" | "unknown"
export type NormalizedJobLevel = "junior" | "middle" | "senior" | "lead" | "unknown"
export type SalaryPeriod = "hour" | "month" | "year" | "unknown"

export type NormalizedSalary = {
  min?: number
  max?: number
  currency?: SalaryCurrency
  period?: SalaryPeriod
  raw?: string
}

export type NormalizedJob = {
  id: string
  title: string
  company: string
  sourceUrl: string
  postedAt?: string
  city: string[]
  country: string[]
  locationLabel: string
  workMode: NormalizedWorkMode
  level: NormalizedJobLevel
  employmentType: string[]
  salary?: NormalizedSalary
  skills: string[]
  descriptionText: string
}

export type SalaryGroup = "matching" | "unknown" | "incomparable" | "below"

export type JobWithSalaryGroup = NormalizedJob & {
  salaryGroup: SalaryGroup
}
