//settingg data base
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

//my database path it holds
const DB_PATH = path.join(process.cwd(), 'queue.db');

let db = null;

async function getDb() {
  if (db) return db;

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  //builds the dadabase
  await db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      run_at DATETIME NOT NULL DEFAULT (datetime('now')),
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  //default data seeding
  await db.run(
    `INSERT OR IGNORE INTO config (key, value) VALUES ('max_retries', '3'), ('backoff_base', '2')`
  );

  return db;
}

module.exports = { getDb };