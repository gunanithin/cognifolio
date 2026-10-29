import { writable, derived } from 'svelte/store';

const isBrowser = typeof window !== 'undefined';

/**
 * Route Mapping Dictionary
 */
export const TAB_TO_PATH = {
  portal: '',
  dashboard: 'documents',
  upload: 'upload',
  viewer: 'viewer',
  search: 'search',
  compare: 'compare',
  privacy: 'compliance',
};

export const PATH_TO_TAB = {
  '': 'portal',
  '/': 'portal',
  portal: 'portal',
  home: 'portal',
  documents: 'dashboard',
  dashboard: 'dashboard',
  upload: 'upload',
  viewer: 'viewer',
  search: 'search',
  compare: 'compare',
  compliance: 'privacy',
  privacy: 'privacy',
};

export const PORTAL_ANCHORS = ['product', 'features', 'workflow'];

/**
 * Parse a hash string into route descriptor
 * e.g. "#/viewer?docId=123" -> { tab: 'viewer', path: 'viewer', params: { docId: '123' }, anchor: null }
 * e.g. "#/features" -> { tab: 'portal', path: '', params: {}, anchor: 'features' }
 */
export function parseHash(hashStr = '') {
  let clean = (hashStr || '').trim();
  if (clean.startsWith('#')) clean = clean.slice(1);
  if (clean.startsWith('!')) clean = clean.slice(1);
  if (clean.startsWith('/')) clean = clean.slice(1);

  // Split path and query
  const [pathAndAnchor, queryStr = ''] = clean.split('?');
  const [rawPath = '', rawAnchor = null] = pathAndAnchor.split('#');

  // Parse query params
  const params = {};
  if (queryStr) {
    const searchParams = new URLSearchParams(queryStr);
    for (const [key, val] of searchParams.entries()) {
      params[key] = val;
    }
  }

  // Check if rawPath is an in-page portal anchor
  const normalizedPath = rawPath.toLowerCase().trim();
  if (PORTAL_ANCHORS.includes(normalizedPath)) {
    return {
      tab: 'portal',
      path: '',
      anchor: normalizedPath,
      params,
    };
  }

  const tab = PATH_TO_TAB[normalizedPath] || 'portal';
  const anchor = rawAnchor ? rawAnchor.toLowerCase().trim() : null;

  return {
    tab,
    path: normalizedPath,
    anchor,
    params,
  };
}

/**
 * Format route descriptor into a hash string
 */
export function buildHash(tab = 'portal', params = {}, anchor = null) {
  if (tab === 'portal') {
    if (anchor && PORTAL_ANCHORS.includes(anchor)) {
      return `#/${anchor}`;
    }
    return '#/';
  }

  const path = TAB_TO_PATH[tab] || 'documents';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params || {})) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  }

  const query = searchParams.toString();
  let hash = `#/${path}`;
  if (query) hash += `?${query}`;
  if (anchor) hash += `#${anchor}`;
  return hash;
}

function createRouterStore() {
  const initialHash = isBrowser ? window.location.hash : '';
  const initialRoute = parseHash(initialHash);

  const { subscribe, set, update } = writable({
    ...initialRoute,
    initialized: false,
  });

  let isHandlingPopstate = false;

  function applyScroll(anchor) {
    if (!isBrowser) return;
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }

  function syncFromUrl(pushHistory = false) {
    if (!isBrowser) return;
    const currentRoute = parseHash(window.location.hash);
    update((state) => ({
      ...state,
      ...currentRoute,
    }));
    applyScroll(currentRoute.anchor);
  }

  function navigate(target, options = {}) {
    const { params = {}, anchor = null, replace = false, scroll = true } = options;

    // Target can be a tab ID ('dashboard', 'viewer') or a path string
    const tab = PATH_TO_TAB[target] || (TAB_TO_PATH[target] !== undefined ? target : 'portal');
    const newHash = buildHash(tab, params, anchor);

    if (isBrowser) {
      if (window.location.hash !== newHash) {
        if (replace) {
          window.history.replaceState(null, '', newHash);
        } else {
          window.history.pushState(null, '', newHash);
        }
      }

      update((state) => ({
        ...state,
        tab,
        path: TAB_TO_PATH[tab] || '',
        params,
        anchor,
      }));

      if (scroll) {
        applyScroll(anchor);
      }
    } else {
      update((state) => ({
        ...state,
        tab,
        path: TAB_TO_PATH[tab] || '',
        params,
        anchor,
      }));
    }
  }

  function init() {
    if (!isBrowser) return () => {};

    function onLocationChange() {
      isHandlingPopstate = true;
      syncFromUrl();
      isHandlingPopstate = false;
    }

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);

    // Initial sync
    const initial = parseHash(window.location.hash);
    update((s) => ({
      ...s,
      ...initial,
      initialized: true,
    }));

    if (initial.anchor) {
      applyScroll(initial.anchor);
    }

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }

  return {
    subscribe,
    navigate,
    init,
    parseHash,
    buildHash,
    back: () => isBrowser && window.history.back(),
    forward: () => isBrowser && window.history.forward(),
  };
}

export const router = createRouterStore();
export const currentTab = derived(router, ($r) => $r.tab);
export const currentParams = derived(router, ($r) => $r.params);
