import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { logger } from "@trigger.dev/sdk"
import { google } from "@ai-sdk/google"
import { eq } from "drizzle-orm"
import { streamText } from "ai"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { createGameSandbox } from "@/lib/daytona/utils"

export const gameChat = chat.agent({
  id: "game-chat",

  // Suspend immediately after each turn instead of staying warm for 30 s.
  // The run frees compute as soon as onTurnComplete finishes, and the next
  // user message boots a continuation run. This is correct for a chat that
  // receives messages at human pace; the 30-second default is only useful
  // when messages arrive in rapid succession (e.g. tool-approval flows or
  // high-frequency bots).
  idleTimeoutInSeconds: 0,

  // ------------------------------------------------------------------
  // Persistence: DB is the source of truth.
  // hydrateMessages replaces the built-in snapshot+replay accumulator.
  // It loads history from the DB on every turn, upserts the incoming
  // message, and returns the canonical chain to the runtime.
  //
  // Sandbox provisioning also lives here rather than in onChatStart.
  // Reason: with idleTimeoutInSeconds: 0 + hydrateMessages registered,
  // every run after the first is a continuation run, and onChatStart
  // does NOT fire on continuation runs. hydrateMessages fires on every
  // turn — including turn 0 of a brand-new chat — so it is the only
  // reliable place to run once-per-chat setup. createGameSandbox is
  // idempotent: it reads sandboxId first and returns immediately if the
  // sandbox already exists, so calling it every turn is safe.
  // ------------------------------------------------------------------
  hydrateMessages: async ({ chatId, trigger, incomingMessages }) => {
    // Provision the sandbox on turn 0 (no-op on all subsequent turns
    // because createGameSandbox checks sandboxId before creating).
    logger.log("CREATE GAME SANDBOX CALLED", { chatId })
    await createGameSandbox(chatId)

    const record = await db.query.games.findFirst({
      where: eq(games.id, chatId),
      columns: { messages: true },
    })
    const stored = record?.messages ?? []

    // upsertIncomingMessage handles submit-message, HITL continuations,
    // and skips persistence for regenerate/action turns automatically.
    if (upsertIncomingMessage(stored, { trigger, incomingMessages })) {
      await db
        .update(games)
        .set({ messages: stored })
        .where(eq(games.id, chatId))
    }

    return stored
  },

  // ------------------------------------------------------------------
  // After each turn: persist the full updated UIMessage[] and the
  // lastEventId cursor (used by the transport to skip already-seen
  // events on reconnect). Single atomic update — no race condition.
  // ------------------------------------------------------------------
  onTurnComplete: async ({ chatId, uiMessages, lastEventId }) => {
    await db
      .update(games)
      .set({ messages: uiMessages, lastEventId: lastEventId ?? null })
      .where(eq(games.id, chatId))
  },

  // ------------------------------------------------------------------
  // Per-turn run: identical to the old route handler's streamText call.
  // - messages arrive pre-converted (no convertToModelMessages needed)
  // - signal forwarded so Stop aborts the model server-side
  // - ...chat.toStreamTextOptions() MUST be spread first so compaction,
  //   mid-turn steering, background injection, and telemetry are wired
  // ------------------------------------------------------------------
  run: async ({ messages, signal }) =>
    streamText({
      ...chat.toStreamTextOptions(),
      model: google("gemini-3.5-flash-lite"),
      messages,
      abortSignal: signal,
    }),
})
