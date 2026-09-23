/**
 * Crea (o promueve) un usuario administrador.
 *
 * Uso interactivo:
 *   npm run create-admin
 *
 * Uso con argumentos (no interactivo):
 *   node --env-file=../.env create-admin.js --email=admin@example.com --name="Admin" --password="secreto123"
 *
 * Si el correo ya existe, lo promueve a admin, lo reactiva y actualiza la
 * contraseña si se proporcionó una.
 */
import { createInterface } from 'readline';
import { stdin, stdout } from 'process';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function ask(rl, question, { hide = false } = {}) {
  return new Promise((resolve) => {
    if (!hide) return rl.question(question, resolve);
    // Ocultar entrada (contraseña): silencia el eco.
    const onData = (char) => {
      const s = char.toString();
      if (s === '\n' || s === '\r' || s === '') stdin.removeListener('data', onData);
      else stdout.write('\x1b[2K\x1b[200D' + question + '*'.repeat(rl.line.length));
    };
    stdin.on('data', onData);
    rl.question(question, (value) => {
      stdin.removeListener('data', onData);
      stdout.write('\n');
      resolve(value);
    });
  });
}

async function main() {
  const args = parseArgs();
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  let { email, name, password } = args;

  const needsPrompt = !email || !name || !password;
  let rl;
  if (needsPrompt) {
    rl = createInterface({ input: stdin, output: stdout });
    if (!email) email = await ask(rl, 'Correo del admin: ');
    if (!name) name = await ask(rl, 'Nombre completo: ');
    if (!password) password = await ask(rl, 'Contraseña (mín. 8): ', { hide: true });
    rl.close();
  }

  email = (email ?? '').trim().toLowerCase();
  name = (name ?? '').trim();

  if (!email || !name || !password) {
    console.error('Error: email, name y password son obligatorios.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Error: la contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const password_hash = await bcrypt.hash(password, bcryptRounds);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET
         role = 'admin',
         is_active = true,
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash
       RETURNING id, email, full_name, role, (xmax = 0) AS inserted`,
      [email, password_hash, name]
    );
    const row = result.rows[0];
    console.log(`\n✔ Administrador ${row.inserted ? 'creado' : 'actualizado'}: ${row.email} (${row.full_name})`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Falló la creación del admin:', err.message);
  process.exit(1);
});
