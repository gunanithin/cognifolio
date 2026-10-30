import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SecurityGuideModal from '../SecurityGuideModal.svelte';

describe('SecurityGuideModal Component Tests', () => {
  it('renders nothing when isOpen is false', () => {
    const { html } = render(SecurityGuideModal, {
      props: {
        isOpen: false,
      },
    });
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Your Documents Are Safe With Us');
  });

  it('renders zero-trust security guide modal with close buttons when isOpen is true', () => {
    const { html } = render(SecurityGuideModal, {
      props: {
        isOpen: true,
      },
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain('ZERO-TRUST PROTECTION GUARANTEE');
    expect(html).toContain('Your Documents Are Safe With Us');
    expect(html).toContain('Zero AI Model Training');
    expect(html).toContain('Pre-AI PII Redaction');
    expect(html).toContain('Single-Tenant Session Isolation');
    expect(html).toContain('1-Click Cryptographic Shredding');
    expect(html).toContain('Close Guide');
  });
});
