import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTokenExpired,
  getAuthToken,
  getCurrentUser,
  setAuthSession,
  clearAuthSession,
  uploadDocument,
} from '../api.js';

let storage = {};
const mockLocalStorage = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, val) => {
    storage[key] = String(val);
  },
  removeItem: (key) => {
    delete storage[key];
  },
  clear: () => {
    storage = {};
  },
};

global.window = global.window || {};
global.window.localStorage = mockLocalStorage;
global.localStorage = mockLocalStorage;

describe('Auth & Session Management API', () => {
  beforeEach(() => {
    storage = {};
    vi.restoreAllMocks();
  });

  describe('isTokenExpired', () => {
    it('returns true for null, empty or invalid strings', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('invalid-token')).toBe(true);
      expect(isTokenExpired('part1.part2')).toBe(true);
    });

    it('returns true for an expired JWT token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: pastExp })).toString(
        'base64url',
      );
      const expiredToken = `header.${payload}.signature`;

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('returns true for a token within the 30-second leeway buffer', () => {
      const soonExp = Math.floor(Date.now() / 1000) + 15; // 15 seconds in future (within 30s buffer)
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: soonExp })).toString(
        'base64url',
      );
      const nearExpiryToken = `header.${payload}.signature`;

      expect(isTokenExpired(nearExpiryToken)).toBe(true);
    });

    it('returns false for a healthy future JWT token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 hours in future
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: futureExp })).toString(
        'base64url',
      );
      const validToken = `header.${payload}.signature`;

      expect(isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('getAuthToken & getCurrentUser session validation', () => {
    it('returns null and clears storage when token is expired', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 1000;
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: pastExp })).toString(
        'base64url',
      );
      const expiredToken = `header.${payload}.signature`;

      setAuthSession(expiredToken, {
        id: 'user-1',
        name: 'Guest Analyst',
        role: 'guest',
        is_guest: true,
      });

      expect(getAuthToken()).toBeNull();
      expect(getCurrentUser()).toBeNull();
      expect(storage['cognifolio_access_token']).toBeUndefined();
      expect(storage['cognifolio_user']).toBeUndefined();
    });

    it('returns valid token and user when token is active', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = Buffer.from(JSON.stringify({ sub: 'user-2', exp: futureExp })).toString(
        'base64url',
      );
      const validToken = `header.${payload}.signature`;
      const testUser = { id: 'user-2', name: 'Sarah Analyst', role: 'analyst', is_guest: false };

      setAuthSession(validToken, testUser);

      expect(getAuthToken()).toBe(validToken);
      expect(getCurrentUser()).toEqual(testUser);
    });
  });

  describe('uploadDocument guest self-healing', () => {
    it('automatically initializes a guest session if unauthenticated before uploading', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = Buffer.from(JSON.stringify({ sub: 'guest-123', exp: futureExp })).toString(
        'base64url',
      );
      const freshGuestToken = `header.${payload}.signature`;

      const guestUser = {
        id: 'guest-123',
        name: 'Guest Analyst',
        role: 'guest',
        is_guest: true,
      };

      const fetchMock = vi.fn().mockImplementation((url) => {
        if (url.includes('/auth/guest')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ access_token: freshGuestToken, user: guestUser }),
          });
        }
        if (url.includes('/documents/upload')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: 'doc-abc',
                original_filename: 'test.pdf',
                status: 'ready',
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      global.fetch = fetchMock;

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const res = await uploadDocument(file);

      expect(res.id).toBe('doc-abc');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/guest'),
        expect.anything(),
      );
      expect(getAuthToken()).toBe(freshGuestToken);
      expect(getCurrentUser()).toEqual(guestUser);
    });

    it('recovers from 401 mid-flight by refreshing guest session and retrying', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const initialPayload = Buffer.from(
        JSON.stringify({ sub: 'guest-old', exp: futureExp }),
      ).toString('base64url');
      const initialToken = `header.${initialPayload}.signature`;

      const refreshedPayload = Buffer.from(
        JSON.stringify({ sub: 'guest-new', exp: futureExp }),
      ).toString('base64url');
      const refreshedToken = `header.${refreshedPayload}.signature`;

      setAuthSession(initialToken, { id: 'guest-old', role: 'guest', is_guest: true });

      let uploadAttempts = 0;
      const fetchMock = vi.fn().mockImplementation((url) => {
        if (url.includes('/auth/guest')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                access_token: refreshedToken,
                user: { id: 'guest-new', role: 'guest', is_guest: true },
              }),
          });
        }
        if (url.includes('/documents/upload')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.resolve({
              ok: false,
              status: 401,
              json: () => Promise.resolve({ detail: 'Signature expired' }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: 'doc-recovered', original_filename: 'invoice.pdf' }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      global.fetch = fetchMock;

      const file = new File(['sample'], 'invoice.pdf', { type: 'application/pdf' });
      const res = await uploadDocument(file);

      expect(res.id).toBe('doc-recovered');
      expect(uploadAttempts).toBe(2);
      expect(getAuthToken()).toBe(refreshedToken);
      expect(getCurrentUser()?.id).toBe('guest-new');
    });
  });
});
