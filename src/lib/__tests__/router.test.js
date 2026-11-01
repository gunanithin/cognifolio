import { describe, it, expect } from 'vitest';
import { parseUrl, buildUrl, parseHash, buildHash, router } from '../router.js';

describe('Router Utilities', () => {
  describe('parseUrl', () => {
    it('defaults empty or root path to portal', () => {
      expect(parseUrl('')).toMatchObject({ tab: 'portal', anchor: null });
      expect(parseUrl('/')).toMatchObject({ tab: 'portal', anchor: null });
      expect(parseUrl('/#/')).toMatchObject({ tab: 'portal', anchor: null });
      expect(parseUrl('#')).toMatchObject({ tab: 'portal', anchor: null });
    });

    it('maps canonical paths to tab IDs', () => {
      expect(parseUrl('/documents')).toMatchObject({ tab: 'dashboard', path: 'documents' });
      expect(parseUrl('/upload')).toMatchObject({ tab: 'upload', path: 'upload' });
      expect(parseUrl('/viewer')).toMatchObject({ tab: 'viewer', path: 'viewer' });
      expect(parseUrl('/search')).toMatchObject({ tab: 'search', path: 'search' });
      expect(parseUrl('/compare')).toMatchObject({ tab: 'compare', path: 'compare' });
      expect(parseUrl('/compliance')).toMatchObject({ tab: 'privacy', path: 'compliance' });
    });

    it('supports backward-compatible legacy hash paths', () => {
      expect(parseUrl('#/documents')).toMatchObject({ tab: 'dashboard', path: 'documents' });
      expect(parseUrl('#/upload')).toMatchObject({ tab: 'upload', path: 'upload' });
      expect(parseUrl('#/viewer')).toMatchObject({ tab: 'viewer', path: 'viewer' });
      expect(parseUrl('#/compliance')).toMatchObject({ tab: 'privacy', path: 'compliance' });
    });

    it('extracts query parameters for deep linking', () => {
      const parsed = parseUrl('/viewer?docId=doc_abc123&page=3');
      expect(parsed.tab).toBe('viewer');
      expect(parsed.params).toEqual({
        docId: 'doc_abc123',
        page: '3',
      });

      // Also works with legacy hash format
      const parsedLegacy = parseUrl('#/viewer?docId=doc_abc123&page=3');
      expect(parsedLegacy.tab).toBe('viewer');
      expect(parsedLegacy.params).toEqual({
        docId: 'doc_abc123',
        page: '3',
      });
    });

    it('routes portal in-page sections cleanly', () => {
      expect(parseUrl('/product')).toMatchObject({ tab: 'portal', anchor: 'product' });
      expect(parseUrl('/features')).toMatchObject({ tab: 'portal', anchor: 'features' });
      expect(parseUrl('/workflow')).toMatchObject({ tab: 'portal', anchor: 'workflow' });

      // Legacy hash anchors
      expect(parseUrl('#/product')).toMatchObject({ tab: 'portal', anchor: 'product' });
      expect(parseUrl('#features')).toMatchObject({ tab: 'portal', anchor: 'features' });
    });
  });

  describe('buildUrl', () => {
    it('builds clean root path for portal', () => {
      expect(buildUrl('portal')).toBe('/');
    });

    it('builds clean section paths for portal without hash', () => {
      expect(buildUrl('portal', {}, 'features')).toBe('/features');
      expect(buildUrl('portal', {}, 'workflow')).toBe('/workflow');
      expect(buildUrl('portal', {}, 'product')).toBe('/product');
    });

    it('builds canonical workspace clean URLs without hash', () => {
      expect(buildUrl('dashboard')).toBe('/documents');
      expect(buildUrl('upload')).toBe('/upload');
      expect(buildUrl('viewer')).toBe('/viewer');
      expect(buildUrl('search')).toBe('/search');
      expect(buildUrl('compare')).toBe('/compare');
      expect(buildUrl('privacy')).toBe('/compliance');
    });

    it('appends query string without hash when params are provided', () => {
      expect(buildUrl('viewer', { docId: 'doc_99' })).toBe('/viewer?docId=doc_99');
      expect(buildUrl('search', { q: 'revenue' })).toBe('/search?q=revenue');
    });
  });

  describe('Backward compatibility aliases (parseHash, buildHash)', () => {
    it('aliases parseHash to parseUrl and buildHash to buildUrl', () => {
      expect(parseHash('/documents')).toEqual(parseUrl('/documents'));
      expect(buildHash('dashboard')).toBe('/documents');
    });
  });

  describe('Router Store', () => {
    it('allows navigation and updates store state', () => {
      router.navigate('upload');
      let current;
      const unsub = router.subscribe((val) => (current = val));
      expect(current.tab).toBe('upload');
      unsub();

      router.navigate('portal');
      const unsub2 = router.subscribe((val) => (current = val));
      expect(current.tab).toBe('portal');
      unsub2();

      router.navigate('portal', { anchor: 'features' });
      const unsub3 = router.subscribe((val) => (current = val));
      expect(current.tab).toBe('portal');
      expect(current.anchor).toBe('features');
      unsub3();
    });
  });
});
