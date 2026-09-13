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

function ChatComposer() {
  const [title, setTitle] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(value: string) {
    const trimmed = value.trim()
    if (!trimmed || isPending) return
    startTransition(async () => {
      await createGame(trimmed)
      setTitle("")
    })
  }

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
            disabled={isPending}
          >
            <ArrowUpIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

export { ChatComposer }
