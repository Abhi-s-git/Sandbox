"use server"

import { auth } from "@clerk/nextjs/server"
import { refresh } from "next/cache"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export async function createGame(title: string) {
  const { orgId } = await auth.protect()

  if (!orgId) {
    throw new Error("An active organization is required to create a game")
  }

  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error("Title is required")
  }

  const [game] = await db
    .insert(games)
    .values({ orgId, title: trimmed })
    .returning()

  refresh()

  return game
}
