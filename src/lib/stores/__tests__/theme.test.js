import { describe, it, expect, beforeEach, vi } from 'vitest';
import { theme, DEFAULT_THEME } from '../theme.js';

describe('theme store', () => {
  beforeEach(() => {
    // Reset to light
    theme.setTheme('light');
  });

  it('defaults to light theme', () => {
    let current;
    const unsubscribe = theme.subscribe((val) => {
      current = val;
    });
    unsubscribe();
    expect(current).toBe('light');
    expect(DEFAULT_THEME).toBe('light');
  });

  it('toggles from light to dark and back to light', () => {
    let current;
    const unsubscribe = theme.subscribe((val) => {
      current = val;
    });

    theme.setTheme('light');
    expect(current).toBe('light');

    theme.toggle();
    expect(current).toBe('dark');

    theme.toggle();
    expect(current).toBe('light');

    unsubscribe();
  });

  it('sanitizes invalid values to light', () => {
    let current;
    const unsubscribe = theme.subscribe((val) => {
      current = val;
    });

    theme.setTheme('invalid-theme-value');
    expect(current).toBe('light');

    theme.setTheme('dark');
    expect(current).toBe('dark');

    unsubscribe();
  });
});
