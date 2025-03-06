import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision
} from "drizzle-orm/pg-core"

export const deedsTable = pgTable("deeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  impact: integer("impact").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertDeed = typeof deedsTable.$inferInsert
export type SelectDeed = typeof deedsTable.$inferSelect
