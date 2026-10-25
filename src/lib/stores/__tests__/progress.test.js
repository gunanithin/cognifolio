import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { progress } from '../progress.js';

describe('Global Progress Store (Single Source of Truth)', () => {
  beforeEach(() => {
    progress.reset();
    vi.useRealTimers();
  });

  it('starts in idle initial state', () => {
    const state = get(progress);
    expect(state.isLoading).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.visible).toBe(false);
    expect(state.message).toBe('');
    expect(state.activeRequests).toBe(0);
  });

  it('activates progress on start() with message', () => {
    progress.start('Uploading contract...');
    const state = get(progress);

    expect(state.isLoading).toBe(true);
    expect(state.visible).toBe(true);
    expect(state.message).toBe('Uploading contract...');
    expect(state.progress).toBeGreaterThanOrEqual(15);
    expect(state.activeRequests).toBe(1);
  });

  it('tracks concurrent requests correctly without prematurely ending', () => {
    progress.start('First action');
    progress.start('Second long network call');

    let state = get(progress);
    expect(state.activeRequests).toBe(2);
    expect(state.message).toBe('Second long network call');
    expect(state.isLoading).toBe(true);

    // One request finishes
    progress.done();
    state = get(progress);
    expect(state.activeRequests).toBe(1);
    expect(state.isLoading).toBe(true); // Still loading because one remains!

    // Second request finishes
    progress.done();
    state = get(progress);
    expect(state.activeRequests).toBe(0);
    expect(state.progress).toBe(100);
  });

  it('track() wrapper manages lifecycle of successful async operation', async () => {
    const result = await progress.track(async () => {
      const state = get(progress);
      expect(state.isLoading).toBe(true);
      expect(state.message).toBe('Analyzing diffs...');
      return { diffs: 4 };
    }, 'Analyzing diffs...');

    expect(result).toEqual({ diffs: 4 });
    const finalState = get(progress);
    expect(finalState.activeRequests).toBe(0);
  });

  it('track() wrapper safely cleans up on error and rethrows', async () => {
    await expect(
      progress.track(async () => {
        throw new Error('Network timeout');
      }, 'Processing...'),
    ).rejects.toThrow('Network timeout');

    const state = get(progress);
    expect(state.activeRequests).toBe(0);
  });

  it('allows manual progress percentage setting', () => {
    progress.start();
    progress.set(65, 'Step 2 of 3');

    const state = get(progress);
    expect(state.progress).toBe(65);
    expect(state.message).toBe('Step 2 of 3');
  });

  it('reset() resets all properties immediately', () => {
    progress.start('Running...');
    progress.set(80);
    progress.reset();

    const state = get(progress);
    expect(state.isLoading).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.visible).toBe(false);
    expect(state.message).toBe('');
    expect(state.activeRequests).toBe(0);
  });
});
