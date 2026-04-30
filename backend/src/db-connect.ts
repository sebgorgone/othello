import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")});

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "../../othello.db");

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -64000");
db.pragma("foreign_keys = ON");

db.defaultTimeout = 5000;

function initializeSchema() {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      w TEXT,
      b TEXT,
      turnCount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS squares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      value TEXT,
      UNIQUE(game_id, x, y),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bValidMoves (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      UNIQUE(game_id, x, y),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wValidMoves (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      UNIQUE(game_id, x, y),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `;

  const statements = schemaSQL.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err) {
    }
  }
}

export function initDB() {
  try {
    initializeSchema();
    db.prepare("SELECT 1").get();
    console.log("SQLite database initialized and connected");
  } catch (err) {
    console.error("SQLite connection failed:", err);
    process.exit(1);
  }
}

export function checkDB() {
  try {
    db.prepare("SELECT 1").get();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "down",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default db;
