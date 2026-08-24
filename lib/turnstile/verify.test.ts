import { describe, expect, it, vi } from "vitest"

import { verifyTurnstile } from "@/lib/turnstile/verify"

describe("verifyTurnstile", () => {
  it("принимает подтверждённый токен", async () => {
    const fetcher = vi.fn(async () => Response.json({ success: true, hostname: "localhost" })) as typeof fetch
    await expect(verifyTurnstile("token", "secret", undefined, fetcher)).resolves.toEqual({
      success: true,
      hostname: "localhost",
      action: undefined,
    })
  })

  it("отклоняет повторный или истёкший токен", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    ) as typeof fetch
    await expect(verifyTurnstile("token", "secret", undefined, fetcher)).resolves.toEqual({
      success: false,
      code: "timeout-or-duplicate",
    })
  })

  it("разрешает официальный локальный тестовый ключ только в development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const fetcher = vi.fn()
    await expect(
      verifyTurnstile(
        "local-development-turnstile-token",
        "1x0000000000000000000000000000000AA",
        undefined,
        fetcher as unknown as typeof fetch,
      ),
    ).resolves.toMatchObject({ success: true, action: "development-test" })
    expect(fetcher).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
