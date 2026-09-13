import { logger } from "@trigger.dev/sdk"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { daytona } from "@/lib/daytona/client"

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Game</title></head>
<body>
  <h1>New game</h1>
</body>
</html>
`

/**
 * Creates a Daytona sandbox for the given game (idempotent — no-op if the
 * game already has a sandboxId). Seeds /home/daytona/game/index.html with a
 * blank game shell, then persists the sandbox ID back to the database.
 *
 * All errors are logged via Trigger.dev logger before being re-thrown so they
 * appear in run logs and are not silently swallowed by the onChatStart hook.
 *
 * @returns The sandbox ID (new or pre-existing).
 */
export async function createGameSandbox(gameId: string): Promise<string> {
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
    return game.sandboxId
  }

  // ── provision sandbox ──────────────────────────────────────────────────────
  logger.info("createGameSandbox: creating Daytona sandbox", { gameId })

  let sandboxId: string
  try {
    const sandbox = await daytona.create({
      labels: { gameId },
    })

    // Defensive: SDK types sandbox.id as string, but guard against an
    // unexpected empty value before we commit it to the database.
    if (!sandbox.id) {
      throw new Error("Daytona sandbox was created but returned no id")
    }

    sandboxId = sandbox.id
    logger.info("createGameSandbox: sandbox created", { gameId, sandboxId })

    // ── seed index.html ──────────────────────────────────────────────────────
    const mkdirResult = await sandbox.process.executeCommand(
      "mkdir -p /home/daytona/game",
    )
    if (mkdirResult.exitCode !== 0) {
      throw new Error(
        `mkdir failed (exit ${mkdirResult.exitCode}): ${mkdirResult.result}`,
      )
    }

    await sandbox.fs.uploadFile(
      Buffer.from(INITIAL_HTML),
      "/home/daytona/game/index.html",
    )

    logger.info("createGameSandbox: index.html seeded", { gameId, sandboxId })
  } catch (err) {
    logger.error("createGameSandbox: failed to provision sandbox", {
      gameId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }

  // ── persist sandbox ID ─────────────────────────────────────────────────────
  try {
    const updated = await db
      .update(games)
      .set({ sandboxId })
      .where(eq(games.id, gameId))
      .returning({ sandboxId: games.sandboxId })

    if (updated.length === 0) {
      throw new Error(
        `DB update matched no rows — game may have been deleted (id=${gameId})`,
      )
    }

    logger.info("createGameSandbox: sandboxId saved to DB", {
      gameId,
      sandboxId,
    })
  } catch (err) {
    logger.error("createGameSandbox: failed to save sandboxId to DB", {
      gameId,
      sandboxId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }

  return sandboxId
}
