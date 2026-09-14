"use client"

import { ChatPreview } from "@/components/chat-preview"
import { ChatThread } from "@/components/chat-thread"
import { useChatContext } from "@/components/chat-provider"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

interface GameChatProps {
  gameId: string
  sandboxId: string | null
}

function GameChat({ gameId, sandboxId }: GameChatProps) {
  const { revision } = useChatContext()

  if (!sandboxId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatThread />
      </div>
    )
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 flex-1 overflow-hidden"
    >
      <ResizablePanel defaultSize={70} className="min-h-0 overflow-hidden">
        <ChatThread />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30}>
        <ChatPreview gameId={gameId} revision={revision} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export { GameChat }
