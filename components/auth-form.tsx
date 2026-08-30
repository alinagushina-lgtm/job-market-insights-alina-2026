"use client"

import { useActionState, useState } from "react"

import type { AuthActionState } from "@/app/login/actions"
import { signInAction, signUpAction } from "@/app/login/actions"
import { Button } from "@/components/ui/button"

const initialAuthState: AuthActionState = { message: "" }
const FIELD_CLASS = "mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
const LABEL_CLASS = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signup")
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initialAuthState)
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialAuthState)
  const state = mode === "signin" ? signInState : signUpState
  const pending = mode === "signin" ? signInPending : signUpPending

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Режим авторизации">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${mode === "signup" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
        >
          Регистрация
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${mode === "signin" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
        >
          Войти
        </button>
      </div>

      <div className="mt-7">
        <p className={LABEL_CLASS}>{mode === "signup" ? "новый аккаунт · 5 кредитов" : "возвращение в сервис"}</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {mode === "signup" ? "Создайте аккаунт" : "Войдите в аккаунт"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {mode === "signup"
            ? "После регистрации вы сразу получите 5 анализов рынка вакансий."
            : "Баланс кредитов сохранён в вашем аккаунте."}
        </p>
      </div>

      <form action={mode === "signin" ? signInFormAction : signUpFormAction} className="mt-7 space-y-5">
        <label className="block">
          <span className={LABEL_CLASS}>email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className={FIELD_CLASS}
            placeholder="name@example.com"
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>пароль</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            maxLength={128}
            className={FIELD_CLASS}
            placeholder="Не менее 6 символов"
          />
        </label>

        {state.message ? (
          <p role="alert" aria-live="polite" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Подождите…" : mode === "signup" ? "Зарегистрироваться" : "Войти"}
        </Button>
      </form>
    </div>
  )
}
