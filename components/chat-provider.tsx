"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useChat } from "@ai-sdk/react"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { UIMessage } from "ai"
// import type only — never executes server-side bundle in the browser
import type { gameChat } from "@/src/trigger/chat"
import { mintGameChatToken, startGameChatSession } from "@/lib/games/chat-actions"

type ChatContextValue = {
  gameId: string
  messages: ReturnType<typeof useChat>["messages"]
  status: ReturnType<typeof useChat>["status"]
  sendMessage: ReturnType<typeof useChat>["sendMessage"]
  /**
   * Stops the current generation. Sends the stop signal to the backend task
   * (via transport.stopGeneration) AND updates the frontend status (via
   * useChat's stop). Both must be called together per the Trigger.dev docs.
   */
  stop: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

type ChatProviderProps = {
  children: ReactNode
  gameId: string
  /** Persisted messages loaded from the DB — seeds the hook on first render */
  initialMessages?: UIMessage[]
  /** If provided and no stored messages exist, this prompt is sent on mount */
  initialPrompt?: string
}

function ChatProvider({
  children,
  gameId,
  initialMessages,
  initialPrompt,
}: ChatProviderProps) {
  const seeded = useRef(false)

  // gameId is the stable externalId that keys the Trigger.dev Session.
  const transport = useTriggerChatTransport<typeof gameChat>({
    task: "game-chat",
    // Pure token refresh — called on 401/403, never creates a session.
    accessToken: ({ chatId }) => mintGameChatToken(chatId),
    // Creates (or idempotently resumes) the Session and returns its PAT.
    startSession: ({ chatId, clientData }) =>
      startGameChatSession({ chatId, clientData }),
  })

  const { messages, status, sendMessage, stop: aiStop } = useChat({
    id: gameId,
    messages: initialMessages,
    transport,
    // Resume the SSE stream on mount when there are persisted messages —
    // uses lastEventId from the transport's cached session state to skip
    // already-seen events and reconnect to an in-progress turn if one exists.
    resume: !!initialMessages && initialMessages.length > 0,
  })

  // Combine the two required stop calls:
  // 1. transport.stopGeneration — sends the stop signal to the backend task,
  //    aborting the server-side streamText call and closing the SSE connection.
  //    Required even after a page refresh (useChat's own stop() isn't enough).
  // 2. aiStop — updates the frontend status to "ready" and fires onFinish.
  const stop = useCallback(() => {
    transport.stopGeneration(gameId)
    aiStop()
  }, [transport, gameId, aiStop])

  // Send the initial prompt exactly once — only when there are no stored messages.
  // The cleanup resets the flag so React Strict Mode's double-invoke doesn't
  // consume the one allowed fire on the throw-away mount and skip the real one.
  useEffect(() => {
    if (initialPrompt && !seeded.current && (!initialMessages || initialMessages.length === 0)) {
      seeded.current = true
      sendMessage({ text: initialPrompt })
    }
    return () => {
      seeded.current = false
    }
  // initialMessages is a stable array reference from the server — safe to omit
  // from deps. Only initialPrompt and sendMessage need to be tracked.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, sendMessage])

  return (
    <ChatContext.Provider value={{ gameId, messages, status, sendMessage, stop }}>
      {children}
    </ChatContext.Provider>
  )
}

function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error("useChatContext must be used inside <ChatProvider>")
  }
  return ctx
}

export { ChatProvider, useChatContext }
export type { UIMessage }
