// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { findCachedResult, requestCacheKey, saveResult } from "@/lib/client/history"

describe("client history", () => {
  beforeEach(() => localStorage.clear())

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
    saveResult(localStorage, { key, createdAt: 100, jobs: [], analysisRunId: "run-1" }, 100)
    expect(findCachedResult(localStorage, key, 101)?.key).toBe(key)
    expect(findCachedResult(localStorage, key, 101)?.analysisRunId).toBe("run-1")
    expect(findCachedResult(localStorage, key, 100 + 6 * 60 * 60 * 1000 + 1)).toBeUndefined()
  })

  it("отбрасывает старый формат v4", () => {
    localStorage.setItem("job-market-insights:v5", JSON.stringify({ version: 4, attempts: [], results: [{ key: "old" }] }))
    expect(findCachedResult(localStorage, "old", 100)).toBeUndefined()
  })

  it("хранит максимум пять результатов, не ограничивая новые запросы", () => {
    for (let index = 0; index < 7; index += 1) {
      saveResult(localStorage, { key: `key-${index}`, createdAt: 100 + index, jobs: [] }, 100 + index)
    }

    expect(findCachedResult(localStorage, "key-6", 200)).toBeDefined()
    expect(findCachedResult(localStorage, "key-0", 200)).toBeUndefined()
  })
})
