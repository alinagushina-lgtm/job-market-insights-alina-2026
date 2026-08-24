import type { StreamEvent } from "@/lib/domain/stream-event"

export async function readNdjson(response: Response, onEvent: (event: StreamEvent) => void) {
  if (!response.body) throw new Error("Сервер не вернул поток данных")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as StreamEvent)
    }
    if (done) break
  }

  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent)
}
