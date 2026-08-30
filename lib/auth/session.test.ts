import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))

import { getAuthenticatedAccount, getAuthenticatedContext } from "@/lib/auth/session"

function supabaseClient({ claims, credits = 5 }: { claims: Record<string, unknown> | null; credits?: number }) {
  const single = vi.fn().mockResolvedValue({ data: { credits }, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })

  return {
    auth: { getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null, error: null }) },
    from: vi.fn().mockReturnValue({ select }),
  }
}

describe("authenticated session", () => {
  beforeEach(() => vi.clearAllMocks())

  it("не доверяет отсутствующим claims", async () => {
    mocks.createClient.mockResolvedValue(supabaseClient({ claims: null }))
    await expect(getAuthenticatedContext()).resolves.toBeNull()
  })

  it("возвращает только минимальный DTO аккаунта", async () => {
    mocks.createClient.mockResolvedValue(supabaseClient({
      claims: { sub: "user-1", email: "student@example.com", user_metadata: { admin: true } },
      credits: 4,
    }))

    await expect(getAuthenticatedAccount()).resolves.toEqual({
      userId: "user-1",
      email: "student@example.com",
      credits: 4,
    })
  })
})
