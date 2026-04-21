import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL connected");
    conn.release();
  } catch (err) {
    console.error("MySQL connection failed:", err);
    process.exit(1);
  }
}

export async function checkDB() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "down",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// export pool
export default pool;
