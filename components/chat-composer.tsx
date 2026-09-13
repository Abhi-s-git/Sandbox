"use client"

import { useState, useTransition } from "react"

import {
  ArrowUpIcon,
  ChevronDownIcon,
  LayoutGridIcon,
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
  disabled?: boolean
}

function ChatComposer({ onGameCreated, onSubmit, disabled }: ChatComposerProps) {
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
        submit(title)
      }}
    >
      <InputGroup className="items-stretch">
        <InputGroupTextarea
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Describe the game you want to build..."
          disabled={isDisabled}
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
          <Button
            type="submit"
            size="icon"
            className="rounded-full"
            disabled={isDisabled}
          >
            <ArrowUpIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

export { ChatComposer }
