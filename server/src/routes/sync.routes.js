import { Router } from 'express';
import { runSync, getLastSyncStatus } from '../services/gcp-sync.service.js';
import { syncRateLimiter } from '../middleware/rate-limiter.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

let syncInProgress = false;

// Disparar sync: admin y operator. Consultar estado: cualquier autenticado.
router.post('/', requireRole('admin', 'operator'), syncRateLimiter, async (req, res) => {
  if (syncInProgress) {
    return res.status(409).json({ error: { message: 'Sync already in progress' } });
  }
  syncInProgress = true;
  res.json({ message: 'Sync started', timestamp: new Date().toISOString() });

  runSync()
    .catch((err) => console.error('[SYNC] Failed:', err.message))
    .finally(() => { syncInProgress = false; });
});

router.get('/status', async (req, res) => {
  const status = await getLastSyncStatus();
  res.json({ inProgress: syncInProgress, lastSync: status });
});

export default router;
