import { Router } from 'express';
import { startSync, isSyncInProgress, getLastSyncStatus } from '../services/gcp-sync.service.js';
import { syncRateLimiter } from '../middleware/rate-limiter.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Disparar sync: admin y operator. Consultar estado: cualquier autenticado.
router.post('/', requireRole('admin', 'operator'), syncRateLimiter, async (req, res) => {
  if (!startSync('manual')) {
    return res.status(409).json({ error: { message: 'Sync already in progress' } });
  }
  res.json({ message: 'Sync started', timestamp: new Date().toISOString() });
});

router.get('/status', async (req, res) => {
  const status = await getLastSyncStatus();
  res.json({ inProgress: isSyncInProgress(), lastSync: status });
});

export default router;
