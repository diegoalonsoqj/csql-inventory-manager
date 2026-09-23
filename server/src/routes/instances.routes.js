import { Router } from 'express';
import { listInstances, getInstance, getInstanceDatabases } from '../services/instance.service.js';
import { validateQuery, instancesQuerySchema } from '../middleware/validate.js';
import { query } from '../config/db.js';

const router = Router();

router.get('/filter-options', async (_req, res) => {
  const result = await query(`
    SELECT
      array_agg(DISTINCT environment ORDER BY environment) FILTER (WHERE environment IS NOT NULL) AS environments,
      array_agg(DISTINCT state       ORDER BY state)       FILTER (WHERE state IS NOT NULL)       AS states,
      array_agg(DISTINCT region      ORDER BY region)      FILTER (WHERE region IS NOT NULL)       AS regions
    FROM csql_instances
  `);
  res.json(result.rows[0]);
});

router.get('/', validateQuery(instancesQuerySchema), async (req, res) => {
  const result = await listInstances(req.validatedQuery);
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: { message: 'Invalid id' } });
  const instance = await getInstance(id);
  if (!instance) return res.status(404).json({ error: { message: 'Instance not found' } });
  res.json(instance);
});

router.get('/:id/databases', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: { message: 'Invalid id' } });
  const databases = await getInstanceDatabases(id);
  res.json(databases);
});

export default router;
