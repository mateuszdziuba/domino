import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? resolve(process.cwd(), "data/domino.db");

const dbPath = resolve(DATABASE_URL);
mkdirSync(dirname(dbPath), { recursive: true });

export const sqlite: DatabaseType = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
