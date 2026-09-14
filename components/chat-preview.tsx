"use client"

import { useEffect, useState } from "react"

interface ChatPreviewProps {
  gameId: string
  /**
   * Incremented by ChatProvider each time a streaming turn completes.
   * Used as the iframe key so the browser reloads the preview after every
   * turn without fetching a new proxy URL from the API.
   */
  revision?: number
}

export function ChatPreview({ gameId, revision = 0 }: ChatPreviewProps) {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch the proxy URL once per gameId. The URL itself never changes —
  // only the iframe content changes after each turn, so we reload the
  // iframe via the `key` prop rather than re-fetching the URL.
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
      // Changing the key unmounts and remounts the iframe, forcing the
      // browser to reload the Daytona preview after each completed turn.
      key={revision}
      src={proxyUrl}
      className="h-full w-full border-0"
      title="Game preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  )
}
