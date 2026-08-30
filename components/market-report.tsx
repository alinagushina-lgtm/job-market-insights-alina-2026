import { Button } from "@/components/ui/button"
import type { MarketReport as MarketReportData } from "@/lib/domain/report"
import type { AnalysisMode } from "@/lib/domain/stream-event"

function Panel({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-rise rounded-xl border border-border bg-card p-5 shadow-sm lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <h3 className="mt-2 text-pretty text-lg font-medium leading-snug tracking-tight">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function TextList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="space-y-3 text-sm leading-relaxed">
      {items.map((item) => <li key={item} className="border-l-2 border-primary/40 pl-3">{item}</li>)}
    </ul>
  ) : <p className="text-sm text-muted-foreground">{empty}</p>
}

export function MarketReport({
  report,
  jobCount,
  mode,
  onRetryAi,
  retrying = false,
}: {
  report: MarketReportData
  jobCount: number
  mode: AnalysisMode
  onRetryAi?: () => void
  retrying?: boolean
}) {
  return (
    <section id="report" aria-labelledby="report-title" className="flex flex-col gap-4">
      <div className="animate-fade-rise rounded-xl border border-border bg-foreground p-5 text-background shadow-sm lg:p-7">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
          <span className="opacity-60">вывод по {jobCount} вакансиям</span>
          <span className="rounded-full border border-background/25 px-2.5 py-1 tracking-[0.12em]">
            {mode === "ai" ? "AI-анализ" : "Резервный анализ"}
          </span>
        </div>
        <h2 id="report-title" className="mt-3 max-w-4xl text-balance text-xl font-medium leading-snug tracking-tight lg:text-2xl">
          {report.summary}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed opacity-70">{report.sampleNotice}</p>
        {mode === "fallback" && onRetryAi ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-background/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed opacity-70">
              Этот отчёт рассчитан из данных вакансий и остаётся доступным, даже если внешний AI-сервис не отвечает.
            </p>
            <Button type="button" variant="secondary" onClick={onRetryAi} disabled={retrying}>
              {retrying ? "Повторяем AI-анализ…" : "Повторить AI-анализ"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="часто в выборке" title="Навыки, которые встречаются чаще всего">
          {report.frequentSkills.length ? (
            <ul className="space-y-4">
              {report.frequentSkills.map((skill) => (
                <li key={skill.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{skill.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{skill.count}/{jobCount}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, skill.count / jobCount * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Структурированные навыки в вакансиях не указаны.</p>}
        </Panel>

        <Panel label="редко в выборке" title="Упомянуты только в одной вакансии">
          <TextList items={report.rareSkills} empty="Редких навыков в этой выборке не найдено." />
        </Panel>

        <Panel label="сверка с профилем" title="Ваши сильные стороны">
          <TextList items={report.strengths} empty="Недостаточно данных, чтобы уверенно назвать сильные стороны." />
        </Panel>

        <Panel label="сверка с профилем" title="Что мешает откликаться увереннее">
          <TextList items={report.gaps} empty="Явных пробелов по этой выборке не найдено." />
        </Panel>
      </div>

      <Panel label="типичные требования" title="Что повторяется в описаниях вакансий">
        <TextList items={report.typicalRequirements} empty="Модель не выделила повторяющихся требований." />
      </Panel>

      <Panel label="порядок действий" title="Что делать в первую очередь">
        <ol className="grid gap-3 md:grid-cols-2">
          {[...report.roadmap].sort((a, b) => a.priority - b.priority).map((step) => (
            <li key={`${step.priority}-${step.title}`} className="flex gap-4 rounded-lg border border-border bg-background p-4">
              <span className="font-mono text-sm text-muted-foreground">{String(step.priority).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  )
}
