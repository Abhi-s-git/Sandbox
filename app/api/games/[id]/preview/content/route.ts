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
 * Returns a friendly HTML placeholder page for display inside the preview
 * iframe when the game server is unreachable or the game files don't exist yet.
 * Always returns HTTP 200 so the browser renders it (not the browser's own
 * error page or Next.js's 404).
 */
function notReadyHtml(message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0f0f;
      color: #888;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    p { font-size: 0.875rem; }
  </style>
</head>
<body>
  <p>${message}</p>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-frame-options": "SAMEORIGIN",
    },
  })
}

/**
 * Server-side proxy for Daytona game preview content.
 *
 * The browser iframes this route. This route fetches the actual content from
 * the Daytona preview URL, authenticating with the token as a request header
 * (which the browser cannot do from an iframe src). It strips any
 * framing-blocking headers before returning the response to the browser.
 *
 * When the game server is unreachable or the upstream returns a non-2xx
 * response (e.g. the sandbox was restarted and AI-written game files were
 * lost), a friendly in-iframe placeholder is returned instead of forwarding
 * the raw error — preventing raw 404 pages from appearing in the preview panel.
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

  let sandbox: Awaited<ReturnType<typeof startGameServer>>["sandbox"]
  try {
    ;({ sandbox } = await startGameServer(game.sandboxId))
  } catch {
    return notReadyHtml("Game server is starting up…")
  }

  let preview: Awaited<ReturnType<typeof sandbox.getPreviewLink>>
  try {
    preview = await sandbox.getPreviewLink(GAME_SERVER_PORT)
  } catch {
    return notReadyHtml("Game server is starting up…")
  }

  let upstream: Response
  try {
    upstream = await fetch(preview.url, {
      headers: preview.token
        ? { "x-daytona-preview-token": preview.token }
        : {},
      redirect: "follow",
    })
  } catch {
    return notReadyHtml("Could not reach game server")
  }

  // When the game server is running but the game files don't exist yet
  // (e.g. sandbox was restarted and the AI-written files were lost),
  // serve returns a non-2xx status. Replace error responses with a friendly
  // in-iframe placeholder so the browser doesn't render serve's raw error page.
  if (!upstream.ok) {
    return notReadyHtml("Nothing has been built yet")
  }

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
