import type { AnalysisStatus } from "@/lib/domain/stream-event"

const STATUS_INDEX: Record<AnalysisStatus, number> = { verifying: 0, searching: 1, analyzing: 2 }
const STEPS = ["Проверка формы", "Поиск вакансий", "Анализ требований"]

export function ThinkingStage({ status, message }: { status: AnalysisStatus; message: string }) {
  const activeIndex = STATUS_INDEX[status]
  return (
    <section aria-live="polite" aria-busy="true" className="animate-fade-rise rounded-xl border border-border bg-card p-5 shadow-sm lg:p-6">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-pulse" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          return (
            <li key={step} className={`rounded-lg border px-3 py-2 text-xs ${active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}>
              <span className="mr-2 font-mono">{done ? "✓" : String(index + 1).padStart(2, "0")}</span>{step}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
