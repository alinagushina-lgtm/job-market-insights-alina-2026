import type { JobWithSalaryGroup } from "@/lib/domain/job"
import type { MarketReport } from "@/lib/domain/report"
import type { SearchRequest } from "@/lib/domain/search-schema"
import type { AnalysisMode } from "@/lib/domain/stream-event"

const STORAGE_KEY = "job-market-insights:v4"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT = 5

export type StoredResult = {
  key: string
  createdAt: number
  jobs: JobWithSalaryGroup[]
  report?: MarketReport
  mode?: AnalysisMode
  warning?: string
}

type StoredState = {
  version: 4
  attempts: number[]
  results: StoredResult[]
}

function emptyState(): StoredState {
  return { version: 4, attempts: [], results: [] }
}

function readState(storage: Storage, now = Date.now()): StoredState {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as Partial<StoredState> | null
    if (!raw || raw.version !== 4 || !Array.isArray(raw.attempts) || !Array.isArray(raw.results)) return emptyState()
    return {
      version: 4,
      attempts: raw.attempts.filter((time): time is number => typeof time === "number" && now - time < RATE_WINDOW_MS),
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

export function registerAnalysisAttempt(storage: Storage, now = Date.now()) {
  const state = readState(storage, now)
  if (state.attempts.length >= RATE_LIMIT) return false
  state.attempts.push(now)
  writeState(storage, state)
  return true
}

export function canStartAnalysis(storage: Storage, now = Date.now()) {
  return readState(storage, now).attempts.length < RATE_LIMIT
}

export function saveResult(storage: Storage, result: StoredResult, now = Date.now()) {
  const state = readState(storage, now)
  state.results = [result, ...state.results.filter((item) => item.key !== result.key)].slice(0, RATE_LIMIT)
  writeState(storage, state)
}
