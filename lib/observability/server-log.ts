type LogValue = string | number | boolean | null | undefined
type LogFields = Record<string, LogValue>

function safeValue(value: LogValue) {
  if (typeof value !== "string") return value
  return value
    .replace(/(?:sk-or-v1-|apify_api_)[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 240)
}

export function requestId(request: Request) {
  return request.headers.get("x-vercel-id")?.slice(0, 120) || crypto.randomUUID()
}

export function logServerEvent(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, safeValue(value)])),
  }
  console[level](JSON.stringify(entry))
}
