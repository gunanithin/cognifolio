import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CompareWorkspace from '../CompareWorkspace.svelte';

describe('CompareWorkspace Component', () => {
  it('renders document selectors and empty guidance prompt when no comparison', () => {
    const sampleDocs = [
      { id: '1', original_filename: 'Contract_2025.docx', page_count: 4, file_size_bytes: 12000 },
      { id: '2', original_filename: 'Contract_2026.docx', page_count: 5, file_size_bytes: 14000 },
    ];

    const { html } = render(CompareWorkspace, {
      props: {
        documents: sampleDocs,
        comparisonResult: null,
      },
    });

    expect(html).toContain('AI Redline Diff &amp; Multi-Document Comparison');
    expect(html).toContain('DOCUMENT A');
    expect(html).toContain('DOCUMENT B');
    expect(html).toContain('Run AI Redline');
    expect(html).toContain('Select Two Documents to Initiate Automated Redlining');
  });

  it('renders executive verdict, metrics, and diff cards when comparison exists', () => {
    const mockResult = {
      executive_summary: 'Target version introduces higher liability caps and changes terms.',
      metrics: {
        risk_delta: 'increased',
        similarity_score: 82,
        added_count: 2,
        removed_count: 1,
        modified_count: 3,
        financial_delta: '+$50,000',
      },
      key_recommendations: ['Renegotiate indemnification clause'],
      diffs: [
        {
          id: 'diff_1',
          type: 'modified',
          title: 'Limitation of Liability',
          category: 'liability',
          risk_impact: 'high',
          explanation: 'Liability cap raised from $1M to unlimited.',
          doc_a_text: 'Maximum aggregate liability is capped at $1,000,000.',
          doc_b_text: 'Liability shall be uncapped for data breaches.',
          doc_a_page: 3,
          doc_b_page: 4,
        },
      ],
    };

    const { html } = render(CompareWorkspace, {
      props: {
        documents: [],
        comparisonResult: mockResult,
      },
    });

    expect(html).toContain('Executive Redline Verdict');
    expect(html).toContain('Heightened Risk Exposure Detected');
    expect(html).toContain('82%');
    expect(html).toContain('Limitation of Liability');
    expect(html).toContain('Maximum aggregate liability is capped at $1,000,000.');
    expect(html).toContain('Liability shall be uncapped for data breaches.');
  });
});
