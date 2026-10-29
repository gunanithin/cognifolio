import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ViewerWorkspace from '../ViewerWorkspace.svelte';

describe('ViewerWorkspace Component', () => {
  it('renders empty state when no document is selected', () => {
    const { html } = render(ViewerWorkspace, {
      props: {
        selectedDoc: null,
      },
    });

    expect(html).toContain('No Document Selected');
    expect(html).toContain('Return to Documents');
  });

  it('renders document details, insights, and tabs when document is selected', () => {
    const sampleDoc = {
      id: 'doc_101',
      original_filename: 'Annual_Report_2026.pdf',
      file_type: 'pdf',
      insights: {
        title: 'Executive Annual Report 2026',
        document_type: 'Financial Report',
        confidence_score: 0.98,
        summary: 'Record annual growth and revenue expansion across all lines.',
        key_points: ['Revenue increased by 35% YoY', 'Operating margin expanded to 28%'],
        entities: {
          organization: 'Cognifolio Global Ltd',
          total_revenue: '$45,000,000',
        },
      },
    };

    const { html } = render(ViewerWorkspace, {
      props: {
        selectedDoc: sampleDoc,
        viewerRightTab: 'intel',
      },
    });

    expect(html).toContain('Executive Annual Report 2026');
    expect(html).toContain('Financial Report');
    expect(html).toContain('98%');
    expect(html).toContain('Record annual growth');
    expect(html).toContain('Revenue increased by 35% YoY');
    expect(html).toContain('Cognifolio Global Ltd');
    expect(html).toContain('Extracted Intelligence');
    expect(html).toContain('Conversational Document AI');
  });
});
