"use client"

import { useState, useTransition } from "react"

import {
  ArrowUpIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  SquareIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { createGame } from "@/lib/games/action"

type ChatComposerProps = {
  /**
   * Called with the trimmed text after a new game is created (home page flow).
   * When omitted, ChatComposer sends directly via the ChatProvider context
   * (game detail page flow — no createGame call).
   */
  onGameCreated?: (title: string, game: { id: string }) => void
  /**
   * When true, skip createGame entirely and call onSubmit directly.
   * Used inside an existing game's chat thread.
   */
  onSubmit?: (text: string) => void
  /**
   * Called when the stop button is pressed while the model is generating.
   * Wires transport.stopGeneration + useChat stop together (from ChatProvider).
   * Only relevant when `isStreaming` is true.
   */
  onStop?: () => void
  /**
   * Whether the model is currently generating a response.
   * When true the submit button becomes a stop button (SquareIcon).
   * The textarea is also disabled so the user cannot edit mid-stream.
   */
  isStreaming?: boolean
  disabled?: boolean
}

function ChatComposer({
  onGameCreated,
  onSubmit,
  onStop,
  isStreaming = false,
  disabled,
}: ChatComposerProps) {
  const [title, setTitle] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(value: string) {
    const trimmed = value.trim()
    if (!trimmed || isPending || disabled) return

    if (onSubmit) {
      // In-game composer: send directly, no game creation
      onSubmit(trimmed)
      setTitle("")
      return
    }

    // Home page: create a new game, then notify parent
    startTransition(async () => {
      const game = await createGame(trimmed)
      setTitle("")
      onGameCreated?.(trimmed, game)
    })
  }

  const isDisabled = isPending || disabled

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        // While streaming the form submit does nothing — the stop button
        // handles the cancel via its own onClick handler.
        if (!isStreaming) {
          submit(title)
        }
      }}
    >
      <InputGroup className="items-stretch">
        <InputGroupTextarea
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Describe the game you want to build..."
          disabled={isDisabled || isStreaming}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
              <LayoutGridIcon />
              Kimi K3
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Kimi K3</DropdownMenuItem>
              <DropdownMenuItem>Kimi K3 Turbo</DropdownMenuItem>
              <DropdownMenuItem>GPT-4o</DropdownMenuItem>
              <DropdownMenuItem>Claude Sonnet</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <SquareIcon />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={isDisabled}
              aria-label="Send message"
            >
              <ArrowUpIcon />
            </Button>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

export { ChatComposer }
