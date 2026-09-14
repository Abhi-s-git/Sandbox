import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai"
import { logger } from "@trigger.dev/sdk"
import { google } from "@ai-sdk/google"
import { eq } from "drizzle-orm"
import { streamText, stepCountIs } from "ai"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { createGameSandbox } from "@/lib/daytona/utils"
import { gameInstructions } from "@/lib/games/instructions"
import { buildGameTools } from "@/lib/games/tools"

export const gameChat = chat.agent({
  id: "game-chat",

  // Suspend immediately after each turn instead of staying warm for 30 s.
  // The run frees compute as soon as onTurnComplete finishes, and the next
  // user message boots a continuation run. This is correct for a chat that
  // receives messages at human pace; the 30-second default is only useful
  // when messages arrive in rapid succession (e.g. tool-approval flows or
  // high-frequency bots).
  idleTimeoutInSeconds: 0,

  // Per-turn tool resolution: chatId is required to resolve the correct
  // sandbox, and it is only available at turn time via ResolveToolsEvent.
  // Declaring tools here (not just on streamText) ensures each tool's
  // toModelOutput is re-applied when prior-turn history is re-converted.
  tools: ({ chatId }) => buildGameTools(chatId),

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
  // Per-turn run.
  // - tools read back typed from the payload (same set declared above)
  // - ...chat.toStreamTextOptions({ tools }) MUST be spread first so
  //   compaction, mid-turn steering, background injection, and telemetry
  //   are wired, and so the tool set survives cross-turn history replay
  // - stopWhen caps the agentic loop at 10 steps per turn
  // ------------------------------------------------------------------
  run: async ({ messages, tools, signal }) =>
    streamText({
      ...chat.toStreamTextOptions({ tools }),
      model: google("gemini-3.5-flash-lite"),
      system: gameInstructions.join("\n\n"),
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(10),
    }),
})
