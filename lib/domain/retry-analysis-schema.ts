import { z } from "zod"

const countedSkillSchema = z.object({
  name: z.string().trim().min(1).max(80),
  count: z.number().int().min(1).max(20),
})

export const analysisFactsSchema = z.object({
  sample: z.object({
    jobCount: z.number().int().min(1).max(20),
    searchedTitle: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(20),
    city: z.string().trim().max(80).nullable(),
  }),
  skills: z.object({
    frequent: z.array(countedSkillSchema).max(10),
    rare: z.array(countedSkillSchema).max(10),
  }),
  salary: z.object({
    currency: z.string().trim().min(1).max(12),
    comparableValueCount: z.number().int().min(0).max(40),
    min: z.number().nonnegative().nullable(),
    max: z.number().nonnegative().nullable(),
  }),
  profile: z.object({
    level: z.enum(["junior", "middle", "senior", "lead"]),
    yearsExperience: z.number().min(0).max(60),
    skills: z.array(z.string().trim().min(1).max(40)).min(1).max(25),
  }),
  jobs: z.array(z.object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    level: z.enum(["junior", "middle", "senior", "lead", "unknown"]),
    workMode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
    skills: z.array(z.string().trim().min(1).max(80)).max(30),
    description: z.string().max(700),
    salaryGroup: z.enum(["matching", "unknown", "incomparable", "below"]),
  })).min(1).max(8),
})

export const retryAnalysisRequestSchema = z.object({
  facts: analysisFactsSchema,
  turnstileToken: z.string().trim().min(1).max(2048),
})
