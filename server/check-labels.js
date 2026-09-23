import { query } from './src/config/db.js';

// Check instance-level collation in labels (SQL Server)
const r1 = await query(`
  SELECT instance_name, engine, labels_raw->>'collation' AS collation
  FROM csql_instances
  WHERE labels_raw->>'collation' IS NOT NULL
  LIMIT 5
`);
console.log('Instancias con collation en labels:', r1.rows);

// Check distinct charset/collation in databases
const r2 = await query(`
  SELECT DISTINCT charset, "collation" FROM csql_databases
  WHERE charset IS NOT NULL LIMIT 10
`);
console.log('Charset/collation en databases:', r2.rows);

process.exit(0);
