import type { JobWithSalaryGroup, NormalizedJob, SalaryGroup } from "@/lib/domain/job"
import type { JobSearch } from "@/lib/domain/search-schema"

export function classifySalary(job: NormalizedJob, search: JobSearch): SalaryGroup {
  if (search.minSalary === undefined) return "matching"
  const salary = job.salary
  if (!salary || (salary.min === undefined && salary.max === undefined)) return "unknown"
  if (salary.currency !== search.salaryCurrency || salary.period !== "month") return "incomparable"

  const highestKnown = salary.max ?? salary.min
  return highestKnown !== undefined && highestKnown >= search.minSalary ? "matching" : "below"
}

export function groupJobsBySalary(jobs: NormalizedJob[], search: JobSearch): JobWithSalaryGroup[] {
  const order: Record<SalaryGroup, number> = { matching: 0, unknown: 1, incomparable: 2, below: 3 }
  return jobs
    .map((job) => ({ ...job, salaryGroup: classifySalary(job, search) }))
    .sort((left, right) => order[left.salaryGroup] - order[right.salaryGroup])
}
