import type { JobWithSalaryGroup } from "@/lib/domain/job"
import type { MarketReport } from "@/lib/domain/report"

export type AnalysisStatus = "verifying" | "searching" | "analyzing"

export type StreamEvent =
  | { type: "status"; status: AnalysisStatus; message: string }
  | { type: "jobs"; jobs: JobWithSalaryGroup[]; searchedAt: string }
  | { type: "analysis"; report: MarketReport }
  | { type: "warning"; code: string; message: string }
  | { type: "error"; code: string; message: string }
  | { type: "complete" }
