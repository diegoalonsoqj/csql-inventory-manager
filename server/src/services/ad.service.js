import { Client, InvalidCredentialsError, StrongAuthRequiredError, ConfidentialityRequiredError } from 'ldapts';

const TIMEOUT_MS = 10_000;

// Nombre de cuenta de red (sAMAccountName). Se valida antes del bind porque
// termina dentro del nombre de login DOMINIO\usuario.
export const AD_USERNAME_RE = /^[a-zA-Z0-9._-]{1,64}$/;

/**
 * Normaliza lo que el usuario escribe en el login a su nombre de cuenta:
 * "INTERSEGURO\jperez" o "jperez" -> "jperez".
 */
export function normalizeAdUsername(raw) {
  const value = String(raw ?? '').trim();
  const slash = value.lastIndexOf('\\');
  return (slash >= 0 ? value.slice(slash + 1) : value).toLowerCase();
}

// Errores con mensaje pensado para el usuario final (expose: se muestra aunque
// sea 5xx). `detail` lleva el error técnico, solo para la prueba del admin.
function adError(message, status, code, detail = null) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.expose = true;
  err.detail = detail;
  return err;
}

/**
 * Valida usuario/contraseña contra AD con un simple bind DOMINIO\usuario
 * (mismo esquema que el script Python con NTLM, pero vía bind simple, que es
 * lo que soporta ldapts). Resuelve true si el bind es correcto.
 *
 * Lanza:
 *  - 401 INVALID_CREDENTIALS  contraseña/usuario incorrectos
 *  - 503 AD_SIGNING_REQUIRED  el DC exige firma/cifrado: usar ldaps://
 *  - 503 AD_UNREACHABLE       no se pudo conectar al servidor
 */
export async function adAuthenticate({ url, domain, tlsVerify }, username, password) {
  const user = normalizeAdUsername(username);
  // Un bind con contraseña vacía es un bind anónimo y AD lo acepta: rechazarlo
  // aquí es lo que impide entrar sin contraseña.
  if (!AD_USERNAME_RE.test(user) || !password) {
    throw adError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const client = new Client({
    url,
    timeout: TIMEOUT_MS,
    connectTimeout: TIMEOUT_MS,
    // "DOMINIO\usuario" no es un DN; sin esto ldapts lo rechaza antes de enviarlo.
    strictDN: false,
    // Solo con ldaps://: ldapts activa TLS si recibe cualquier tlsOptions, aun
    // con ldap://, y el DC corta la conexión (ECONNRESET) en el puerto 389.
    ...(/^ldaps:/i.test(url) && { tlsOptions: { rejectUnauthorized: tlsVerify } }),
  });

  try {
    await client.bind(`${domain}\\${user}`, password);
    return true;
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      throw adError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }
    if (err instanceof StrongAuthRequiredError || err instanceof ConfidentialityRequiredError) {
      throw adError(
        'El servidor AD exige una conexión cifrada: configura la URL con ldaps://',
        503,
        'AD_SIGNING_REQUIRED'
      );
    }
    console.error('[AD] Error de conexión:', err.message);
    throw adError(
      'No se pudo contactar el servidor de Active Directory. Intenta más tarde.',
      503,
      'AD_UNREACHABLE',
      err.message
    );
  } finally {
    await client.unbind().catch(() => {});
  }
}
