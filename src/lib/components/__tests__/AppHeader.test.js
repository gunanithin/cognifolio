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
    expect(html).toContain('Workspace');
    expect(html).toContain('Security');
    expect(html).toContain('Pricing');
    expect(html).not.toContain('Launch Studio ↗');
  });

  it('renders user chip when logged in', () => {
    const { html } = render(AppHeader, {
      props: {
        currentUser: { name: 'Alice Smith', email: 'alice@example.com' },
        activeTab: 'dashboard',
      },
    });

    expect(html).toContain('AL');
    expect(html).not.toContain('+ Upload Document');
  });

  it('highlights Workspace nav link when in operational workspace tabs', () => {
    const portalRender = render(AppHeader, {
      props: { currentUser: null, activeTab: 'portal' },
    });
    expect(portalRender.html).not.toMatch(/class="[^"]*nav-workspace-link[^"]*active[^"]*"/);

    const workspaceRender = render(AppHeader, {
      props: { currentUser: null, activeTab: 'upload' },
    });
    expect(workspaceRender.html).toMatch(/class="[^"]*nav-workspace-link[^"]*active[^"]*"/);
  });

  it('renders theme toggle button with light theme active by default', () => {
    const { html } = render(AppHeader, {
      props: { currentUser: null, activeTab: 'portal' },
    });
    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('Switch to Dark Mode');
  });
});
