import crypto from 'crypto';
import { config } from '../config/env.js';

// Deriva una clave de 32 bytes desde APP_ENCRYPTION_KEY (acepta cualquier
// longitud/formato: se normaliza con SHA-256).
const KEY = crypto.createHash('sha256').update(config.security.encryptionKey).digest();

const IV_LEN = 12;   // GCM: 96 bits recomendado
const TAG_LEN = 16;

/**
 * Cifra texto plano y devuelve base64 de: iv | authTag | ciphertext.
 */
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Descifra el formato producido por encrypt(). Lanza si el authTag no valida
 * (datos manipulados o clave incorrecta).
 */
export function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
