import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { getAuthenticatedContext } from "@/lib/auth/session"

export default async function LoginPage() {
  const account = await getAuthenticatedContext()
  if (account) redirect("/")

  return (
    <main className="grid-paper min-h-screen px-5 py-10 sm:grid sm:place-items-center sm:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:justify-between">
        <section className="max-w-lg text-center lg:text-left">
          <div className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
              <span className="h-3 w-3 rounded-sm bg-signal" />
            </span>
            <span className="text-lg font-medium tracking-tight">Рынок</span>
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            поиск работы + разбор требований
          </p>
          <h2 className="mt-4 text-balance text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Пять анализов рынка после регистрации
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Ищем свежие вакансии, сравниваем требования с вашим профилем и показываем, что учить дальше.
          </p>
        </section>
        <AuthForm />
      </div>
    </main>
  )
}
