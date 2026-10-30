import { writable } from 'svelte/store';

const THEME_STORAGE_KEY = 'cognifolio_theme';
export const DEFAULT_THEME = 'light';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Check if document already has data-theme set by pre-hydration inline script
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme === 'light' || docTheme === 'dark') {
      return docTheme;
    }
  } catch {
    // Ignore storage errors in restricted sandboxes
  }
  return DEFAULT_THEME;
}

function createThemeStore() {
  const store = writable(getInitialTheme());

  function applyTheme(theme) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Ignore storage errors
      }
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  return {
    subscribe: store.subscribe,
    setTheme(newTheme) {
      const sanitized = newTheme === 'dark' ? 'dark' : 'light';
      store.set(sanitized);
      applyTheme(sanitized);
    },
    toggle() {
      store.update((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return next;
      });
    },
    init() {
      const initial = getInitialTheme();
      store.set(initial);
      applyTheme(initial);
    },
  };
}

export const theme = createThemeStore();
