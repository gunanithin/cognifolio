import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CognifolioPortal from '../CognifolioPortal.svelte';

describe('CognifolioPortal Component Tests', () => {
  it('renders the exact landing page layout with Cognifolio branding and decision theme', () => {
    const { html } = render(CognifolioPortal, {
      props: {
        documents: [],
        currentUser: null,
      },
    });

    // Verify Cognifolio and Morrowless Brand
    expect(html).toContain('Cognifolio');
    expect(html).toContain('BY MORROWLESS');
    expect(html).toContain('AI DOCUMENT INTELLIGENCE');

    // Verify Main Headline & Copy
    expect(html).toContain('Turn documents');
    expect(html).toContain('decisions.</em>');
    expect(html).toContain('Upload any PDF, contract, or image.');

    // Verify Actions & Trust Indicators
    expect(html).toContain('Explore Cognifolio →');
    expect(html).toContain('Upload Document');
    expect(html).toContain('Pricing &amp; Limits');
    expect(html).toContain('Source-grounded answers');
    expect(html).toContain('Privacy-first analysis');
    expect(html).toContain('PDF · DOCX · Images');

    // Verify Content Sections
    expect(html).toContain('More than a document viewer.');
    expect(html).toContain('Understand in seconds');
    expect(html).toContain('Ask your documents');
    expect(html).toContain('Spot potential risks');
    expect(html).toContain('Protect sensitive data');
    expect(html).toContain('Read scans and images');
    expect(html).toContain('Keep context connected');

    // Verify Workflow Steps
    expect(html).toContain('Upload. Understand. Decide.');
    expect(html).toContain('01 / INGEST');
    expect(html).toContain('02 / RETRIEVE');
    expect(html).toContain('03 / ANALYSE');

    // Verify Commercial CTA
    expect(html).toContain('Make every page count.');
    expect(html).not.toContain('We don’t wait for the future. We build it.');
  });

  it('renders active workspace files when documents are passed', () => {
    const sampleDocs = [
      { id: '1', original_filename: 'Supplier_Contract_2026.pdf' },
      { id: '2', original_filename: 'Q3_Financial_Model.xlsx' },
    ];
    const { html } = render(CognifolioPortal, {
      props: {
        documents: sampleDocs,
        currentUser: null,
      },
    });

    expect(html).toContain('ACTIVE VAULT:');
    expect(html).toContain('Supplier_Contract_2026.pdf');
    expect(html).toContain('Q3_Financial_Model.xlsx');
  });
});
