import { Router } from 'express';
import {
  getSettingsForAdmin,
  getPublicSettings,
  setTimezone,
  setServiceAccount,
  clearServiceAccount,
  parseAndValidateServiceAccount,
} from '../services/settings.service.js';
import { testGcpConnection } from '../services/gcp-sync.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateBody, updateSettingsSchema, testGcpSchema } from '../middleware/validate.js';

const router = Router();

// Lectura pública (cualquier usuario autenticado): solo zona horaria,
// necesaria para formatear fechas en el frontend.
router.get('/public', requireAuth, async (req, res) => {
  res.json(await getPublicSettings());
});

// A partir de aquí, todo requiere admin.
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  res.json(await getSettingsForAdmin());
});

router.put('/', validateBody(updateSettingsSchema), async (req, res) => {
  const { timezone, service_account_json } = req.validatedBody;

  if (timezone !== undefined) {
    await setTimezone(timezone, req.user.id);
  }

  if (service_account_json !== undefined) {
    if (service_account_json === null || service_account_json.trim() === '') {
      await clearServiceAccount(req.user.id);
    } else {
      await setServiceAccount(service_account_json, req.user.id);
    }
  }

  res.json(await getSettingsForAdmin());
});

// Prueba la credencial GCP (guardada o una provista sin guardar).
router.post('/gcp/test', validateBody(testGcpSchema), async (req, res) => {
  const { service_account_json } = req.validatedBody;
  let credentials = null;
  if (service_account_json) {
    credentials = parseAndValidateServiceAccount(service_account_json);
  }
  try {
    const result = await testGcpConnection(credentials);
    res.json(result);
  } catch (err) {
    // Fallo de credencial/red: se reporta como 400 con el detalle de GCP.
    res.status(400).json({ error: { message: `La prueba falló: ${err.message}` } });
  }
});

export default router;
