import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { claimAiRetry, consumeAnalysisCredit } from "@/lib/credits/service"

function clientWithRpc(result: unknown) {
  return { rpc: vi.fn().mockResolvedValue(result) } as never
}

describe("consumeAnalysisCredit", () => {
  it("возвращает запуск и остаток после успешного списания", async () => {
    const client = clientWithRpc({ data: [{ run_id: "run-1", remaining_credits: 4 }], error: null })
    await expect(consumeAnalysisCredit(client, "Developer", "WORLD")).resolves.toEqual({
      status: "success",
      analysisRunId: "run-1",
      remainingCredits: 4,
    })
  })

  it("отличает нулевой баланс от сбоя базы", async () => {
    await expect(consumeAnalysisCredit(clientWithRpc({ data: [], error: null }), "Developer", "WORLD"))
      .resolves.toEqual({ status: "exhausted" })
    await expect(consumeAnalysisCredit(clientWithRpc({ data: null, error: { message: "offline" } }), "Developer", "WORLD"))
      .resolves.toEqual({ status: "unavailable" })
  })
})

describe("claimAiRetry", () => {
  it("различает разрешённый, использованный и недоступный повтор", async () => {
    await expect(claimAiRetry(clientWithRpc({ data: true, error: null }), "run-1")).resolves.toBe("allowed")
    await expect(claimAiRetry(clientWithRpc({ data: false, error: null }), "run-1")).resolves.toBe("used_or_foreign")
    await expect(claimAiRetry(clientWithRpc({ data: null, error: { message: "offline" } }), "run-1")).resolves.toBe("unavailable")
  })
})
