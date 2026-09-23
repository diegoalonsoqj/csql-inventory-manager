#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  join(__dirname, '../server/src/db/migrations/001_init.sql'),
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const file of migrations) {
      console.log(`Running migration: ${file}`);
      const sql = readFileSync(file, 'utf8');
      await client.query(sql);
      console.log('  ✓ Done');
    }
    console.log('\nAll migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
