"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"

type ChatContextValue = {
  messages: ReturnType<typeof useChat>["messages"]
  status: ReturnType<typeof useChat>["status"]
  sendMessage: ReturnType<typeof useChat>["sendMessage"]
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

  const { messages, status, sendMessage } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Send gameId with every request so the route can persist the thread
      body: { gameId },
    }),
  })

  // Send the initial prompt exactly once — only when there are no stored messages
  useEffect(() => {
    if (initialPrompt && !seeded.current && (!initialMessages || initialMessages.length === 0)) {
      seeded.current = true
      sendMessage({ text: initialPrompt })
    }
  }, [initialPrompt, initialMessages, sendMessage])

  return (
    <ChatContext.Provider value={{ messages, status, sendMessage }}>
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
