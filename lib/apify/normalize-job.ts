import type {
  NormalizedJob,
  NormalizedJobLevel,
  NormalizedSalary,
  NormalizedWorkMode,
  SalaryPeriod,
} from "@/lib/domain/job"
import { SALARY_CURRENCIES, type SalaryCurrency } from "@/lib/domain/search-schema"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(stringValue).filter((item): item is string => Boolean(item))
  }
  const single = stringValue(value)
  return single ? [single] : []
}

function validUrl(value: unknown) {
  const candidate = stringValue(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function normalizeDate(value: unknown) {
  const candidate = stringValue(value)
  if (!candidate) return undefined
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function normalizeWorkMode(raw: UnknownRecord): NormalizedWorkMode {
  const ai = stringValue(raw.ai_work_arrangement)?.toLowerCase()
  if (ai?.includes("remote")) return "remote"
  if (ai === "hybrid") return "hybrid"
  if (ai === "on-site" || ai === "onsite") return "onsite"
  if (raw.remote_derived === true || stringValue(raw.location_type)?.toUpperCase() === "TELECOMMUTE") return "remote"
  return "unknown"
}

function normalizeLevel(value: unknown): NormalizedJobLevel {
  const level = stringValue(value)?.toLowerCase()
  if (level === "0-2" || level?.includes("junior")) return "junior"
  if (level === "2-5" || level?.includes("middle") || level?.includes("mid")) return "middle"
  if (level === "5-10" || level?.includes("senior")) return "senior"
  if (level === "10+" || level?.includes("lead")) return "lead"
  return "unknown"
}

function normalizePeriod(value: unknown): SalaryPeriod {
  const period = stringValue(value)?.toUpperCase()
  if (period === "HOUR") return "hour"
  if (period === "MONTH") return "month"
  if (period === "YEAR") return "year"
  return "unknown"
}

function normalizeCurrency(value: unknown): SalaryCurrency | undefined {
  const currency = stringValue(value)?.toUpperCase()
  return SALARY_CURRENCIES.includes(currency as SalaryCurrency) ? (currency as SalaryCurrency) : undefined
}

function normalizeSalary(raw: UnknownRecord): NormalizedSalary | undefined {
  const single = numberValue(raw.ai_salary_value)
  const min = numberValue(raw.ai_salary_min_value) ?? single
  const max = numberValue(raw.ai_salary_max_value) ?? single
  const currency = normalizeCurrency(raw.ai_salary_currency)
  const period = normalizePeriod(raw.ai_salary_unit_text)
  const sourceSalary = raw.salary
  const rawSalary = typeof sourceSalary === "string" ? sourceSalary : sourceSalary ? JSON.stringify(sourceSalary) : undefined

  if (min === undefined && max === undefined && !rawSalary) return undefined

  return { min, max, currency, period, raw: rawSalary?.slice(0, 300) }
}

function derivedLocations(raw: UnknownRecord) {
  const locations = Array.isArray(raw.locations_derived) ? raw.locations_derived : []
  const objects = locations.map(record).filter((item): item is UnknownRecord => Boolean(item))
  const cities = Array.from(
    new Set([...stringArray(raw.cities_derived), ...objects.map((item) => stringValue(item.city)).filter(Boolean)]),
  ) as string[]
  const countries = Array.from(
    new Set([...stringArray(raw.countries_derived), ...objects.map((item) => stringValue(item.country)).filter(Boolean)]),
  ) as string[]
  const regions = Array.from(new Set(objects.map((item) => stringValue(item.admin)).filter(Boolean))) as string[]
  const locationLabel =
    Array.from(new Set([...cities, ...regions, ...countries].filter(Boolean))).join(", ") || "Локация не указана"
  return { cities, countries, locationLabel }
}

export function normalizeApifyJob(value: unknown): NormalizedJob | null {
  const raw = record(value)
  if (!raw) return null

  const idValue = raw.id
  const id = typeof idValue === "number" || typeof idValue === "string" ? String(idValue) : undefined
  const title = stringValue(raw.title)
  const company = stringValue(raw.organization)
  const sourceUrl = validUrl(raw.url)
  if (!id || !title || !company || !sourceUrl) return null

  const { cities, countries, locationLabel } = derivedLocations(raw)
  const description = stringValue(raw.description_text) ?? stringValue(raw.ai_requirements_summary) ?? ""
  const skills = Array.from(new Set(stringArray(raw.ai_key_skills).map((skill) => skill.trim()).filter(Boolean))).slice(0, 30)
  const employmentType = stringArray(raw.ai_employment_type).length
    ? stringArray(raw.ai_employment_type)
    : stringArray(raw.employment_type)

  return {
    id,
    title,
    company,
    sourceUrl,
    postedAt: normalizeDate(raw.date_posted),
    city: cities,
    country: countries,
    locationLabel,
    workMode: normalizeWorkMode(raw),
    level: normalizeLevel(raw.ai_experience_level),
    employmentType,
    salary: normalizeSalary(raw),
    skills,
    descriptionText: description.replace(/\s+/g, " ").trim().slice(0, 6000),
  }
}

export function normalizeApifyJobs(values: unknown[]) {
  const jobs = values.map(normalizeApifyJob).filter((job): job is NormalizedJob => Boolean(job))
  return Array.from(new Map(jobs.map((job) => [job.id, job])).values()).slice(0, 20)
}
