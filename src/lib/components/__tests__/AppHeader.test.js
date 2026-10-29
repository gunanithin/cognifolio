import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import AppHeader from '../AppHeader.svelte';

describe('AppHeader Component', () => {
  it('renders brand lockup with Cognifolio and BY MORROWLESS', () => {
    const { html } = render(AppHeader, {
      props: {
        currentUser: null,
        activeTab: 'portal',
      },
    });

    expect(html).toContain('Cognifolio');
    expect(html).toContain('BY MORROWLESS');
    expect(html).toContain('Product');
    expect(html).toContain('Features');
    expect(html).toContain('How it works');
    expect(html).toContain('Documents');
    expect(html).toContain('Security');
    expect(html).toContain('Pricing');
    expect(html).toContain('Launch Studio ↗');
  });

  it('renders user chip when logged in', () => {
    const { html } = render(AppHeader, {
      props: {
        currentUser: { name: 'Alice Smith', email: 'alice@example.com' },
        activeTab: 'dashboard',
      },
    });

    expect(html).toContain('AL');
    expect(html).toContain('+ Upload Document');
  });
});
