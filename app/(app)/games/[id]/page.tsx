import { notFound } from "next/navigation"
import { ChatProvider } from "@/components/chat-provider"
import { ChatThread } from "@/components/chat-thread"
import { getGame } from "@/lib/games/queries"

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ prompt?: string }>
}) {
  const { id } = await params
  const { prompt } = await searchParams
  const game = await getGame(id)

  if (!game) {
    notFound()
  }

  // Only seed the initial prompt when there are no persisted messages yet.
  // On subsequent loads (reload, re-open) the stored history takes over.
  const initialPrompt =
    game.messages.length === 0 ? (prompt ?? game.title) : undefined

  return (
    <ChatProvider
      gameId={game.id}
      initialMessages={game.messages}
      initialPrompt={initialPrompt}
    >
      <ChatThread />
    </ChatProvider>
  )
}
