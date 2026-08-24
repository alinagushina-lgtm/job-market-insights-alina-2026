import { z } from "zod"

const shortText = z.string().trim().min(1).max(500)

export const marketReportSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  sampleNotice: z.string().trim().min(1).max(500),
  frequentSkills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        count: z.number().int().min(1).max(20),
      }),
    )
    .max(10),
  rareSkills: z.array(z.string().trim().min(1).max(80)).max(10),
  typicalRequirements: z.array(shortText).max(8),
  strengths: z.array(shortText).max(8),
  gaps: z.array(shortText).max(8),
  roadmap: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        why: z.string().trim().min(1).max(500),
        priority: z.number().int().min(1).max(5),
      }),
    )
    .min(3)
    .max(5),
  matchScores: z
    .array(
      z.object({
        jobId: z.string().trim().min(1).max(200),
        score: z.number().int().min(0).max(100),
        reason: z.string().trim().min(1).max(400),
      }),
    )
    .max(20),
})

export type MarketReport = z.infer<typeof marketReportSchema>

export const MARKET_REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "Краткий вывод только по переданной выборке вакансий." },
    sampleNotice: { type: "string", description: "Предупреждение, что выводы относятся к ограниченной выборке." },
    frequentSkills: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 20 } },
        required: ["name", "count"],
      },
    },
    rareSkills: { type: "array", maxItems: 10, items: { type: "string" } },
    typicalRequirements: { type: "array", maxItems: 8, items: { type: "string" } },
    strengths: { type: "array", maxItems: 8, items: { type: "string" } },
    gaps: { type: "array", maxItems: 8, items: { type: "string" } },
    roadmap: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          priority: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["title", "why", "priority"],
      },
    },
    matchScores: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          jobId: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
        },
        required: ["jobId", "score", "reason"],
      },
    },
  },
  required: [
    "summary",
    "sampleNotice",
    "frequentSkills",
    "rareSkills",
    "typicalRequirements",
    "strengths",
    "gaps",
    "roadmap",
    "matchScores",
  ],
} as const
