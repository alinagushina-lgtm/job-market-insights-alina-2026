import "server-only"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type AuthenticatedAccount = {
  userId: string
  email: string
  credits: number
}

export type AuthenticatedContext = {
  userId: string
  email: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (error || !claims?.sub) return null

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    supabase,
  }
}

export async function getAuthenticatedAccount(): Promise<AuthenticatedAccount | null> {
  const context = await getAuthenticatedContext()
  if (!context) return null

  const { data, error } = await context.supabase
    .from("user_credits")
    .select("credits")
    .eq("user_id", context.userId)
    .single()

  if (error || !data || typeof data.credits !== "number") {
    throw new Error("Account credits are unavailable")
  }

  return { userId: context.userId, email: context.email, credits: data.credits }
}

export async function requirePageAccount() {
  const account = await getAuthenticatedAccount()
  if (!account) redirect("/login")
  return account
}
