import { describe, expect, it } from "vitest"

import { resolveJobTitle } from "@/lib/domain/job-titles"

describe("resolveJobTitle", () => {
  it("преобразует готовую русскую профессию в английский запрос", () => {
    expect(resolveJobTitle("Юрист")).toBe("Lawyer")
    expect(resolveJobTitle("  бухгалтер  ")).toBe("Accountant")
  })

  it("оставляет произвольное название без перевода", () => {
    expect(resolveJobTitle("Marine Biologist")).toBe("Marine Biologist")
    expect(resolveJobTitle("Архитектор")).toBe("Архитектор")
  })
})
