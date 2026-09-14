"use client"

import { useEffect, useState } from "react"

interface ChatPreviewProps {
  gameId: string
}

export function ChatPreview({ gameId }: ChatPreviewProps) {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPreview() {
      try {
        const res = await fetch(`/api/games/${gameId}/preview`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Request failed (${res.status})`)
        }
        const { url } = await res.json()
        if (!cancelled) setProxyUrl(url)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load preview",
          )
        }
      }
    }

    fetchPreview()
    return () => {
      cancelled = true
    }
  }, [gameId])

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>
  }

  if (!proxyUrl) {
    return <p className="p-4 text-sm text-muted-foreground">Loading preview…</p>
  }

  return (
    <iframe
      src={proxyUrl}
      className="h-full w-full border-0"
      title="Game preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  )
}
