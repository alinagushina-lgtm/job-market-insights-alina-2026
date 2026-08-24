import { describe, expect, it } from "vitest"

import { COUNTRIES, SALARY_CURRENCIES, countryByCode, countryByInput } from "@/lib/domain/countries"

describe("countries", () => {
  it("начинается со всего мира и популярных стран без повторов", () => {
    expect(COUNTRIES.slice(0, 11).map((country) => country.code)).toEqual([
      "WORLD", "RU", "US", "GB", "DE", "FR", "ES", "AE", "CA", "NL", "KZ",
    ])
    expect(new Set(COUNTRIES.map((country) => country.code)).size).toBe(COUNTRIES.length)
  })

  it("содержит глобальный поиск и полноценные данные стран", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(196)
    expect(countryByCode("WORLD").currency).toBe("USD")
    expect(countryByCode("BG").currency).toBe("EUR")
    expect(countryByCode("ZW").currency).toBe("ZWG")
    expect(COUNTRIES.every((country) => country.name && country.englishName && country.currency)).toBe(true)
    expect(SALARY_CURRENCIES).toContain("EUR")
  })

  it("находит страну по русскому и английскому названию", () => {
    expect(countryByInput("Германия")?.code).toBe("DE")
    expect(countryByInput("United States")?.code).toBe("US")
  })
})
