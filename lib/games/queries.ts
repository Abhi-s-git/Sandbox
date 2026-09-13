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
