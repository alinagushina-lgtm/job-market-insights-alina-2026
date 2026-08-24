import type { NormalizedJob } from "@/lib/domain/job"
import type { JobSearch } from "@/lib/domain/search-schema"
import { ApifySearchError, searchJobs as searchApifyJobs } from "@/lib/apify/client"

export class JobSearchError extends Error {
  constructor(message: string, readonly code: "configuration" | "timeout" | "upstream") {
    super(message)
    this.name = "JobSearchError"
  }
}

function apifyError(error: ApifySearchError) {
  if (error.code === "configuration" || error.code === "authorization") {
    return new JobSearchError("Поиск вакансий временно не настроен", "configuration")
  }
  if (error.code === "timeout") {
    return new JobSearchError("Поиск вакансий занял слишком много времени. Попробуйте сузить географию", "timeout")
  }
  return new JobSearchError("Сервис вакансий временно недоступен", "upstream")
}

export async function searchJobs(search: JobSearch): Promise<NormalizedJob[]> {
  try {
    return await searchApifyJobs(search)
  } catch (error) {
    if (error instanceof ApifySearchError) throw apifyError(error)
    throw error
  }
}
