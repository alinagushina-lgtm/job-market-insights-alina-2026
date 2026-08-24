export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-signal" />
          </span>
          <span className="text-base font-medium tracking-tight text-foreground">Рынок</span>
        </a>

        <nav aria-label="Основная навигация" className="hidden items-center gap-7 md:flex">
          <a href="#analysis" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Разбор
          </a>
          <a href="#vacancies" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Вакансии
          </a>
          <a href="#report" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Отчёт
          </a>
        </nav>

        <p className="font-mono text-[11px] text-muted-foreground">вакансии за 7 дней</p>
      </div>
    </header>
  )
}
