import { Router } from 'express';
import { getDashboardSummary } from '../services/dashboard.service.js';

const router = Router();

router.get('/summary', async (req, res) => {
  const data = await getDashboardSummary();
  res.json(data);
});

export default router;
