// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { findCachedResult, registerAnalysisAttempt, requestCacheKey, saveResult } from "@/lib/client/history"

describe("client history", () => {
  beforeEach(() => localStorage.clear())

  it("ограничивает число новых анализов пятью за 24 часа", () => {
    for (let index = 0; index < 5; index += 1) expect(registerAnalysisAttempt(localStorage, index + 1)).toBe(true)
    expect(registerAnalysisAttempt(localStorage, 6)).toBe(false)
  })

  it("хранит результат шесть часов", () => {
    const key = requestCacheKey({
      search: {
        title: "Accountant",
        country: "WORLD",
        workMode: "any",
        level: "any",
        salaryCurrency: "USD",
      },
      profile: { level: "middle", yearsExperience: 3, skills: ["1c"] },
    })
    saveResult(localStorage, { key, createdAt: 100, jobs: [] }, 100)
    expect(findCachedResult(localStorage, key, 101)?.key).toBe(key)
    expect(findCachedResult(localStorage, key, 100 + 6 * 60 * 60 * 1000 + 1)).toBeUndefined()
  })
})
