import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { getGame } from "@/lib/games/queries"
import { startGameServer, GAME_SERVER_PORT } from "@/lib/daytona/utils"

// Headers from the upstream (Daytona) response that must NOT be forwarded to
// the browser — they would prevent the page rendering inside our iframe.
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  // fetch() decompresses the body automatically; forwarding the upstream's
  // encoding/length headers causes a header↔body mismatch that makes the
  // browser discard the response (blank iframe).
  "content-encoding",
  "content-length",
])

/**
 * Server-side proxy for Daytona game preview content.
 *
 * The browser iframes this route. This route fetches the actual content from
 * the Daytona preview URL, authenticating with the token as a request header
 * (which the browser cannot do from an iframe src). It strips any
 * framing-blocking headers before returning the response to the browser.
 */
export async function GET(
  _req: Request,
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

  const { sandbox } = await startGameServer(game.sandboxId)
  const preview = await sandbox.getPreviewLink(GAME_SERVER_PORT)

  const upstream = await fetch(preview.url, {
    headers: preview.token
      ? { "x-daytona-preview-token": preview.token }
      : {},
    redirect: "follow",
  })

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!BLOCKED_UPSTREAM_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })
  responseHeaders.set("x-frame-options", "SAMEORIGIN")

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
