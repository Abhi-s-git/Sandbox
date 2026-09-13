import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import type { UIMessage } from "ai"

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    messages: jsonb("messages").$type<UIMessage[]>().notNull().default([]),
    /** Daytona sandbox ID provisioned for this game */
    sandboxId: text("sandbox_id"),
    /** Stream resume cursor — persisted by onTurnComplete alongside messages */
    lastEventId: text("last_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index("games_org_id_idx").on(table.orgId)]
)
