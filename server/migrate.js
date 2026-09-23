import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  join(__dirname, 'src/db/migrations/001_init.sql'),
  join(__dirname, 'src/db/migrations/002_users.sql'),
  join(__dirname, 'src/db/migrations/003_settings.sql'),
  join(__dirname, 'src/db/migrations/004_operator_role.sql'),
  join(__dirname, 'src/db/migrations/005_sync_failures.sql'),
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Registro de migraciones aplicadas para evitar re-ejecutar.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
    );

    // Baseline: si el esquema 001 ya existe (BD previa a este runner) pero no
    // está registrado, lo marcamos como aplicado para no intentar recrearlo.
    if (!applied.has('001_init.sql')) {
      const exists = await client.query(`SELECT to_regclass('public.gcp_projects') AS t`);
      if (exists.rows[0].t) {
        await client.query(
          `INSERT INTO schema_migrations (filename) VALUES ('001_init.sql') ON CONFLICT DO NOTHING`
        );
        applied.add('001_init.sql');
        console.log('Baseline detected: marked 001_init.sql as already applied');
      }
    }

    for (const file of migrations) {
      const name = basename(file);
      if (applied.has(name)) {
        console.log(`Skipping (already applied): ${name}`);
        continue;
      }
      console.log(`Running migration: ${name}`);
      const sql = readFileSync(file, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log('  Done');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
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
