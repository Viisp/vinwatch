import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from './crypto';

beforeAll(() => {
  process.env.VINTED_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex, test-only key
});

describe('encrypt/decrypt', () => {
  it('round-trips a string', () => {
    const plaintext = JSON.stringify([{ name: 'access_token_web', value: 'abc123' }]);
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });
});
