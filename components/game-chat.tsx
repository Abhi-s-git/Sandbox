"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const prevRevision = useRef(revision)

  // When the page rendered with sandboxId=null (sandbox not yet created),
  // watch for the first completed turn. That is when Trigger.dev will have
  // saved the sandboxId to the DB. Calling router.refresh() re-runs the
  // Server Component so page.tsx re-fetches getGame() and passes the new
  // sandboxId down — making the preview transition to the real game without
  // a manual reload.
  useEffect(() => {
    if (sandboxId === null && revision > prevRevision.current) {
      router.refresh()
    }
    prevRevision.current = revision
  }, [revision, sandboxId, router])

  // Always render the split layout. ChatPreview handles the sandboxId=null
  // state itself by showing a "New game" placeholder instead of loading
  // the Daytona preview. This ensures the Preview panel is always visible.
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
        <ChatPreview gameId={gameId} sandboxId={sandboxId} revision={revision} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export { GameChat }
