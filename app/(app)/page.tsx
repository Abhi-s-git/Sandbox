"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ChatComposer } from "@/components/chat-composer"
import { createGame } from "@/lib/games/action"
import { suggestions } from "@/lib/games/suggestions"

export default function Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleGameCreated(prompt: string, game: { id: string }) {
    router.push(`/games/${game.id}?prompt=${encodeURIComponent(prompt)}`)
  }

  function handleSuggestion(label: string) {
    startTransition(async () => {
      const game = await createGame(label)
      router.push(`/games/${game.id}?prompt=${encodeURIComponent(label)}`)
    })
  }

  return (
    <>
      <Empty className="min-h-dvh">
        <EmptyHeader>
          <EmptyMedia>
            <Image
              src="/logo.svg"
              alt="Logo"
              width={48}
              height={48}
              priority
            />
          </EmptyMedia>
          <EmptyTitle className="text-2xl">What should we build today?</EmptyTitle>
          <EmptyDescription>
            Build your own racers, shooters, puzzles and whole worlds using your
            own words. If you can describe it, you can play it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-xl gap-6">
          <ChatComposer onGameCreated={handleGameCreated} />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleSuggestion(label)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </>
  )
}
