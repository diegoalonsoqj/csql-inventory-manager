import { z } from 'zod';

export const instancesQuerySchema = z.object({
  engine: z.enum(['PostgreSQL', 'MySQL', 'SQL Server']).optional(),
  project: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  environment: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['instance_name', 'project_id', 'region', 'state', 'engine', 'synced_at']).default('instance_name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const exportQuerySchema = z.object({
  engine: z.enum(['PostgreSQL', 'MySQL', 'SQL Server']).optional(),
  project: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  environment: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
});

export const projectsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  is_active: z.enum(['true', 'false', '']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['project_name', 'project_id', 'created_at']).default('project_name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const createProjectSchema = z.object({
  project_id: z.string().min(1).max(100).regex(/^[a-z][a-z0-9-]*$/, 'Solo minúsculas, dígitos y guiones, debe iniciar con letra'),
  project_name: z.string().min(1).max(200),
});

// ── Auth / Usuarios ─────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  email: z.string().email('Correo inválido').max(254),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

export const createUserSchema = z.object({
  email: z.string().email('Correo inválido').max(254),
  full_name: z.string().min(1, 'El nombre es obligatorio').max(200),
  role: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    role: z.enum(['admin', 'operator', 'viewer']).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada que actualizar' });

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria').max(128),
  newPassword: passwordSchema,
});

export const usersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  role: z.enum(['admin', 'operator', 'viewer']).optional(),
  is_active: z.enum(['true', 'false', '']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['full_name', 'email', 'role', 'created_at', 'last_login_at']).default('full_name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

// ── Settings ────────────────────────────────────────────────────

// Valida que la zona horaria sea un identificador IANA reconocido por el runtime.
const timezoneSchema = z.string().min(1).max(100).refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Zona horaria inválida (usa un identificador IANA, ej. America/Lima)' }
);

export const updateSettingsSchema = z
  .object({
    timezone: timezoneSchema.optional(),
    // JSON de la cuenta de servicio como string. null = borrar la credencial.
    service_account_json: z.string().max(20000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada que actualizar' });

export const testGcpSchema = z.object({
  // Opcional: probar una SA aún no guardada. Si se omite, prueba la guardada.
  service_account_json: z.string().max(20000).optional(),
});

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: { message: 'Invalid query parameters', details: result.error.flatten() } });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: { message: 'Invalid request body', details: result.error.flatten() } });
    }
    req.validatedBody = result.data;
    next();
  };
}
