import { describe, it, expect, beforeEach } from 'vitest';
import { parseHash, buildHash, router } from '../router.js';

describe('Router Utilities', () => {
  describe('parseHash', () => {
    it('defaults empty or root hash to portal', () => {
      expect(parseHash('')).toMatchObject({ tab: 'portal', anchor: null });
      expect(parseHash('#/')).toMatchObject({ tab: 'portal', anchor: null });
      expect(parseHash('#')).toMatchObject({ tab: 'portal', anchor: null });
    });

    it('maps canonical paths to tab IDs', () => {
      expect(parseHash('#/documents')).toMatchObject({ tab: 'dashboard', path: 'documents' });
      expect(parseHash('#/upload')).toMatchObject({ tab: 'upload', path: 'upload' });
      expect(parseHash('#/viewer')).toMatchObject({ tab: 'viewer', path: 'viewer' });
      expect(parseHash('#/search')).toMatchObject({ tab: 'search', path: 'search' });
      expect(parseHash('#/compare')).toMatchObject({ tab: 'compare', path: 'compare' });
      expect(parseHash('#/compliance')).toMatchObject({ tab: 'privacy', path: 'compliance' });
    });

    it('extracts query parameters for deep linking', () => {
      const parsed = parseHash('#/viewer?docId=doc_abc123&page=3');
      expect(parsed.tab).toBe('viewer');
      expect(parsed.params).toEqual({
        docId: 'doc_abc123',
        page: '3',
      });
    });

    it('routes portal in-page anchors to portal with anchor set', () => {
      expect(parseHash('#/product')).toMatchObject({ tab: 'portal', anchor: 'product' });
      expect(parseHash('#/features')).toMatchObject({ tab: 'portal', anchor: 'features' });
      expect(parseHash('#/workflow')).toMatchObject({ tab: 'portal', anchor: 'workflow' });
    });
  });

  describe('buildHash', () => {
    it('builds root hash for portal', () => {
      expect(buildHash('portal')).toBe('#/');
    });

    it('builds anchor hash for portal sections', () => {
      expect(buildHash('portal', {}, 'features')).toBe('#/features');
      expect(buildHash('portal', {}, 'workflow')).toBe('#/workflow');
    });

    it('builds canonical workspace hashes', () => {
      expect(buildHash('dashboard')).toBe('#/documents');
      expect(buildHash('upload')).toBe('#/upload');
      expect(buildHash('viewer')).toBe('#/viewer');
      expect(buildHash('search')).toBe('#/search');
      expect(buildHash('compare')).toBe('#/compare');
      expect(buildHash('privacy')).toBe('#/compliance');
    });

    it('appends query string when params are provided', () => {
      expect(buildHash('viewer', { docId: 'doc_99' })).toBe('#/viewer?docId=doc_99');
      expect(buildHash('search', { q: 'revenue' })).toBe('#/search?q=revenue');
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
    });
  });
});
