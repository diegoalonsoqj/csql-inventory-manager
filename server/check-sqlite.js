import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../base/base_gcp.db'), { readonly: true });

// Ver las tablas disponibles
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tablas:', tables.map(t => t.name));

// Ver estructura y datos de cada tabla
for (const { name } of tables) {
  const rows = db.prepare(`SELECT * FROM ${name} LIMIT 3`).all();
  if (rows.length > 0) {
    console.log(`\n=== ${name} ===`);
    console.log('Columnas:', Object.keys(rows[0]));
    console.log('Ejemplo:', rows[0]);
  }
}

db.close();
