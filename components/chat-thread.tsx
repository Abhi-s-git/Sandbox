"use client"

import Image from "next/image"

import { ChatComposer } from "@/components/chat-composer"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type Turn = {
  role: "assistant" | "user"
  text: string
}

const conversation: Turn[] = [
  {
    role: "assistant",
    text: "Hey! What kind of game are we building today?",
  },
  {
    role: "user",
    text: "A fast-paced voxel survival game with procedurally generated islands.",
  },
  {
    role: "assistant",
    text: "Love it. I'll start with the terrain generator and a day/night cycle.",
  },
  {
    role: "user",
    text: "Great, and make sure there's a grappling hook for traversal.",
  },
  {
    role: "assistant",
    text: "On it — adding the grappling hook and a crafting bench now.",
  },
]

function ChatThread() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl px-4 py-6">
              {conversation.map((turn, index) => (
                <MessageScrollerItem
                  key={index}
                  scrollAnchor={index === conversation.length - 1}
                >
                  <Message align={turn.role === "user" ? "end" : "start"}>
                    {turn.role === "assistant" ? (
                      <MessageAvatar className="size-8 bg-transparent self-start rounded-lg">
                        <Image  
                          src="/logo.svg"
                          alt="Sandbox"
                          width={32}
                          height={32}
                          className="size-8"
                        />
                      </MessageAvatar>
                    ) : null}
                    <MessageContent>
                      <BubbleGroup>
                        <Bubble
                          variant={turn.role === "user" ? "secondary" : "ghost"}
                        >
                          <BubbleContent>{turn.text}</BubbleContent>
                        </Bubble>
                      </BubbleGroup>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="shrink-0 px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <ChatComposer />
        </div>
      </div>
    </div>
  )
}

export { ChatThread }
