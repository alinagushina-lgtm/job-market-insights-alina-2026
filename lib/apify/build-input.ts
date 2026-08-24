import type { JobSearch } from "@/lib/domain/search-schema"
import { countryByCode } from "@/lib/domain/countries"
import { resolveJobTitle } from "@/lib/domain/job-titles"

export type ApifyActorInput = {
  timeRange: "7d"
  limit: 20
  descriptionType: "text"
  titleSearch: string[]
  locationSearch?: string[]
  includeCompanyDetails: false
  hasSalary: false
  populateAiRemoteLocation: true
  populateAiRemoteLocationDerived: true
  aiWorkArrangementFilter?: string[]
  aiExperienceLevelFilter?: string[]
}

const CITY_NAMES: Record<string, string> = {
  москва: "Moscow",
  "санкт-петербург": "Saint Petersburg",
  петербург: "Saint Petersburg",
  минск: "Minsk",
  алматы: "Almaty",
  астана: "Astana",
  ташкент: "Tashkent",
  бишкек: "Bishkek",
  ереван: "Yerevan",
  баку: "Baku",
  кишинёв: "Chisinau",
  кишинев: "Chisinau",
  душанбе: "Dushanbe",
  ашхабад: "Ashgabat",
}

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "",
}

export function transliterateCity(value: string) {
  const trimmed = value.trim()
  const known = CITY_NAMES[trimmed.toLowerCase()]
  if (known) return known

  const transliterated = Array.from(trimmed.toLowerCase())
    .map((character) => CYRILLIC_MAP[character] ?? character)
    .join("")

  return transliterated.replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase())
}

function workArrangement(mode: JobSearch["workMode"]) {
  if (mode === "remote") return ["Remote OK", "Remote Solely"]
  if (mode === "hybrid") return ["Hybrid"]
  if (mode === "onsite") return ["On-site"]
  return undefined
}

function experienceLevel(level: JobSearch["level"]) {
  if (level === "junior") return ["0-2"]
  if (level === "middle") return ["2-5"]
  if (level === "senior") return ["5-10"]
  if (level === "lead") return ["10+"]
  return undefined
}

export function buildApifyInput(search: JobSearch): ApifyActorInput {
  const titles = Array.from(
    new Map(
      [search.title, search.alternateTitle]
        .filter((value): value is string => Boolean(value))
        .map(resolveJobTitle)
        .filter(Boolean)
        .map((value) => [value.toLocaleLowerCase("en"), value]),
    ).values(),
  )
  const country = countryByCode(search.country)
  const location = search.country === "WORLD"
    ? undefined
    : search.city
      ? `${transliterateCity(search.city)}, ${country.englishName}`
      : country.englishName

  return {
    timeRange: "7d",
    limit: 20,
    descriptionType: "text",
    titleSearch: titles,
    ...(location ? { locationSearch: [location] } : {}),
    includeCompanyDetails: false,
    hasSalary: false,
    populateAiRemoteLocation: true,
    populateAiRemoteLocationDerived: true,
    aiWorkArrangementFilter: workArrangement(search.workMode),
    aiExperienceLevelFilter: experienceLevel(search.level),
  }
}
