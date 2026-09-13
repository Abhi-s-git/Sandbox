"use client"

import Image from "next/image"

import { ChatComposer } from "@/components/chat-composer"
import { useChatContext } from "@/components/chat-provider"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

function ChatThread() {
  const { messages, status, sendMessage, stop } = useChatContext()

  // Disable text input and the submit action while a request is in-flight,
  // but keep the composer mounted so the stop button remains accessible.
  const isStreaming = status === "submitted" || status === "streaming"

  // Build a key for each position that is unique within this render.
  // When message.id is present and hasn't appeared yet, use it as-is so
  // React can reconcile existing DOM nodes. When it has already appeared
  // (duplicate persisted IDs) or is absent, fall back to `<id>:<index>`
  // or `msg-<index>` so the key is still stable relative to the list order.
  const seenIds = new Set<string>()
  const messageKeys = messages.map((message, index) => {
    if (message.id && !seenIds.has(message.id)) {
      seenIds.add(message.id)
      return message.id
    }
    return message.id ? `${message.id}:${index}` : `msg-${index}`
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-2xl px-4 py-6">
              {messages.map((message, index) => (
                <MessageScrollerItem
                  key={messageKeys[index]}
                  scrollAnchor={index === messages.length - 1}
                >
                  <Message align={message.role === "user" ? "end" : "start"}>
                    {message.role === "assistant" ? (
                      <MessageAvatar className="size-8 self-start rounded-lg bg-transparent">
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
                          variant={
                            message.role === "user" ? "secondary" : "ghost"
                          }
                        >
                          <BubbleContent>
                            {message.parts
                              .filter((part) => part.type === "text")
                              .map((part, i) => (
                                <span key={i}>
                                  {(part as { type: "text"; text: string }).text}
                                </span>
                              ))}
                          </BubbleContent>
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
          <ChatComposer
            onSubmit={(text) => sendMessage({ text })}
            onStop={stop}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  )
}

export { ChatThread }
