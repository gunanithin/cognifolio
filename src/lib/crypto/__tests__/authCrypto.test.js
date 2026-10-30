import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluatePasswordStrength,
  deriveClientCredential,
  createSecureAuthEnvelope,
  getAuthPublicKey,
  validateEmail,
} from '../authCrypto.js';

describe('Auth Cryptography Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateEmail() keystroke validation', () => {
    it('rejects empty or whitespace email', () => {
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail('   ').valid).toBe(false);
    });

    it('rejects email containing spaces', () => {
      const res = validateEmail('user name@domain.com');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('spaces');
    });

    it('rejects email missing @ symbol', () => {
      const res = validateEmail('plainaddress');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('@');
    });

    it('rejects incomplete email with missing domain or prefix', () => {
      expect(validateEmail('user@').valid).toBe(false);
      expect(validateEmail('@domain.com').valid).toBe(false);
      expect(validateEmail('user@@domain.com').valid).toBe(false);
      expect(validateEmail('user@.com').valid).toBe(false);
      expect(validateEmail('user@domain.').valid).toBe(false);
      expect(validateEmail('user@domain..com').valid).toBe(false);
    });

    it('accepts valid RFC emails including modern TLDs and subdomains', () => {
      expect(validateEmail('guna@io').valid).toBe(true);
      expect(validateEmail('analyst@company.com').valid).toBe(true);
      expect(validateEmail('dev.lead+tag@sub.cloud.corp.io').valid).toBe(true);
    });
  });

  describe('evaluatePasswordStrength()', () => {
    it('returns score 0 and policy failure for empty string', () => {
      const res = evaluatePasswordStrength('');
      expect(res.score).toBe(0);
      expect(res.meetsPolicy).toBe(false);
      expect(res.label).toBe('Too Short');
    });

    it('penalizes common dictionary passwords', () => {
      const res = evaluatePasswordStrength('password12345');
      expect(res.meetsPolicy).toBe(false);
      expect(res.score).toBeLessThanOrEqual(40);
    });

    it('flags passwords under 10 characters as non-compliant', () => {
      const res = evaluatePasswordStrength('Secret1!');
      expect(res.meetsPolicy).toBe(false);
      expect(res.feedback).toContain('10 characters');
    });

    it('rates high-entropy passphrase as Defense-Grade', () => {
      const res = evaluatePasswordStrength('CogniFolio#2026!SecureVaultPassphrase');
      expect(res.score).toBeGreaterThanOrEqual(80);
      expect(res.meetsPolicy).toBe(true);
      expect(res.label).toBe('Defense-Grade');
      expect(res.color).toBe('#16a34a');
    });
  });

  describe('deriveClientCredential()', () => {
    it('produces a deterministic CF$ token for the same inputs', async () => {
      const token1 = await deriveClientCredential('SuperPassword123!', 'alice@enterprise.com');
      const token2 = await deriveClientCredential('SuperPassword123!', 'alice@enterprise.com');

      expect(token1).toMatch(/^CF\$[0-9a-f]{64}$/);
      expect(token1).toBe(token2);
    });

    it('produces completely different tokens for different emails (domain salting)', async () => {
      const token1 = await deriveClientCredential('SamePassword123!', 'alice@enterprise.com');
      const token2 = await deriveClientCredential('SamePassword123!', 'bob@enterprise.com');

      expect(token1).not.toBe(token2);
    });
  });

  describe('createSecureAuthEnvelope()', () => {
    it('creates envelope with encrypted payload, wrapped key, nonce and timestamp', async () => {
      // Mock /api/v1/auth/public-key with a generated RSA key
      const subtle = globalThis.crypto.subtle;
      const keyPair = await subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
      );
      const exportedSpki = await subtle.exportKey('spki', keyPair.publicKey);
      const spkiB64 = Buffer.from(exportedSpki).toString('base64');
      const pem = `-----BEGIN PUBLIC KEY-----\n${spkiB64}\n-----END PUBLIC KEY-----`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            key_id: 'test-rsa-key-v1',
            public_key_pem: pem,
            algorithm: 'RSA-OAEP-256',
          }),
      });

      const envelope = await createSecureAuthEnvelope('alice@enterprise.com', {
        credential: 'DerivedToken123',
        name: 'Alice Analyst',
      });

      expect(envelope.email).toBe('alice@enterprise.com');
      expect(envelope.encrypted_payload).toBeDefined();
      expect(envelope.encrypted_key).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.client_nonce).toBeDefined();
      expect(typeof envelope.timestamp).toBe('number');
      expect(envelope.key_id).toBe('test-rsa-key-v1');
    });
  });
});
