import type { JobWithSalaryGroup } from "@/lib/domain/job"
import type { JobSearch, UserProfile } from "@/lib/domain/search-schema"

export type AnalysisFacts = ReturnType<typeof buildAnalysisFacts>

export function buildAnalysisFacts(jobs: JobWithSalaryGroup[], search: JobSearch, profile: UserProfile) {
  const skillMap = new Map<string, { name: string; count: number }>()
  for (const job of jobs) {
    for (const skill of new Set(job.skills.map((item) => item.trim()).filter(Boolean))) {
      const key = skill.toLowerCase()
      const current = skillMap.get(key)
      skillMap.set(key, { name: current?.name ?? skill, count: (current?.count ?? 0) + 1 })
    }
  }

  const skills = Array.from(skillMap.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
  const comparableSalaries = jobs
    .filter((job) => job.salary?.currency === search.salaryCurrency && job.salary?.period === "month")
    .flatMap((job) => [job.salary?.min, job.salary?.max])
    .filter((value): value is number => value !== undefined)

  return {
    sample: {
      jobCount: jobs.length,
      searchedTitle: search.title,
      country: search.country,
      city: search.city ?? null,
    },
    skills: {
      frequent: skills.slice(0, 10),
      rare: skills.filter((skill) => skill.count === 1).slice(0, 10),
    },
    salary: {
      currency: search.salaryCurrency,
      comparableValueCount: comparableSalaries.length,
      min: comparableSalaries.length ? Math.min(...comparableSalaries) : null,
      max: comparableSalaries.length ? Math.max(...comparableSalaries) : null,
    },
    profile,
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      level: job.level,
      workMode: job.workMode,
      skills: job.skills,
      description: job.descriptionText.slice(0, 2500),
      salaryGroup: job.salaryGroup,
    })),
  }
}
