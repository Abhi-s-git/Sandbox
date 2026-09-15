import { type Sandbox } from "@daytona/sdk"
import { logger } from "@trigger.dev/sdk"
import { eq } from "drizzle-orm"
import fs from "node:fs"
import path from "node:path"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { daytona } from "@/lib/daytona/client"

export const GAME_SERVER_PORT = 3000

/**
 * Returns a guaranteed, started Sandbox instance for the given game.
 *
 * Intended as the single entry-point for chat.ts tools that need to interact
 * with the sandbox (read/write files, run commands, etc.). It handles all
 * lifecycle edge-cases so tool implementations stay simple:
 *
 *  - Looks up the sandboxId stored on the game record.
 *  - Throws a clear error if the game has no sandbox yet (tools should not
 *    be called before createGameSandbox has run).
 *  - Fetches the Sandbox instance via the Daytona client.
 *  - Starts the sandbox if it is not already in the "started" state.
 *
 * @param gameId - The game ID (same as the chat session ID in chat.ts).
 * @returns The started Sandbox instance ready for tool use.
 */
export async function getGameSandbox(gameId: string): Promise<{ sandbox: Sandbox }> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { sandboxId: true },
  })

  if (!game) {
    throw new Error(`getGameSandbox: game not found (id=${gameId})`)
  }

  if (!game.sandboxId) {
    throw new Error(
      `getGameSandbox: game has no sandbox yet — createGameSandbox must run first (id=${gameId})`,
    )
  }

  const sandbox = await daytona.get(game.sandboxId)

  if (sandbox.state !== "started") {
    logger.info("getGameSandbox: sandbox not started, starting", {
      gameId,
      sandboxId: game.sandboxId,
      state: sandbox.state,
    })
    await sandbox.start()
    logger.info("getGameSandbox: sandbox started", {
      gameId,
      sandboxId: game.sandboxId,
    })
  }

  return { sandbox }
}

/**
 * Returns true when the preview URL responds with a success or redirect status.
 * Treats 502 (Daytona proxy "nothing listening") as not-ready, same as a
 * network error, so the caller can retry.
 */
async function isServerReady(url: string, token: string | undefined): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: token ? { "x-daytona-preview-token": token } : {},
      signal: AbortSignal.timeout(3000),
    })
    return res.ok || res.status === 301 || res.status === 302
  } catch {
    return false
  }
}

/**
 * Ensures the static file server for the game is running inside the sandbox.
 *
 * Strategy:
 *  1. Fetch the sandbox by ID and start it if it is not already running.
 *  2. Health-check the server on GAME_SERVER_PORT — return immediately if healthy.
 *  3. Otherwise launch `npx serve /home/daytona/game` in the background.
 *  4. Poll the preview URL until the server is ready (up to 15 s / 10 attempts).
 *
 * The poll after launch is required because executeCommand returns as soon as the
 * shell forks the background process — the server takes a second or two to bind
 * its port. Without polling, the content route fetches the preview URL before
 * anything is listening and Daytona's proxy returns a 502.
 *
 * @param sandboxId - The Daytona sandbox ID stored on the game record.
 * @returns The running Sandbox instance.
 */
export async function startGameServer(
  sandboxId: string,
): Promise<{ sandbox: Sandbox }> {
  logger.info("startGameServer: entered", { sandboxId })

  // ── 1. Get sandbox and ensure it is started ──────────────────────────────
  const sandbox = await daytona.get(sandboxId)

  if (sandbox.state !== "started") {
    logger.info("startGameServer: sandbox not started, starting", {
      sandboxId,
      state: sandbox.state,
    })
    await sandbox.start()
    logger.info("startGameServer: sandbox started", { sandboxId })
  }

  // ── 2. Health-check for an already-running server ────────────────────────
  const preview = await sandbox.getPreviewLink(GAME_SERVER_PORT)

  if (await isServerReady(preview.url, preview.token)) {
    logger.info("startGameServer: server already running", { sandboxId })
    return { sandbox }
  }

  // ── 3. Launch static file server ─────────────────────────────────────────
  logger.info("startGameServer: launching static server", {
    sandboxId,
    port: GAME_SERVER_PORT,
  })

  await sandbox.process.executeCommand(
    `nohup npx --yes serve /home/daytona/game -l ${GAME_SERVER_PORT} > /tmp/serve.log 2>&1 &`,
  )

  logger.info("startGameServer: server process forked", { sandboxId })

  // ── 4. Poll until the server is ready ────────────────────────────────────
  // The background process takes a moment to bind its port. Poll with
  // exponential back-off (500 ms → 1 s → 2 s …) for up to 10 attempts (~15 s
  // total). A 502 from Daytona means "nothing listening yet" — keep retrying.
  const MAX_ATTEMPTS = 10
  let delayMs = 500

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    delayMs = Math.min(delayMs * 2, 4000)

    if (await isServerReady(preview.url, preview.token)) {
      logger.info("startGameServer: server ready", { sandboxId, attempt })
      return { sandbox }
    }

    logger.info("startGameServer: waiting for server", { sandboxId, attempt })
  }

  // Log the serve output to help debug if it never came up.
  try {
    const logResult = await sandbox.process.executeCommand("cat /tmp/serve.log")
    logger.error("startGameServer: server did not become ready", {
      sandboxId,
      serveLog: logResult.result,
    })
  } catch {
    logger.error("startGameServer: server did not become ready (could not read log)", {
      sandboxId,
    })
  }

  throw new Error(
    `startGameServer: static file server on port ${GAME_SERVER_PORT} did not become ready after ${MAX_ATTEMPTS} attempts`,
  )
}

