import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PricingModal from '../PricingModal.svelte';

describe('PricingModal Component Tests', () => {
  it('renders nothing when isOpen is false', () => {
    const { html } = render(PricingModal, {
      props: {
        isOpen: false,
      },
    });
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Transparent Pricing for Growing Teams');
  });

  it('renders all commercial tiers and early access details when isOpen is true', () => {
    const { html } = render(PricingModal, {
      props: {
        isOpen: true,
      },
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Transparent Pricing for Growing Teams');
    expect(html).toContain('COMMERCIAL EDITIONS');
    expect(html).toContain('EARLY ACCESS');
    expect(html).toContain('Starter');
    expect(html).toContain('Pro');
    expect(html).toContain('Team');
    expect(html).toContain('Enterprise');

    // Verify pricing values
    expect(html).toContain('$0');
    expect(html).toContain('19');
    expect(html).toContain('49');
    expect(html).toContain('Custom');

    // Verify zero-paywall guarantee copy
    expect(html).toContain('All features are currently unlocked');
    expect(html).toContain('no credit card required');
  });
});
