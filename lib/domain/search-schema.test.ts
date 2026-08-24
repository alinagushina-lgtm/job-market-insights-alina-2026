import { describe, expect, it } from "vitest"

import { searchRequestSchema } from "@/lib/domain/search-schema"

const validRequest = {
  search: {
    title: "Frontend-разработчик",
    alternateTitle: "Frontend Developer",
    country: "RU",
    city: "Москва",
    workMode: "remote",
    level: "middle",
    minSalary: 250000,
    salaryCurrency: "RUB",
  },
  profile: {
    level: "middle",
    yearsExperience: 3,
    skills: ["React", "TypeScript", "react"],
  },
  turnstileToken: "test-token",
}

describe("searchRequestSchema", () => {
  it("нормализует навыки и пустой необязательный синоним", () => {
    const parsed = searchRequestSchema.parse({
      ...validRequest,
      search: { ...validRequest.search, alternateTitle: "   " },
    })

    expect(parsed.search.alternateTitle).toBeUndefined()
    expect(parsed.profile.skills).toEqual(["react", "typescript"])
  })

  it("отклоняет пустую профессию", () => {
    expect(() =>
      searchRequestSchema.parse({
        ...validRequest,
        search: { ...validRequest.search, title: " " },
      }),
    ).toThrow()
  })

  it("ограничивает количество навыков", () => {
    expect(() =>
      searchRequestSchema.parse({
        ...validRequest,
        profile: {
          ...validRequest.profile,
          skills: Array.from({ length: 26 }, (_, index) => `навык-${index}`),
        },
      }),
    ).toThrow()
  })

  it("отклоняет неизвестную страну", () => {
    expect(() =>
      searchRequestSchema.parse({
        ...validRequest,
        search: { ...validRequest.search, country: "ZZ" },
      }),
    ).toThrow()
  })

  it("принимает поиск по всему миру и глобальную валюту", () => {
    const parsed = searchRequestSchema.parse({
      ...validRequest,
      search: { ...validRequest.search, country: "WORLD", city: undefined, salaryCurrency: "USD" },
    })

    expect(parsed.search.country).toBe("WORLD")
  })
})
