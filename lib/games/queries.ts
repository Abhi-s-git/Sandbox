import "server-only"

import { auth } from "@clerk/nextjs/server"
import { desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"

export async function listGames() {
  const { orgId } = await auth.protect()

  if (!orgId) {
    return []
  }

  return db.query.games.findMany({
    where: eq(games.orgId, orgId),
    orderBy: desc(games.createdAt),
    columns: {
      id: true,
      title: true,
    },
  })
}

export async function getGame(id: string) {
  const { orgId } = await auth.protect()

  if (!orgId) {
    return null
  }

  return db.query.games.findFirst({
    where: (t, { and }) => and(eq(t.id, id), eq(t.orgId, orgId)),
    columns: {
      id: true,
      title: true,
      messages: true,
    },
  })
}
