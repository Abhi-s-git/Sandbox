import { ChatThread } from "@/components/chat-thread"

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params

  return <ChatThread />
}
