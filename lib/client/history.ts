import type { JobWithSalaryGroup } from "@/lib/domain/job"
import type { MarketReport } from "@/lib/domain/report"
import type { SearchRequest } from "@/lib/domain/search-schema"
import type { AnalysisMode } from "@/lib/domain/stream-event"

const STORAGE_KEY = "job-market-insights:v5"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_RESULTS = 5

export type StoredResult = {
  key: string
  createdAt: number
  jobs: JobWithSalaryGroup[]
  report?: MarketReport
  mode?: AnalysisMode
  warning?: string
  analysisRunId?: string
}

type StoredState = {
  version: 5
  results: StoredResult[]
}

function emptyState(): StoredState {
  return { version: 5, results: [] }
}

function readState(storage: Storage, now = Date.now()): StoredState {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as Partial<StoredState> | null
    if (!raw || raw.version !== 5 || !Array.isArray(raw.results)) return emptyState()
    return {
      version: 5,
      results: raw.results.filter(
        (result): result is StoredResult =>
          Boolean(result) && typeof result.key === "string" && typeof result.createdAt === "number" && now - result.createdAt < CACHE_TTL_MS,
      ),
    }
  } catch {
    return emptyState()
  }
}

function writeState(storage: Storage, state: StoredState) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private browsing or a full quota should not break the search itself.
  }
}

export function requestCacheKey(request: Omit<SearchRequest, "turnstileToken">) {
  return JSON.stringify(request)
}

export function findCachedResult(storage: Storage, key: string, now = Date.now()) {
  const state = readState(storage, now)
  writeState(storage, state)
  return state.results.find((result) => result.key === key)
}

export function saveResult(storage: Storage, result: StoredResult, now = Date.now()) {
  const state = readState(storage, now)
  state.results = [result, ...state.results.filter((item) => item.key !== result.key)].slice(0, MAX_RESULTS)
  writeState(storage, state)
}
