import Image from "next/image"
import { auth } from "@clerk/nextjs/server"
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

async function createGameFromSuggestion(formData: FormData) {
  "use server"
  await createGame(String(formData.get("title") ?? ""))
}

export default async function Page() {
  await auth.protect()

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
          <ChatComposer />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map(({ icon: Icon, label }) => (
              <form key={label} action={createGameFromSuggestion}>
                <input type="hidden" name="title" value={label} />
                <Button type="submit" variant="outline" size="sm">
                  <Icon />
                  {label}
                </Button>
              </form>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </>
  )
}
