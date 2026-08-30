import { ApifyClient } from "apify-client"

import type { NormalizedJob } from "@/lib/domain/job"
import type { JobSearch } from "@/lib/domain/search-schema"
import { buildApifyInput } from "@/lib/apify/build-input"
import { normalizeApifyJobs } from "@/lib/apify/normalize-job"

const ACTOR_ID = "fantastic-jobs/career-site-job-listing-api"
const DATASET_ATTEMPT_TIMEOUT_MS = 10_000
const DATASET_ATTEMPTS = 2
const DATASET_PAGE_SIZE = 5
const DATASET_ITEM_LIMIT = 20
const DATASET_FIELDS = [
  "id",
  "title",
  "organization",
  "url",
  "date_posted",
  "locations_derived",
  "cities_derived",
  "countries_derived",
  "ai_work_arrangement",
  "remote_derived",
  "location_type",
  "ai_experience_level",
  "ai_salary_value",
  "ai_salary_min_value",
  "ai_salary_max_value",
  "ai_salary_currency",
  "ai_salary_unit_text",
  "salary",
  "ai_key_skills",
  "ai_employment_type",
  "employment_type",
  "ai_requirements_summary",
].join(",")

export class ApifySearchError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "authorization" | "timeout" | "upstream",
  ) {
    super(message)
    this.name = "ApifySearchError"
  }
}

type Fetcher = typeof fetch

export async function fetchDatasetItems(
  datasetId: string,
  token: string,
  fetcher: Fetcher = fetch,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  const items: unknown[] = []

  for (let offset = 0; offset < DATASET_ITEM_LIMIT; offset += DATASET_PAGE_SIZE) {
    const url = new URL(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`)
    url.searchParams.set("clean", "true")
    url.searchParams.set("limit", String(DATASET_PAGE_SIZE))
    url.searchParams.set("offset", String(offset))
    url.searchParams.set("fields", DATASET_FIELDS)
    let page: unknown[] | null = null

    for (let attempt = 1; attempt <= DATASET_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetcher(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(DATASET_ATTEMPT_TIMEOUT_MS),
        })
        if (response.status === 401 || response.status === 403) {
          throw new ApifySearchError("Ключ Apify не принят", "authorization")
        }
        if (!response.ok) {
          if (attempt < DATASET_ATTEMPTS && (response.status === 429 || response.status >= 500)) {
            await sleep(300)
            continue
          }
          throw new ApifySearchError("Сервис вакансий временно недоступен", "upstream")
        }

        const responseItems = await response.json()
        if (!Array.isArray(responseItems)) throw new Error("Dataset response is not an array")
        page = responseItems as unknown[]
        break
      } catch (error) {
        if (error instanceof ApifySearchError) throw error
        if (attempt === DATASET_ATTEMPTS) throw error
        await sleep(300)
      }
    }

    if (!page) throw new ApifySearchError("Сервис вакансий временно недоступен", "upstream")
    items.push(...page)
    if (page.length < DATASET_PAGE_SIZE) break
  }

  return items.slice(0, DATASET_ITEM_LIMIT)
}

export async function searchJobs(search: JobSearch, token = process.env.APIFY_API_TOKEN): Promise<NormalizedJob[]> {
  if (!token) throw new ApifySearchError("Apify не настроен", "configuration")

  const client = new ApifyClient({
    token,
    maxRetries: 0,
    minDelayBetweenRetriesMillis: 500,
    timeoutSecs: 90,
  })

  try {
    const run = await client.actor(ACTOR_ID).call(buildApifyInput(search), {
      waitSecs: 75,
      timeout: 90,
      memory: 1024,
      maxItems: 20,
      log: null,
    })

    if (run.status !== "SUCCEEDED") {
      throw new ApifySearchError("Поиск вакансий не завершился вовремя", "timeout")
    }

    const items = await fetchDatasetItems(run.defaultDatasetId, token)
    return normalizeApifyJobs(items)
  } catch (error) {
    if (error instanceof ApifySearchError) throw error
    const message = error instanceof Error ? error.message.toLowerCase() : ""
    if (message.includes("401") || message.includes("403") || message.includes("token")) {
      throw new ApifySearchError("Ключ Apify не принят", "authorization")
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      throw new ApifySearchError("Поиск вакансий занял слишком много времени", "timeout")
    }
    throw new ApifySearchError("Сервис вакансий временно недоступен", "upstream")
  }
}
