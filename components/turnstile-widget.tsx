"use client"

import Script from "next/script"
import { useEffect, useId, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const DEVELOPMENT_SITE_KEY = "1x00000000000000000000AA"
const DEVELOPMENT_TOKEN = "local-development-turnstile-token"

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const reactId = useId()
  const containerId = `turnstile-${reactId.replace(/:/g, "")}`
  const widgetId = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
    (process.env.NODE_ENV === "development" ? DEVELOPMENT_SITE_KEY : "")
  const usesDevelopmentTest = process.env.NODE_ENV === "development" && siteKey === DEVELOPMENT_SITE_KEY

  useEffect(() => {
    if (usesDevelopmentTest) onToken(DEVELOPMENT_TOKEN)
  }, [onToken, usesDevelopmentTest])

  useEffect(() => {
    if (window.turnstile) setScriptReady(true)
  }, [])

  useEffect(() => {
    if (usesDevelopmentTest || !scriptReady || !siteKey || !window.turnstile || widgetId.current) return
    widgetId.current = window.turnstile.render(`#${containerId}`, {
      sitekey: siteKey,
      language: "ru",
      theme: "light",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    })

    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [containerId, onToken, scriptReady, siteKey, usesDevelopmentTest])

  if (!siteKey) {
    return <p className="text-sm text-destructive">Turnstile не настроен: добавьте публичный ключ сайта.</p>
  }

  if (usesDevelopmentTest) {
    return <p className="text-sm text-muted-foreground">Локальная тестовая проверка активна</p>
  }

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div id={containerId} className="min-h-[65px]" aria-label="Проверка безопасности" />
    </div>
  )
}
