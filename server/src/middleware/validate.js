import { z } from 'zod';
import { AD_USERNAME_RE } from '../services/ad.service.js';

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

// Login: correo (usuarios locales) o usuario de red (AD), con o sin dominio.
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio').max(254),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

const roleSchema = z.enum(['admin', 'operator', 'viewer']).default('viewer');

const adUsernameSchema = z
  .string()
  .trim()
  .regex(AD_USERNAME_RE, 'Usuario de red inválido (solo letras, dígitos, punto, guion y guion bajo)');

// Correo opcional (usuarios AD): '' o null = "sin correo"; undefined = no tocar.
const optionalEmailSchema = z
  .union([z.literal(''), z.string().email('Correo inválido').max(254)])
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const createLocalUserSchema = z.object({
  auth_type: z.literal('local'),
  email: z.string().email('Correo inválido').max(254),
  full_name: z.string().min(1, 'El nombre es obligatorio').max(200),
  role: roleSchema,
  password: passwordSchema,
});

const createAdUserSchema = z.object({
  auth_type: z.literal('ad'),
  ad_username: adUsernameSchema,
  email: optionalEmailSchema,
  full_name: z.string().min(1, 'El nombre es obligatorio').max(200),
  role: roleSchema,
});

// auth_type por defecto 'local' para no romper clientes que no lo envían.
export const createUserSchema = z.preprocess(
  (v) => (v && typeof v === 'object' && !('auth_type' in v) ? { ...v, auth_type: 'local' } : v),
  z.discriminatedUnion('auth_type', [createLocalUserSchema, createAdUserSchema])
);

export const updateUserSchema = z
  .object({
    full_name: z.string().min(1).max(200).optional(),
    role: z.enum(['admin', 'operator', 'viewer']).optional(),
    is_active: z.boolean().optional(),
    // Solo aplican a usuarios AD (el servicio lo verifica).
    ad_username: adUsernameSchema.optional(),
    email: optionalEmailSchema,
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Nada que actualizar' });

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
  auth_type: z.enum(['local', 'ad', '']).optional(),
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

const adUrlSchema = z
  .string()
  .trim()
  .max(300)
  .regex(/^ldaps?:\/\/[^\s/]+\/?$/i, 'URL inválida (ej. ldap://10.0.0.1 o ldaps://dc.empresa.local:636)');

const adDomainSchema = z
  .string()
  .trim()
  .min(1, 'El dominio es obligatorio')
  .max(100)
  .regex(/^[A-Za-z0-9.-]+$/, 'Dominio inválido (ej. INTERSEGURO)');

const adSettingsSchema = z.object({
  enabled: z.boolean(),
  url: adUrlSchema,
  domain: adDomainSchema,
  tlsVerify: z.boolean().default(true),
});

const syncScheduleSchema = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(['interval', 'schedule']),
    intervalHours: z.number().int().min(1).max(24),
    times: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'))
      .max(12, 'Máximo 12 horarios'),
  })
  .refine((d) => d.mode !== 'schedule' || d.times.length > 0, {
    message: 'Agrega al menos un horario',
    path: ['times'],
  });

export const updateSettingsSchema = z
  .object({
    timezone: timezoneSchema.optional(),
    // JSON de la cuenta de servicio como string. null = borrar la credencial.
    service_account_json: z.string().max(20000).nullable().optional(),
    ad: adSettingsSchema.optional(),
    syncSchedule: syncScheduleSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada que actualizar' });

// Prueba de login AD con credenciales reales, contra la config enviada (sin
// guardar) o, si se omite, la guardada.
export const testAdSchema = z.object({
  url: adUrlSchema.optional(),
  domain: adDomainSchema.optional(),
  tlsVerify: z.boolean().optional(),
  // Acepta "jperez" o "INTERSEGURO\jperez"; adAuthenticate normaliza y valida.
  username: z.string().trim().min(1, 'El usuario es obligatorio').max(200),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

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
