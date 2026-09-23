import { Router } from 'express';
import { generateExcel } from '../services/export.service.js';
import { validateQuery, exportQuerySchema } from '../middleware/validate.js';

const router = Router();

router.get('/excel', validateQuery(exportQuerySchema), async (req, res) => {
  const workbook = await generateExcel(req.validatedQuery);
  const filename = `csql-inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
