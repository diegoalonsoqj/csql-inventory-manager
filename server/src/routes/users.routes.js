import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  countAdmins,
} from '../services/user.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  validateQuery,
  validateBody,
  usersQuerySchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from '../middleware/validate.js';

const router = Router();

// Todas las rutas de gestión de usuarios requieren admin.
router.use(requireAuth, requireAdmin);

// Valida que :id sea un entero positivo antes de llegar a los handlers.
router.param('id', (req, res, next, val) => {
  const id = Number(val);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: { message: 'ID de usuario inválido' } });
  }
  next();
});

router.get('/', validateQuery(usersQuerySchema), async (req, res) => {
  const result = await listUsers(req.validatedQuery);
  res.json(result);
});

router.post('/', validateBody(createUserSchema), async (req, res) => {
  const user = await createUser(req.validatedBody);
  res.status(201).json(user);
});

router.patch('/:id', validateBody(updateUserSchema), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.validatedBody;

  if (id === req.user.id && body.is_active === false) {
    return res.status(400).json({ error: { message: 'No puedes desactivar tu propia cuenta' } });
  }

  // No permitir que un admin se quite a sí mismo el rol o se desactive
  // si es el último admin activo.
  const removingAdminPower =
    (body.role !== undefined && body.role !== 'admin') || body.is_active === false;

  if (removingAdminPower) {
    const remaining = await countAdmins({ excludeId: id });
    if (remaining === 0) {
      return res.status(400).json({
        error: { message: 'No puedes dejar el sistema sin administradores activos' },
      });
    }
  }

  const user = await updateUser(id, body);
  res.json(user);
});

router.post('/:id/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  const user = await resetPassword(Number(req.params.id), req.validatedBody.password);
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ error: { message: 'No puedes eliminar tu propia cuenta' } });
  }

  const remaining = await countAdmins({ excludeId: id });
  if (remaining === 0) {
    return res.status(400).json({
      error: { message: 'No puedes dejar el sistema sin administradores activos' },
    });
  }

  const user = await deleteUser(id);
  res.json(user);
});

export default router;
