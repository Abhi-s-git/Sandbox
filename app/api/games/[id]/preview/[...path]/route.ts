import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { getGame } from "@/lib/games/queries"
import { startGameServer, GAME_SERVER_PORT } from "@/lib/daytona/utils"

// Headers from the upstream (Daytona) response that must NOT be forwarded to
// the browser. Same set as content/route.ts.
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  // fetch() decompresses the body automatically; forwarding the upstream's
  // encoding/length headers causes a header↔body mismatch that makes the
  // browser discard the response.
  "content-encoding",
  "content-length",
])

/**
 * Catch-all proxy for Daytona game preview sub-resources.
 *
 * The `content/route.ts` sibling handles the root `index.html` request.
 * This route handles every other path the generated game's HTML requests —
 * e.g. `/api/games/<id>/preview/runtime/engine.js`. Next.js always resolves
 * the more-specific static segment (`content`) before this catch-all,
 * so `/preview/content` continues to be served by content/route.ts.
 *
 * Request path → upstream path mapping:
 *   /api/games/<id>/preview/runtime/engine.js
 *   catch-all path = ["runtime", "engine.js"]
 *   upstream = <daytona-preview-url>/runtime/engine.js
 *
 * Sub-resources are proxied with their real upstream status code so the
 * browser can properly handle 304 Not Modified, 404, etc. We do not
 * substitute HTML placeholders here — a JS file returning HTML would be
 * silently rejected by the browser anyway.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  await auth.protect()

  const { id, path } = await params
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
    return new NextResponse(null, { status: 503 })
  }

  let preview: Awaited<ReturnType<typeof sandbox.getPreviewLink>>
  try {
    preview = await sandbox.getPreviewLink(GAME_SERVER_PORT)
  } catch {
    return new NextResponse(null, { status: 503 })
  }

  // Build the full upstream URL by appending the catch-all path segments to
  // the Daytona preview base URL. The base URL may or may not have a trailing
  // slash — normalise it before joining.
  const base = preview.url.replace(/\/$/, "")
  const subPath = path && path.length > 0 ? "/" + path.join("/") : "/"
  const upstreamUrl = base + subPath

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: preview.token
        ? { "x-daytona-preview-token": preview.token }
        : {},
      redirect: "follow",
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }

  // Forward the upstream status and body. Strip headers that would break
  // cross-origin / in-iframe rendering.
  const responseHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!BLOCKED_UPSTREAM_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
