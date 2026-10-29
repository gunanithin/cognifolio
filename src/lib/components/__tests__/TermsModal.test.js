import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import TermsModal from '../TermsModal.svelte';

describe('TermsModal Component Tests', () => {
  it('renders nothing when isOpen is false', () => {
    const { html } = render(TermsModal, {
      props: {
        isOpen: false,
      },
    });
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Cognifolio Terms of Service');
  });

  it('renders all key terms sections and commitments when isOpen is true', () => {
    const { html } = render(TermsModal, {
      props: {
        isOpen: true,
      },
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Cognifolio Terms of Service');
    expect(html).toContain('LEGAL &amp; PLATFORM POLICY');
    expect(html).toContain('Document Ownership &amp; Data Sovereignty');
    expect(html).toContain('Zero-Training AI Guarantee');
    expect(html).toContain('Permitted Auditing &amp; Acceptable Use');
    expect(html).toContain('Data Retention &amp; Permanent Erasure');
    expect(html).toContain('Professional Verification &amp; Advisory Notice');
    expect(html).toContain('100% intellectual property, legal ownership, and copyright');
    expect(html).toContain('Understood &amp; Accept');
  });
});
