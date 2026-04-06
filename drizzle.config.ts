import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_DATABASE_URL ?? "file:.data/local.db";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: tursoUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
