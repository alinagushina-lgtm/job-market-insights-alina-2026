import type { StreamEvent } from "@/lib/domain/stream-event"

const encoder = new TextEncoder()

export function encodeStreamEvent(event: StreamEvent) {
  return encoder.encode(`${JSON.stringify(event)}\n`)
}
