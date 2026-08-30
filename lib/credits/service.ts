import "server-only"

import type { createClient } from "@/lib/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type ConsumeCreditResult =
  | { status: "success"; analysisRunId: string; remainingCredits: number }
  | { status: "exhausted" }
  | { status: "unavailable" }

export type ClaimRetryResult = "allowed" | "used_or_foreign" | "unavailable"

export async function getCreditBalance(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("user_id", userId)
    .single()

  if (error || !data || typeof data.credits !== "number") return null
  return data.credits
}

export async function consumeAnalysisCredit(
  supabase: SupabaseClient,
  query: string,
  location: string,
): Promise<ConsumeCreditResult> {
  const { data, error } = await supabase.rpc("consume_analysis_credit", {
    query_text: query,
    location_text: location,
  })

  if (error) return { status: "unavailable" }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { status: "exhausted" }
  if (typeof row.run_id !== "string" || typeof row.remaining_credits !== "number") {
    return { status: "unavailable" }
  }

  return {
    status: "success",
    analysisRunId: row.run_id,
    remainingCredits: row.remaining_credits,
  }
}

export async function claimAiRetry(supabase: SupabaseClient, analysisRunId: string): Promise<ClaimRetryResult> {
  const { data, error } = await supabase.rpc("claim_ai_retry", { run_id: analysisRunId })
  if (error) return "unavailable"
  return data === true ? "allowed" : "used_or_foreign"
}
