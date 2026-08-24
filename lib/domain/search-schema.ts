import { z } from "zod"

import {
  COUNTRIES,
  SALARY_CURRENCIES,
  countryByCode,
  isCountryCode,
  type CountryCode,
} from "@/lib/domain/countries"

export { COUNTRIES, SALARY_CURRENCIES, countryByCode }

export const JOB_LEVELS = ["any", "junior", "middle", "senior", "lead"] as const
export const PROFILE_LEVELS = ["junior", "middle", "senior", "lead"] as const
export const WORK_MODES = ["any", "remote", "hybrid", "onsite"] as const

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const searchRequestSchema = z.object({
  search: z.object({
    title: z.string().trim().min(2, "Укажите профессию").max(80),
    alternateTitle: optionalTrimmedString(80),
    country: z
      .string()
      .refine(isCountryCode, "Выберите страну из списка")
      .transform((value) => value as CountryCode),
    city: optionalTrimmedString(80),
    workMode: z.enum(WORK_MODES),
    level: z.enum(JOB_LEVELS),
    minSalary: z.number().int().positive().max(1_000_000_000).optional(),
    salaryCurrency: z.string().refine((value) => SALARY_CURRENCIES.includes(value), "Выберите валюту из списка"),
  }),
  profile: z.object({
    level: z.enum(PROFILE_LEVELS),
    yearsExperience: z.number().min(0).max(60),
    skills: z
      .array(z.string().trim().min(1).max(40))
      .min(1, "Добавьте хотя бы один навык")
      .max(25)
      .transform((skills) => Array.from(new Set(skills.map((skill) => skill.toLowerCase())))),
  }),
  turnstileToken: z.string().trim().min(1).max(2048),
})

export type SearchRequest = z.infer<typeof searchRequestSchema>
export type JobSearch = SearchRequest["search"]
export type UserProfile = SearchRequest["profile"]
export type WorkMode = (typeof WORK_MODES)[number]
export type JobLevel = (typeof JOB_LEVELS)[number]
export type ProfileLevel = (typeof PROFILE_LEVELS)[number]
export type SalaryCurrency = string
