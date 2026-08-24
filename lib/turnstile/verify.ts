import { z } from "zod"

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
})

type Fetcher = typeof fetch
const DEVELOPMENT_SECRET_KEY = "1x0000000000000000000000000000000AA"
const DEVELOPMENT_TOKEN = "local-development-turnstile-token"

export async function verifyTurnstile(
  token: string,
  secret = process.env.TURNSTILE_SECRET_KEY,
  remoteIp?: string,
  fetcher: Fetcher = fetch,
) {
  if (!secret) return { success: false as const, code: "configuration" }
  if (process.env.NODE_ENV === "development" && secret === DEVELOPMENT_SECRET_KEY && token === DEVELOPMENT_TOKEN) {
    return { success: true as const, hostname: "localhost", action: "development-test" }
  }

  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { success: false as const, code: "unavailable" }

    const parsed = turnstileResponseSchema.safeParse(await response.json())
    if (!parsed.success || !parsed.data.success) {
      return { success: false as const, code: parsed.success ? parsed.data["error-codes"]?.[0] ?? "invalid" : "invalid" }
    }

    return { success: true as const, hostname: parsed.data.hostname, action: parsed.data.action }
  } catch {
    return { success: false as const, code: "unavailable" }
  }
}
