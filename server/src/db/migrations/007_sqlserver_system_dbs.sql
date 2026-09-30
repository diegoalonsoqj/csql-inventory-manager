-- Las BDs de sistema de SQL Server (master, model, msdb, tempdb) se guardaban
-- como BDs de usuario e inflaban el total de databases del dashboard. El sync
-- ya las marca; esto corrige las existentes, incluidas las de instancias
-- detenidas, cuyas BDs el sync no vuelve a leer. Idempotente.

UPDATE csql_databases d
SET is_system = true
FROM csql_instances i
WHERE i.id = d.instance_id
  AND i.engine = 'SQL Server'
  AND d.database_name IN ('master', 'model', 'msdb', 'tempdb')
  AND NOT d.is_system;
