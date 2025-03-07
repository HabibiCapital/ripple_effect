import { deedsTable, profilesTable } from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  deeds: deedsTable
}

const client = postgres(process.env.DATABASE_URL!, {
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
})

export const db = drizzle(client, { schema })
