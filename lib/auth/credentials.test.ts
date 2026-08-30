import { describe, expect, it } from "vitest"

import { authErrorMessage, credentialsSchema } from "@/lib/auth/credentials"

describe("credentialsSchema", () => {
  it("принимает email и пароль от 6 символов", () => {
    expect(credentialsSchema.safeParse({ email: "student@example.com", password: "secret1" }).success).toBe(true)
  })

  it("отклоняет некорректный email", () => {
    const result = credentialsSchema.safeParse({ email: "student", password: "secret1" })
    expect(result.success).toBe(false)
  })

  it("отклоняет короткий пароль", () => {
    const result = credentialsSchema.safeParse({ email: "student@example.com", password: "12345" })
    expect(result.success).toBe(false)
  })
})

describe("authErrorMessage", () => {
  it("не раскрывает внутреннюю ошибку", () => {
    expect(authErrorMessage("unexpected_internal_code")).toBe("Сервис входа временно недоступен. Попробуйте ещё раз")
  })

  it("объясняет неверные данные и повторную регистрацию", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Неверный email или пароль")
    expect(authErrorMessage("user_already_exists")).toContain("уже зарегистрирован")
  })
})
