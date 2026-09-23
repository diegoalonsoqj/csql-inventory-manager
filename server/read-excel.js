import ExcelJS from 'exceljs';
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../base/base_gcp.xlsx');
const sheet = wb.getWorksheet('proyectos_gcp');
console.log('Total rows:', sheet.rowCount);
for (let i = 2; i <= sheet.rowCount; i++) {
  const row = sheet.getRow(i).values;
  console.log(JSON.stringify({ id: row[1], nombre: row[2], project_id: row[3], estado: row[4] }));
}
