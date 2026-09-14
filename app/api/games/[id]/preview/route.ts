import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { getGame } from "@/lib/games/queries"
import { startGameServer } from "@/lib/daytona/utils"

/**
 * Returns the URL of our own server-side proxy for the game preview.
 * The client sets this as the iframe src — it never touches Daytona directly.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await auth.protect()

  const { id } = await params
  const game = await getGame(id)

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  if (!game.sandboxId) {
    return NextResponse.json(
      { error: "No sandbox for this game" },
      { status: 404 },
    )
  }

  await startGameServer(game.sandboxId)

  // Derive the public origin from forwarded headers set by Railway (and any
  // other reverse proxy). Falling back to req.url.origin works for local dev
  // where no proxy is involved, but in production req.url carries the internal
  // host (e.g. http://0.0.0.0:3000) which the browser cannot reach.
  const headers = req.headers
  const forwardedHost = headers.get("x-forwarded-host")
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0].trim()
  const origin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : new URL(req.url).origin

  const proxyUrl = `${origin}/api/games/${id}/preview/content`

  return NextResponse.json({ url: proxyUrl })
}
