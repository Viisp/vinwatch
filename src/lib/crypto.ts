import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

function getKey(): Buffer {
  const hex = process.env.VINTED_COOKIE_ENCRYPTION_KEY;
  if (!hex) throw new Error('VINTED_COOKIE_ENCRYPTION_KEY is not set');
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM encrypt. Output format: base64(iv):base64(authTag):base64(ciphertext) */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
