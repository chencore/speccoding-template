import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = dirname(config.databasePath);
mkdirSync(dbDir, { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

export function initDb() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);
}
