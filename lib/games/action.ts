"use server"

import { auth } from "@clerk/nextjs/server"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { refresh } from "next/cache"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export async function createGame(prompt: string) {
  const { orgId } = await auth.protect()

  if (!orgId) {
    throw new Error("An active organization is required to create a game")
  }

  const trimmed = prompt.trim()
  if (!trimmed) {
    throw new Error("A prompt is required")
  }

  // Generate a short sidebar-friendly title from the user's prompt
  const { text: generatedTitle } = await generateText({
    model: google("gemini-3.5-flash-lite"),
    prompt: `Generate a short, concise title (5 words or fewer) for a game based on this description. Reply with the title only, no punctuation, no quotes.\n\nDescription: ${trimmed}`,
  })

  const title = generatedTitle.trim() || trimmed

  const [game] = await db
    .insert(games)
    .values({ orgId, title })
    .returning()

  refresh()

  return game
}
