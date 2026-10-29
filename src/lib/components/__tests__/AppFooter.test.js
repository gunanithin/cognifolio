import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import AppFooter from '../AppFooter.svelte';

describe('AppFooter Component', () => {
  it('renders brand lockup with Cognifolio and MORROWLESS', () => {
    const { html } = render(AppFooter);

    expect(html).toContain('Cognifolio');
    expect(html).toContain('MORROWLESS');
    expect(html).toContain('We don’t wait for the future. We build it.');
    expect(html).toContain('contact@morrowless.io');
    expect(html).toContain('Plans &amp; Pricing');
    expect(html).toContain('Security &amp; Protection Policy');
    expect(html).toContain('License &amp; Ownership');
  });
});
