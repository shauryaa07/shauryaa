import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "@shared/db-schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we should use Neon HTTP (serverless/edge) or node-postgres (traditional)
// Use Neon HTTP if:
// 1. Explicitly requested via USE_NEON_HTTP=true, OR
// 2. Running in Replit environment (REPLIT=true or REPL_ID exists)
const isReplit = process.env.REPLIT === "true" || !!process.env.REPL_ID;
const useNeonHttp = process.env.USE_NEON_HTTP === "true" || isReplit;

let db: NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

if (useNeonHttp) {
  // Use Neon HTTP driver for serverless/edge environments (Replit)
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleNeonHttp(sql, { schema });
  console.log("[DB] Using Neon HTTP driver (serverless mode)");
} else {
  // Use node-postgres driver for traditional Node.js environments (Render, etc.)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
  });
  
  db = drizzleNodePg(pool, { schema });
  console.log("[DB] Using node-postgres driver (traditional mode)");
}

export { db };
