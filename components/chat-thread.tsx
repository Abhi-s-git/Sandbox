"use client"

import Image from "next/image"
import { Check, CircleSlash, Clock, Loader, X } from "lucide-react"

import { ChatComposer } from "@/components/chat-composer"
import { useChatContext } from "@/components/chat-provider"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

// ── Tool-call states from AI SDK v7 UIToolInvocation ─────────────────────────
type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"

interface ToolPart {
  type: string // "tool-write_file", "tool-replace_text", etc.
  toolCallId: string
  toolName: string
  state: ToolState
  errorText?: string
}

/** Turn a snake_case tool name into a readable label, e.g. "write_file" → "Write file" */
function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function ToolCallMarker({ part }: { part: ToolPart }) {
  const label = formatToolName(part.toolName)

  switch (part.state) {
    // ── Done ────────────────────────────────────────────────────────────────
    case "output-available":
      return (
        <Marker>
          <MarkerIcon>
            <Check className="text-emerald-500" />
          </MarkerIcon>
          <MarkerContent className="text-emerald-600 dark:text-emerald-400">
            {label}
          </MarkerContent>
        </Marker>
      )

    // ── Failed ───────────────────────────────────────────────────────────────
    case "output-error":
      return (
        <Marker>
          <MarkerIcon>
            <X className="text-destructive" />
          </MarkerIcon>
          <MarkerContent className="text-destructive">
            {label}
            {part.errorText ? (
              <span className="ml-1 font-normal text-muted-foreground">
                — {part.errorText}
              </span>
            ) : null}
          </MarkerContent>
        </Marker>
      )

    // ── Denied ───────────────────────────────────────────────────────────────
    case "output-denied":
      return (
        <Marker>
          <MarkerIcon>
            <CircleSlash className="text-muted-foreground" />
          </MarkerIcon>
          <MarkerContent className="text-muted-foreground line-through">
            {label}
          </MarkerContent>
        </Marker>
      )

    // ── Waiting for approval ──────────────────────────────────────────────────
    case "approval-requested":
      return (
        <Marker>
          <MarkerIcon>
            <Clock className="text-amber-500" />
          </MarkerIcon>
          <MarkerContent className="text-amber-600 dark:text-amber-400">
            {label}
            <span className="ml-1 font-normal text-muted-foreground">
              — awaiting approval
            </span>
          </MarkerContent>
        </Marker>
      )

    // ── Approval decided, running ─────────────────────────────────────────────
    case "approval-responded":
    // ── Active / streaming ────────────────────────────────────────────────────
    case "input-streaming":
    case "input-available":
    default:
      return (
        <Marker>
          <MarkerIcon>
            <Loader className="animate-spin text-muted-foreground" />
          </MarkerIcon>
          <MarkerContent>{label}</MarkerContent>
        </Marker>
      )
  }
}

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
              {messages.map((message, index) => {
                // Collect tool parts for assistant messages
                const toolParts =
                  message.role === "assistant"
                    ? (message.parts.filter(
                        (p) =>
                          p.type.startsWith("tool-") &&
                          "toolName" in p &&
                          "state" in p,
                      ) as unknown as ToolPart[])
                    : []

                // Collect text parts
                const textParts = message.parts.filter(
                  (p) => p.type === "text",
                )

                return (
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
                        {/* Tool call markers — shown for assistant messages only */}
                        {toolParts.length > 0 ? (
                          <div className="mb-1 flex flex-col gap-0.5">
                            {toolParts.map((part) => (
                              <ToolCallMarker
                                key={part.toolCallId}
                                part={part}
                              />
                            ))}
                          </div>
                        ) : null}

                        {/* Text bubble — only rendered when there is text */}
                        {textParts.length > 0 ? (
                          <BubbleGroup>
                            <Bubble
                              variant={
                                message.role === "user" ? "secondary" : "ghost"
                              }
                            >
                              <BubbleContent>
                                {textParts.map((part, i) => (
                                  <span key={i}>
                                    {
                                      (
                                        part as {
                                          type: "text"
                                          text: string
                                        }
                                      ).text
                                    }
                                  </span>
                                ))}
                              </BubbleContent>
                            </Bubble>
                          </BubbleGroup>
                        ) : null}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )
              })}
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
