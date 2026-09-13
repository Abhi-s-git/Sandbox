"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { auth } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"

import type { gameChat } from "@/src/trigger/chat"

// The SDK action — not exported directly so we can gate it with auth below.
const _createSession = chat.createStartSessionAction<typeof gameChat>("game-chat")

/**
 * Creates (or idempotently resumes) the Trigger.dev Session for a game chat.
 * The transport calls this the first time a chatId is used, then caches the PAT.
 *
 * Guards with Clerk auth before delegating to the SDK helper — the same check
 * that lived in the deleted route handler.
 */
export async function startGameChatSession(
  ...args: Parameters<typeof _createSession>
): Promise<Awaited<ReturnType<typeof _createSession>>> {
  const { userId, orgId } = await clerkAuth()

  if (!userId || !orgId) {
    throw new Error("Unauthorized")
  }

  return _createSession(...args)
}

/**
 * Mints a fresh session-scoped public access token for the given chatId.
 * The transport calls this on 401/403 to refresh an expired token.
 *
 * Never exposed to the browser as the secret key — this runs server-side only.
 */
export async function mintGameChatToken(chatId: string): Promise<string> {
  const { userId, orgId } = await clerkAuth()

  if (!userId || !orgId) {
    throw new Error("Unauthorized")
  }

  return auth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}
