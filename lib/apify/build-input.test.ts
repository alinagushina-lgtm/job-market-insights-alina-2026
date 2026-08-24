import { describe, expect, it } from "vitest"

import { buildApifyInput, transliterateCity } from "@/lib/apify/build-input"

describe("buildApifyInput", () => {
  it("создаёт точные названия и официальные фильтры Actor", () => {
    const input = buildApifyInput({
      title: "Бухгалтер",
      alternateTitle: "Accountant",
      country: "KZ",
      city: "Алматы",
      workMode: "remote",
      level: "middle",
      minSalary: 400000,
      salaryCurrency: "KZT",
    })

    expect(input).toMatchObject({
      timeRange: "7d",
      limit: 20,
      titleSearch: ["Accountant"],
      locationSearch: ["Almaty, Kazakhstan"],
      aiWorkArrangementFilter: ["Remote OK", "Remote Solely"],
      aiExperienceLevelFilter: ["2-5"],
      hasSalary: false,
    })
  })

  it("транслитерирует неизвестный город без LLM", () => {
    expect(transliterateCity("Краснодар")).toBe("Krasnodar")
  })

  it("не ограничивает географию при поиске по всему миру", () => {
    const input = buildApifyInput({
      title: "Юрист",
      country: "WORLD",
      workMode: "any",
      level: "any",
      salaryCurrency: "USD",
    })

    expect(input.titleSearch).toEqual(["Lawyer"])
    expect(input).not.toHaveProperty("locationSearch")
  })

  it("оставляет произвольное английское название без изменения", () => {
    const input = buildApifyInput({
      title: "Marine Biologist",
      country: "AU",
      workMode: "any",
      level: "any",
      salaryCurrency: "AUD",
    })

    expect(input.titleSearch).toEqual(["Marine Biologist"])
    expect(input.locationSearch).toEqual(["Australia"])
  })
})
