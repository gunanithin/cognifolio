import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import DeveloperAuditModal from '../DeveloperAuditModal.svelte';

describe('DeveloperAuditModal Component Tests', () => {
  it('renders nothing when isOpen is false', () => {
    const { html } = render(DeveloperAuditModal, {
      props: {
        isOpen: false,
      },
    });
    expect(html).not.toContain('Supabase Centralized Error Telemetry');
    expect(html).not.toContain('Developer Access Verification');
  });

  it('renders role-based access verification when isOpen is true and unauthenticated', () => {
    const { html } = render(DeveloperAuditModal, {
      props: {
        isOpen: true,
      },
    });

    expect(html).toContain('Supabase Centralized Error Telemetry');
    expect(html).toContain('Elevated Role Required');
    expect(html).toContain('DEVELOPER OBSERVABILITY &amp; AUDIT ENGINE');
    expect(html).toContain('Sign In with Authorized Developer Account');
  });
});
