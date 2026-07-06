import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  try {
    const client = await pool.connect();
    try {
      await client.query(sql);
      // Auto-populate slugs for any existing businesses that don't have one
      await client.query(`
        UPDATE businesses 
        SET slug = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTR(id::text, 1, 8)
        WHERE slug IS NULL
      `);
      console.log("✅ Database migration applied successfully.");
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("❌ Database migration failed:", err.message);
    throw err;
  }
}
