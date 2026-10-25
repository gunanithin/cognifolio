import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import CProgressBar from '../CProgressBar.svelte';
import { progress } from '../../stores/progress.js';

describe('CProgressBar Component Tests', () => {
  beforeEach(() => {
    progress.reset();
  });

  it('renders nothing when progress is hidden', () => {
    const { html } = render(CProgressBar);
    expect(html).not.toContain('role="progressbar"');
  });

  it('renders progress bar and activity badge when progress is active', () => {
    progress.start('Analyzing redline differences...');

    const { html } = render(CProgressBar);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Analyzing redline differences...');
    expect(html).toContain('aria-valuenow');
  });
});
