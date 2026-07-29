import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from './crypto';

beforeAll(() => {
  process.env.VINTED_COOKIE_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex, test-only key
});

describe('encrypt/decrypt', () => {
  it('round-trips a string', () => {
    const plaintext = JSON.stringify([{ name: 'access_token_web', value: 'abc123' }]);
    const ciphertext = encrypt(plaintext, 'test-user-id');
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext, 'test-user-id')).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const a = encrypt('same input', 'test-user-id');
    const b = encrypt('same input', 'test-user-id');
    expect(a).not.toBe(b);
  });

  it('fails to decrypt when the context does not match', () => {
    const ciphertext = encrypt('secret', 'user-a');
    expect(() => decrypt(ciphertext, 'user-b')).toThrow();
  });

  it('fails to decrypt with malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload', 'ctx')).toThrow('Malformed encrypted payload');
  });
});
