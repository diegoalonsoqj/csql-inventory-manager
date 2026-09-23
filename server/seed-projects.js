import ExcelJS from 'exceljs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../base/base_gcp.xlsx');
const sheet = wb.getWorksheet('proyectos_gcp');

const projects = [];
for (let i = 2; i <= sheet.rowCount; i++) {
  const row = sheet.getRow(i).values;
  if (row[3]) {
    projects.push({ nombre: row[2], project_id: row[3] });
  }
}

const client = await pool.connect();
try {
  for (const p of projects) {
    await client.query(
      `INSERT INTO gcp_projects (project_name, project_id, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (project_id) DO UPDATE SET project_name = EXCLUDED.project_name, is_active = true`,
      [p.nombre, p.project_id]
    );
    console.log(`  + ${p.project_id} (${p.nombre})`);
  }
  console.log(`\n${projects.length} proyectos insertados.`);
} finally {
  client.release();
  await pool.end();
}
