import ExcelJS from 'exceljs';
import { query } from '../config/db.js';
import { buildWhereClause } from './instance.service.js';

export async function generateExcel(filters) {
  const { where, params } = buildWhereClause(filters);
  const result = await query(
    `SELECT project_id, instance_name, engine, database_version, region, state, tier,
            ip_primary::text, ip_private::text, ip_outgoing::text, ip_label,
            environment, application, info, service_account,
            ha_enabled, backup_enabled, storage_size_gb, data_disk_type, synced_at
     FROM csql_instances i
     ${where}
     ORDER BY project_id, instance_name`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CSQL Inventory Manager';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Instances', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Project ID', key: 'project_id', width: 30 },
    { header: 'Instance Name', key: 'instance_name', width: 35 },
    { header: 'Engine', key: 'engine', width: 15 },
    { header: 'DB Version', key: 'database_version', width: 25 },
    { header: 'Region', key: 'region', width: 20 },
    { header: 'State', key: 'state', width: 12 },
    { header: 'Tier', key: 'tier', width: 25 },
    { header: 'IP Primary', key: 'ip_primary', width: 18 },
    { header: 'IP Private', key: 'ip_private', width: 18 },
    { header: 'IP Outgoing', key: 'ip_outgoing', width: 18 },
    { header: 'IP Label', key: 'ip_label', width: 18 },
    { header: 'Environment', key: 'environment', width: 15 },
    { header: 'Application', key: 'application', width: 20 },
    { header: 'Info', key: 'info', width: 25 },
    { header: 'Service Account', key: 'service_account', width: 40 },
    { header: 'HA Enabled', key: 'ha_enabled', width: 12 },
    { header: 'Backup Enabled', key: 'backup_enabled', width: 15 },
    { header: 'Storage (GB)', key: 'storage_size_gb', width: 13 },
    { header: 'Disk Type', key: 'data_disk_type', width: 12 },
    { header: 'Synced At', key: 'synced_at', width: 22 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  result.rows.forEach((row, i) => {
    const r = sheet.addRow(row);
    r.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: i % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF' },
    };
    if (row.state === 'RUNNABLE') {
      r.getCell('state').font = { color: { argb: 'FF2E7D32' } };
    } else if (row.state === 'STOPPED') {
      r.getCell('state').font = { color: { argb: 'FFC62828' } };
    }
  });

  sheet.autoFilter = { from: 'A1', to: `T1` };

  return workbook;
}
