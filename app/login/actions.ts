"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { authErrorMessage, parseCredentials } from "@/lib/auth/credentials"
import { createClient } from "@/lib/supabase/server"

export type AuthActionState = { message: string }

function validationMessage(result: ReturnType<typeof parseCredentials>) {
  if (result.success) return ""
  return result.error.issues[0]?.message ?? "Проверьте email и пароль"
}

export async function signInAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = parseCredentials(formData)
  if (!parsed.success) return { message: validationMessage(parsed) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { message: authErrorMessage(error.code) }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signUpAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = parseCredentials(formData)
  if (!parsed.success) return { message: validationMessage(parsed) }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) return { message: authErrorMessage(error.code) }
  if (!data.session) {
    return { message: "Аккаунт создан, но автоматический вход недоступен. Проверьте настройки подтверждения email" }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
