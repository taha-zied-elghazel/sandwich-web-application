import sqlite from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sandwich.db');

const db = new sqlite.Database(dbPath, err => {
  if (err) throw err;
});

db.run('PRAGMA foreign_keys = ON');

export default db;