/** Absolute local path to the runtime seed folder, relative to project root. */
const RUNTIME_DIR = path.join(process.cwd(), "lib/games/runtime")

/** Absolute path to the game directory inside every Daytona sandbox. */
const SANDBOX_GAME_DIR = "/home/daytona/game"

/**
 * Escapes a string for safe embedding inside a POSIX single-quoted shell
 * argument: single quotes are ended, escaped, and re-opened.
 */
function shellEscapeForSeed(value: string): string {
  return value.replace(/'/g, "'\\''")
}

/**
 * Recursively collects all files under `dir`, returning their absolute local
 * paths. Directories are not included — only leaf files.
 */
function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(full))
    } else if (entry.isFile()) {
      results.push(full)
    }
  }
  return results
}

/**
 * Creates a Daytona sandbox for the given game (idempotent — no-op if the
 * game already has a sandboxId). Seeds /home/daytona/game/ by recursively
 * walking lib/games/runtime/** using Node's `fs` module, then uploading each
 * file to the sandbox via `executeCommand` (printf + shell redirection).
 *
 * Files are written with the same relative path structure as the runtime
 * folder. For example:
 *   lib/games/runtime/index.html → /home/daytona/game/index.html
 *   lib/games/runtime/assets/bg.png → /home/daytona/game/assets/bg.png
 *
 * We use printf + shell redirection rather than fs.uploadFile because
 * uploadFile relies on a dynamic require('form-data') that is not available
 * inside the bundled ESM worker at runtime.
 *
 * @returns The started Sandbox instance.
 */
export async function createGameSandbox(gameId: string): Promise<{ sandbox: Sandbox }> {
  logger.log("CREATE GAME SANDBOX ENTERED", { gameId })

  // ── idempotency check ──────────────────────────────────────────────────────
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { sandboxId: true },
  })

  if (!game) {
    const err = new Error(`createGameSandbox: game not found (id=${gameId})`)
    logger.error(err.message)
    throw err
  }

  if (game.sandboxId) {
    logger.info("createGameSandbox: sandbox already exists, skipping", {
      gameId,
      sandboxId: game.sandboxId,
    })
    const sandbox = await daytona.get(game.sandboxId)
    return { sandbox }
  }

  // ── provision sandbox ──────────────────────────────────────────────────────
  logger.info("createGameSandbox: creating Daytona sandbox", { gameId })

  let sandbox: Sandbox
  try {
    sandbox = await daytona.create({
      labels: { gameId },
    })

    if (!sandbox.id) {
      throw new Error("Daytona sandbox was created but returned no id")
    }

    logger.info("createGameSandbox: sandbox created", { gameId, sandboxId: sandbox.id })

    // ── seed all files from lib/games/runtime/** ─────────────────────────────
    // Collect every file in the local runtime directory, then upload each to
    // the sandbox preserving the relative directory structure.
    const localFiles = collectFiles(RUNTIME_DIR)

    logger.info("createGameSandbox: seeding runtime files", {
      gameId,
      sandboxId: sandbox.id,
      fileCount: localFiles.length,
      runtimeDir: RUNTIME_DIR,
    })

    for (const localPath of localFiles) {
      // Compute the relative path from the runtime folder root, then build
      // the absolute destination path inside the sandbox.
      const relative = path.relative(RUNTIME_DIR, localPath)
      const remotePath = path.posix.join(
        SANDBOX_GAME_DIR,
        // Convert Windows backslashes to forward slashes for the remote path.
        relative.replace(/\\/g, "/"),
      )
      const remoteDir = path.posix.dirname(remotePath)

      const content = fs.readFileSync(localPath, "utf8")
      const escaped = shellEscapeForSeed(content)

      const result = await sandbox.process.executeCommand(
        `mkdir -p '${remoteDir}' && printf '%s' '${escaped}' > '${remotePath}'`,
      )

      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to seed ${relative} (exit ${result.exitCode}): ${result.result}`,
        )
      }

      logger.info("createGameSandbox: seeded file", {
        gameId,
        sandboxId: sandbox.id,
        relative,
        remotePath,
      })
    }

    logger.info("createGameSandbox: all runtime files seeded", {
      gameId,
      sandboxId: sandbox.id,
      fileCount: localFiles.length,
    })
  } catch (err) {
    logger.error("createGameSandbox: failed to provision sandbox", {
      gameId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }

  // ── persist sandbox ID ─────────────────────────────────────────────────────
  try {
    const updated = await db
      .update(games)
      .set({ sandboxId: sandbox.id })
      .where(eq(games.id, gameId))
      .returning({ sandboxId: games.sandboxId })

    if (updated.length === 0) {
      throw new Error(
        `DB update matched no rows — game may have been deleted (id=${gameId})`,
      )
    }

    logger.info("createGameSandbox: sandboxId saved to DB", {
      gameId,
      sandboxId: sandbox.id,
    })
  } catch (err) {
    logger.error("createGameSandbox: failed to save sandboxId to DB", {
      gameId,
      sandboxId: sandbox.id,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }

  return { sandbox }
}
