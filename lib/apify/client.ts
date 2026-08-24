import { ApifyClient } from "apify-client"

import type { NormalizedJob } from "@/lib/domain/job"
import type { JobSearch } from "@/lib/domain/search-schema"
import { buildApifyInput } from "@/lib/apify/build-input"
import { normalizeApifyJobs } from "@/lib/apify/normalize-job"

const ACTOR_ID = "fantastic-jobs/career-site-job-listing-api"

export class ApifySearchError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "authorization" | "timeout" | "upstream",
  ) {
    super(message)
    this.name = "ApifySearchError"
  }
}

export async function searchJobs(search: JobSearch, token = process.env.APIFY_API_TOKEN): Promise<NormalizedJob[]> {
  if (!token) throw new ApifySearchError("Apify не настроен", "configuration")

  const client = new ApifyClient({ token })

  try {
    const run = await client.actor(ACTOR_ID).call(buildApifyInput(search), {
      waitSecs: 120,
      timeout: 120,
      memory: 1024,
      maxItems: 20,
      log: null,
    })

    if (run.status !== "SUCCEEDED") {
      throw new ApifySearchError("Поиск вакансий не завершился вовремя", "timeout")
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 20, clean: true })
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
