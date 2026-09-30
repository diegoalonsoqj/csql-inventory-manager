import { Router } from 'express';
import {
  getSettingsForAdmin,
  getPublicSettings,
  setTimezone,
  setServiceAccount,
  clearServiceAccount,
  parseAndValidateServiceAccount,
  getAdConfig,
  setAdConfig,
} from '../services/settings.service.js';
import { testGcpConnection } from '../services/gcp-sync.service.js';
import { adAuthenticate, normalizeAdUsername } from '../services/ad.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { adTestRateLimiter } from '../middleware/rate-limiter.js';
import { validateBody, updateSettingsSchema, testGcpSchema, testAdSchema } from '../middleware/validate.js';

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
  const { timezone, service_account_json, ad } = req.validatedBody;

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

  if (ad !== undefined) {
    await setAdConfig(ad, req.user.id);
  }

  res.json(await getSettingsForAdmin());
});

// Prueba un login AD real (bind DOMINIO\usuario) contra la config enviada
// (sin guardar) o la guardada. No crea ni modifica usuarios.
router.post('/ad/test', adTestRateLimiter, validateBody(testAdSchema), async (req, res) => {
  const { url, domain, tlsVerify, username, password } = req.validatedBody;
  const saved = await getAdConfig();
  const cfg = {
    url: url ?? saved.url,
    domain: (domain ?? saved.domain).toUpperCase(),
    tlsVerify: tlsVerify ?? saved.tlsVerify,
  };
  if (!cfg.url || !cfg.domain) {
    return res.status(400).json({ error: { message: 'Falta la URL o el dominio de AD' } });
  }
  const login = `${cfg.domain}\\${normalizeAdUsername(username)}`;
  try {
    await adAuthenticate(cfg, username, password);
    res.json({ ok: true, message: `Autenticación correcta como ${login} contra ${cfg.url}` });
  } catch (err) {
    const detail = err.detail ? ` (${err.detail})` : '';
    res.status(400).json({ error: { message: `${login}: ${err.message}${detail}` } });
  }
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
