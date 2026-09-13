import { after } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { google } from "@ai-sdk/google"
import { and, eq } from "drizzle-orm"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export async function POST(request: Request) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, gameId }: { messages: UIMessage[]; gameId: string } =
    await request.json()

  const result = streamText({
    model: google("gemini-3.5-flash-lite"),
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Providing originalMessages puts the stream in "persistence mode":
      // the onFinish callback then receives the full updated thread
      // (original user + assistant messages) rather than only the new response.
      originalMessages: messages,
      onFinish: ({ messages: updatedMessages }) => {
        // Persist the full updated thread after the stream has been delivered
        after(async () => {
          await db
            .update(games)
            .set({ messages: updatedMessages })
            .where(and(eq(games.id, gameId), eq(games.orgId, orgId)))
        })
      },
    }),
  })
}
