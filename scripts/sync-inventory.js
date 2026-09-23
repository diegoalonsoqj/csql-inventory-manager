#!/usr/bin/env node
import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const args = process.argv.slice(2);

if (args.includes('--seed-projects')) {
  const seedFile = join(__dirname, '../server/src/db/seed/seed_projects.sql');
  const sql = readFileSync(seedFile, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Projects seeded successfully.');
  } finally {
    client.release();
    await pool.end();
  }
} else if (args.includes('--sync')) {
  // Trigger sync via API (server must be running)
  const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:3001/api';
  const res = await fetch(`${apiUrl}/sync`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    console.error('Sync failed:', data.error?.message);
    process.exit(1);
  }
  console.log('Sync triggered:', data);
  await pool.end();
} else {
  console.log('Usage:');
  console.log('  node scripts/sync-inventory.js --seed-projects   Seed projects from seed_projects.sql');
  console.log('  node scripts/sync-inventory.js --sync             Trigger sync via API');
  await pool.end();
}
