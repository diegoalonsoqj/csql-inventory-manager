import { Router } from 'express';
import { login, issueSession, clearSession } from '../services/auth.service.js';
import { changeOwnPassword } from '../services/user.service.js';
import { requireAuth } from '../middleware/auth.js';
import { loginRateLimiter, passwordChangeRateLimiter } from '../middleware/rate-limiter.js';
import { validateBody, loginSchema, changePasswordSchema } from '../middleware/validate.js';

const router = Router();

router.post('/login', loginRateLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.validatedBody;
  const user = await login(email, password);
  // Establece la cookie de sesión (httpOnly) y la cookie CSRF.
  issueSession(res, user);
  res.json({ user });
});

// Cierra sesión: limpia las cookies. No requiere auth (limpiar es inofensivo).
router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// Datos del usuario autenticado actual.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Cambio de contraseña propia.
router.post('/change-password', requireAuth, passwordChangeRateLimiter, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.validatedBody;
  await changeOwnPassword(req.user.id, currentPassword, newPassword);
  res.json({ ok: true });
});

export default router;
