import { describe, expect, it, vi } from "vitest"

import { ApifySearchError, fetchDatasetItems } from "@/lib/apify/client"

describe("fetchDatasetItems", () => {
  it("повторяет временный сбой один раз и возвращает массив", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json([{ id: "job-1" }]))
    const fetcher = fetchMock as unknown as typeof fetch

    await expect(fetchDatasetItems("dataset-1", "test-token", fetcher, async () => undefined)).resolves.toEqual([
      { id: "job-1" },
    ])
    expect(fetcher).toHaveBeenCalledTimes(2)
    const request = fetchMock.mock.calls[0]
    expect(String(request?.[0])).toContain("/datasets/dataset-1/items?clean=true&limit=5&offset=0&fields=")
    expect(request?.[1]?.headers).toEqual({ Authorization: "Bearer test-token" })
  })

  it("не повторяет ошибку авторизации", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch

    await expect(fetchDatasetItems("dataset-1", "bad-token", fetcher)).rejects.toBeInstanceOf(ApifySearchError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("не делает больше двух сетевых попыток", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("fetch failed")
    }) as unknown as typeof fetch

    await expect(fetchDatasetItems("dataset-1", "test-token", fetcher, async () => undefined)).rejects.toThrow(
      "fetch failed",
    )
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
