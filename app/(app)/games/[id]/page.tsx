import { notFound } from "next/navigation"
import { ChatProvider } from "@/components/chat-provider"
import { ChatThread } from "@/components/chat-thread"
import { getGame } from "@/lib/games/queries"

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const game = await getGame(id)

  if (!game) {
    notFound()
  }

  return (
    <ChatProvider
      gameId={game.id}
      initialMessages={game.messages}
      initialPrompt={game.title}
    >
      <ChatThread />
    </ChatProvider>
  )
}
