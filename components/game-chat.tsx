"use client"

import { ChatPreview } from "@/components/chat-preview"
import { ChatThread } from "@/components/chat-thread"
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
  if (!sandboxId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatThread />
      </div>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={70}>
        <ChatThread />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30}>
        <ChatPreview gameId={gameId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export { GameChat }
