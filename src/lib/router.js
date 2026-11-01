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
  workspace: 'dashboard',
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
 * Parse a URL path/hash string into route descriptor
 * Supports clean HTML5 URLs (e.g. "/documents", "/viewer?docId=123", "/features")
 * as well as legacy hash URLs (e.g. "#/documents", "#/viewer?docId=123", "#features")
 */
export function parseUrl(urlOrPath = '') {
  let raw = (urlOrPath || '').trim();

  // If input is empty and in browser, default to current window location
  if (!raw && isBrowser) {
    raw = window.location.pathname + window.location.search + window.location.hash;
  }

  // Handle absolute URL strings (e.g. "https://domain.com/viewer?docId=123")
  if (raw.includes('://')) {
    try {
      const u = new URL(raw);
      raw = u.pathname + u.search + u.hash;
    } catch {
      // ignore URL parsing error and fallback
    }
  }

  let pathPart = '';
  let queryPart = '';
  let anchorPart = null;

  // Extract hash part if present
  const hashIndex = raw.indexOf('#');
  let hashContent = '';
  if (hashIndex !== -1) {
    hashContent = raw.slice(hashIndex + 1);
    raw = raw.slice(0, hashIndex);
  }

  // Extract query parameters from raw (before hash)
  const queryIndex = raw.indexOf('?');
  if (queryIndex !== -1) {
    queryPart = raw.slice(queryIndex + 1);
    pathPart = raw.slice(0, queryIndex);
  } else {
    pathPart = raw;
  }

  // If pathPart is empty or root '/', but legacy hash has content
  // e.g. raw was "#/viewer?docId=123" or "/#/viewer?docId=123" or "#features"
  const cleanPath = pathPart.replace(/^[\/#!]+/, '').replace(/\/+$/, '');
  if (!cleanPath && hashContent) {
    let cleanHash = hashContent.trim();
    if (cleanHash.startsWith('!')) cleanHash = cleanHash.slice(1);
    if (cleanHash.startsWith('/')) cleanHash = cleanHash.slice(1);

    const [hPath, hQuery = ''] = cleanHash.split('?');
    const [hRawPath = '', hAnchor = null] = hPath.split('#');

    pathPart = hRawPath;
    if (hQuery && !queryPart) queryPart = hQuery;
    if (hAnchor) anchorPart = hAnchor;
  } else if (hashContent) {
    // Normal anchor on a path e.g. /#features or /documents#section
    anchorPart = hashContent.replace(/^[\/#]/, '');
  }

  // Normalize path
  let normalizedPath = (pathPart || '')
    .replace(/^[\/#!]+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
    .trim();

  // Parse query params
  const params = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    for (const [key, val] of searchParams.entries()) {
      params[key] = val;
    }
  }

  // Check if normalizedPath is an in-page portal anchor (e.g. 'product', 'features', 'workflow')
  if (PORTAL_ANCHORS.includes(normalizedPath)) {
    return {
      tab: 'portal',
      path: '',
      anchor: normalizedPath,
      params,
    };
  }

  const tab = PATH_TO_TAB[normalizedPath] || 'portal';
  const anchor = anchorPart ? anchorPart.toLowerCase().trim() : null;

  return {
    tab,
    path: normalizedPath,
    anchor,
    params,
  };
}

// Backward-compatible alias
export const parseHash = parseUrl;

/**
 * Format route descriptor into a clean URL path string
 * e.g. tab 'portal' -> '/'
 * e.g. tab 'portal', anchor 'features' -> '/features'
 * e.g. tab 'dashboard' -> '/documents'
 * e.g. tab 'viewer', params { docId: '123' } -> '/viewer?docId=123'
 */
export function buildUrl(tab = 'portal', params = {}, anchor = null) {
  if (tab === 'portal') {
    if (anchor && PORTAL_ANCHORS.includes(anchor)) {
      return `/${anchor}`;
    }
    return '/';
  }

  const path = TAB_TO_PATH[tab] || 'documents';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params || {})) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  }

  const query = searchParams.toString();
  let url = `/${path}`;
  if (query) url += `?${query}`;
  if (anchor) url += `#${anchor}`;
  return url;
}

// Backward-compatible alias
export const buildHash = buildUrl;

function createRouterStore() {
  const initialUrl = isBrowser
    ? window.location.pathname + window.location.search + window.location.hash
    : '';
  const initialRoute = parseUrl(initialUrl);

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
    const currentRoute = parseUrl(
      window.location.pathname + window.location.search + window.location.hash,
    );
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
    const newUrl = buildUrl(tab, params, anchor);

    if (isBrowser) {
      const currentFull =
        window.location.pathname + window.location.search + (window.location.hash || '');
      if (currentFull !== newUrl) {
        if (replace) {
          window.history.replaceState(null, '', newUrl);
        } else {
          window.history.pushState(null, '', newUrl);
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
    const initial = parseUrl(
      window.location.pathname + window.location.search + window.location.hash,
    );
    update((s) => ({
      ...s,
      ...initial,
      initialized: true,
    }));

    // If legacy hash is present on entry (e.g. /#/documents or #features), replaceState with clean URL
    if (
      window.location.hash &&
      (window.location.hash.startsWith('#/') ||
        PORTAL_ANCHORS.includes(window.location.hash.replace(/^#/, '')))
    ) {
      const cleanUrl = buildUrl(initial.tab, initial.params, initial.anchor);
      window.history.replaceState(null, '', cleanUrl);
    }

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
    parseUrl,
    buildUrl,
    parseHash,
    buildHash,
    back: () => isBrowser && window.history.back(),
    forward: () => isBrowser && window.history.forward(),
  };
}

export const router = createRouterStore();
export const currentTab = derived(router, ($r) => $r.tab);
export const currentParams = derived(router, ($r) => $r.params);
