/**
 * Initialize database schema by executing model/init.sql on startup.
 * - Strips comments and executes statements sequentially (no multipleStatements needed)
 * - Safe to run repeatedly thanks to IF NOT EXISTS in DDL
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const mysql = require('mysql2/promise');

function splitSqlStatements(sqlText) {
  // Remove BOM
  let sql = sqlText.replace(/^\uFEFF/, '');
  // Remove block comments /* ... */
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments starting with -- (tolerate leading spaces)
  sql = sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  // Normalize line endings
  sql = sql.replace(/\r\n/g, '\n');
  // Split on semicolon followed by line break or end of string
  const parts = sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

async function initDb() {
  try {
    // Ensure database exists even if pool was configured with a non-existing DB
    try {
      const conn = await db.getConnection();
      conn.release();
    } catch (err) {
      if (err && err.code === 'ER_BAD_DB_ERROR') {
        const {
          DB_HOST = 'localhost',
          DB_USER = 'root',
          DB_PASSWORD = 'password',
          DB_PORT = 3306,
          DB_NAME = 'app_db'
        } = process.env;
        console.warn(`[init_db] Database ${DB_NAME} not found. Creating...`);
        const conn = await mysql.createConnection({
          host: DB_HOST,
          user: DB_USER,
          password: DB_PASSWORD,
          port: DB_PORT
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        await conn.end();
        console.log(`[init_db] Database ${DB_NAME} ensured.`);
      } else {
        throw err;
      }
    }

    const initPath = path.join(__dirname, '..', 'model', 'init.sql');
    if (!fs.existsSync(initPath)) {
      console.warn(`[init_db] init.sql not found at ${initPath}, skip.`);
      return;
    }

  const raw = fs.readFileSync(initPath, 'utf8');
  const dbName = process.env.DB_NAME || 'app_db';
  // Normalize `USE <db>;` to match configured DB_NAME to avoid mismatches
  const normalized = raw.replace(/^[\t\s]*USE\s+[^;]+;/im, `USE ${dbName};`);
  const statements = splitSqlStatements(normalized);

    console.log(`[init_db] Found ${statements.length} SQL statements to run`);

    for (const [idx, stmt] of statements.entries()) {
      if (!stmt) continue;
      try {
        // Some clients already connected to the right DB; executing USE is harmless
        await db.query(stmt);
      } catch (err) {
        // Log statement index for easier debugging
        console.error(`[init_db] Statement ${idx + 1} failed:`, err.message);
        throw err;
      }
    }

    console.log('[init_db] Database schema initialized successfully');
  } catch (e) {
    console.error('[init_db] Initialization failed:', e.message);
    throw e;
  }
}

module.exports = { initDb };
