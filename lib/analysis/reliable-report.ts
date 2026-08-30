import { buildAnalysisFacts, type AnalysisFacts } from "@/lib/analysis/build-facts"
import type { JobWithSalaryGroup, NormalizedJobLevel } from "@/lib/domain/job"
import type { MarketReport } from "@/lib/domain/report"
import type { JobSearch, UserProfile } from "@/lib/domain/search-schema"

export const MAX_AI_JOBS = 8
const MAX_AI_DESCRIPTION_CHARS = 700

const LEVEL_ORDER: Record<NormalizedJobLevel | UserProfile["level"], number> = {
  unknown: 0,
  junior: 1,
  middle: 2,
  senior: 3,
  lead: 4,
}

function normalizedSkillSet(skills: string[]) {
  return new Set(skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean))
}

function levelCompatibility(jobLevel: NormalizedJobLevel, profileLevel: UserProfile["level"]) {
  if (jobLevel === "unknown") return 2
  const distance = Math.abs(LEVEL_ORDER[jobLevel] - LEVEL_ORDER[profileLevel])
  return distance === 0 ? 8 : distance === 1 ? 4 : 0
}

function selectionScore(job: JobWithSalaryGroup, search: JobSearch, profile: UserProfile) {
  const profileSkills = normalizedSkillSet(profile.skills)
  const overlap = normalizedSkillSet(job.skills)
  let score = Array.from(overlap).filter((skill) => profileSkills.has(skill)).length * 12
  score += levelCompatibility(job.level, profile.level)
  if (search.level !== "any" && job.level === search.level) score += 5
  if (search.workMode !== "any" && job.workMode === search.workMode) score += 4
  if (job.salaryGroup === "matching") score += 3
  return score
}

export function selectJobsForAi(
  jobs: JobWithSalaryGroup[],
  search: JobSearch,
  profile: UserProfile,
  limit = MAX_AI_JOBS,
) {
  return jobs
    .map((job, index) => ({ job, index, score: selectionScore(job, search, profile) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.job)
}

export function buildAiFacts(jobs: JobWithSalaryGroup[], search: JobSearch, profile: UserProfile): AnalysisFacts {
  const allFacts = buildAnalysisFacts(jobs, search, profile)
  const selectedIds = new Set(selectJobsForAi(jobs, search, profile).map((job) => job.id))

  return {
    ...allFacts,
    jobs: allFacts.jobs
      .filter((job) => selectedIds.has(job.id))
      .map((job) => ({ ...job, description: job.description.slice(0, MAX_AI_DESCRIPTION_CHARS) })),
  }
}

function fallbackMatchScore(job: AnalysisFacts["jobs"][number], profile: UserProfile) {
  const profileSkills = normalizedSkillSet(profile.skills)
  const matchingSkills = job.skills.filter((skill) => profileSkills.has(skill.trim().toLowerCase()))
  const uniqueMatches = Array.from(new Set(matchingSkills))
  const skillShare = job.skills.length ? uniqueMatches.length / new Set(job.skills.map((skill) => skill.toLowerCase())).size : 0
  const levelPoints = levelCompatibility(job.level, profile.level) * 2.5
  const salaryPoints = job.salaryGroup === "matching" ? 10 : job.salaryGroup === "unknown" ? 4 : 0
  const score = Math.max(0, Math.min(100, Math.round(15 + skillShare * 55 + levelPoints + salaryPoints)))
  const reason = uniqueMatches.length
    ? `Совпадают навыки: ${uniqueMatches.slice(0, 4).join(", ")}.`
    : "Точных совпадений с указанными навыками в структурированных данных нет."
  return { jobId: job.id, score, reason }
}

export function buildFallbackReport(facts: AnalysisFacts): MarketReport {
  const profileSkills = normalizedSkillSet(facts.profile.skills)
  const commonProfileSkills = facts.skills.frequent.filter((skill) => profileSkills.has(skill.name.toLowerCase()))
  const gaps = facts.skills.frequent.filter((skill) => !profileSkills.has(skill.name.toLowerCase()))
  const salaryText = facts.salary.comparableValueCount
    ? ` Сопоставимая вилка в ${facts.salary.currency}: ${facts.salary.min?.toLocaleString("ru-RU")}–${facts.salary.max?.toLocaleString("ru-RU")}.`
    : " Сопоставимых зарплатных вилок в выбранной валюте недостаточно."
  const primaryGap = gaps[0]?.name
  const primarySkill = facts.skills.frequent[0]?.name

  return {
    summary: `В выборке ${facts.sample.jobCount} вакансий. ${facts.skills.frequent.length ? `Чаще всего встречается навык «${facts.skills.frequent[0].name}».` : "Структурированные навыки указаны не во всех вакансиях."}${salaryText}`,
    sampleNotice: "Резервный отчет рассчитан автоматически по найденной выборке без генеративной модели; выводы не описывают весь рынок.",
    frequentSkills: facts.skills.frequent,
    rareSkills: facts.skills.rare.map((skill) => skill.name),
    typicalRequirements: facts.skills.frequent.slice(0, 6).map(
      (skill) => `Навык «${skill.name}» указан в ${skill.count} из ${facts.sample.jobCount} вакансий.`,
    ),
    strengths: commonProfileSkills.slice(0, 6).map(
      (skill) => `Указанный вами навык «${skill.name}» встречается в ${skill.count} вакансиях выборки.`,
    ),
    gaps: gaps.slice(0, 6).map(
      (skill) => `Навык «${skill.name}» встречается в ${skill.count} вакансиях, но не указан в вашем профиле.`,
    ),
    roadmap: [
      {
        title: primaryGap ? `Проверить уровень по навыку «${primaryGap}»` : `Закрепить навык «${primarySkill ?? facts.sample.searchedTitle}»`,
        why: primaryGap
          ? "Это самый частый навык выборки, которого нет в указанном профиле."
          : "Это один из наиболее заметных сигналов в найденной выборке.",
        priority: 1,
      },
      {
        title: "Адаптировать резюме под частые требования",
        why: "Используйте только подтвержденный опыт и формулировки из подходящих вакансий.",
        priority: 2,
      },
      {
        title: "Подготовить примеры выполненных задач",
        why: "Для каждого совпадающего навыка сформулируйте короткий пример с результатом.",
        priority: 3,
      },
    ],
    matchScores: facts.jobs.map((job) => fallbackMatchScore(job, facts.profile)),
  }
}
