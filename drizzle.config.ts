import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Drizzle Kit config for database migrations
// This works with any PostgreSQL database connection string
// Note: The runtime db connection (server/db.ts) may use either:
//   - Neon HTTP driver (serverless/Replit)
//   - node-postgres driver (traditional hosting like Render)
// But migrations always use the standard PostgreSQL protocol
export default defineConfig({
  out: "./migrations",
  schema: "./shared/db-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
