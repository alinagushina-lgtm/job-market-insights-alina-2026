import { MarketConsole } from "@/components/market-console"
import { AccountProvider } from "@/components/account-provider"
import { SiteHeader } from "@/components/site-header"
import { requirePageAccount } from "@/lib/auth/session"

export default async function Page() {
  const account = await requirePageAccount()

  return (
    <AccountProvider email={account.email} initialCredits={account.credits}>
      <div className="min-h-screen font-sans">
        <SiteHeader />

        <main>
        {/* hero */}
        <section className="grid-paper border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              поиск работы + разбор требований
            </p>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-medium leading-[1.05] tracking-tight text-foreground lg:text-6xl">
              Ваш маршрут от поиска вакансий до нового навыка
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
              Ищем до 20 свежих вакансий за неделю, сравниваем требования с вашим профилем и предлагаем порядок действий.
            </p>

            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
              {[
                { value: "20", label: "вакансий максимум" },
                { value: "7", label: "дней поиска" },
                { value: "1", label: "персональный план" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-mono text-3xl font-medium tabular-nums text-foreground">
                      {stat.value}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* console */}
        <section id="analysis" className="border-b border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
            <MarketConsole />
          </div>
        </section>

        </main>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p className="font-mono text-xs text-muted-foreground">Рынок — разбор вакансий вместо бесконечной прокрутки</p>
            <p className="font-mono text-xs text-muted-foreground">Выводы относятся только к найденной выборке, а не ко всему рынку</p>
          </div>
        </footer>
      </div>
    </AccountProvider>
  )
}
