import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { google } from "@ai-sdk/google"
import { eq } from "drizzle-orm"
import { streamText } from "ai"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export const gameChat = chat.agent({
  id: "game-chat",

  // ------------------------------------------------------------------
  // Persistence: DB is the source of truth.
  // hydrateMessages replaces the built-in snapshot+replay accumulator.
  // It loads history from the DB on every turn, upserts the incoming
  // message, and returns the canonical chain to the runtime.
  // ------------------------------------------------------------------
  hydrateMessages: async ({ chatId, trigger, incomingMessages }) => {
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
