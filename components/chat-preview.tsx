"use client"

import { useEffect, useState } from "react"

interface ChatPreviewProps {
  gameId: string
  /**
   * The Daytona sandbox ID for this game. When null the sandbox has not been
   * created yet — we show a placeholder instead of calling the preview API.
   */
  sandboxId: string | null
  /**
   * Incremented by ChatProvider each time a streaming turn completes.
   * Used as the iframe key so the browser reloads the preview after every
   * turn without fetching a new proxy URL from the API.
   */
  revision?: number
}

export function ChatPreview({ gameId, sandboxId, revision = 0 }: ChatPreviewProps) {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch the proxy URL whenever the sandboxId becomes available. If there is
  // no sandbox yet we skip the fetch entirely and render the placeholder below.
  useEffect(() => {
    if (!sandboxId) {
      // Reset any stale URL/error from a previous state so we don't briefly
      // flash old content when the component re-renders with sandboxId=null.
      setProxyUrl(null)
      setError(null)
      return
    }

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
  }, [gameId, sandboxId])

  // No sandbox yet — show a neutral placeholder so the Preview panel is
  // always visible even for brand-new games.
  if (!sandboxId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">New game</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Nothing has been built yet
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Preview unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{error}</p>
        </div>
      </div>
    )
  }

  if (!proxyUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      </div>
    )
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
