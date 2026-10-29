import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import DocumentsWorkspace from '../DocumentsWorkspace.svelte';

describe('DocumentsWorkspace Component Tests', () => {
  it('renders empty state correctly with action buttons', () => {
    const { html } = render(DocumentsWorkspace, {
      props: {
        documents: [],
        totalPages: 0,
        sampleDocuments: [{ name: 'Demo_Invoice.pdf', content: 'Demo' }],
      },
    });

    expect(html).toContain('Documents Workspace');
    expect(html).toContain('Total Documents');
    expect(html).toContain('Your workspace is empty');
    expect(html).toContain('Upload First Document');
    expect(html).toContain('Load Demo Invoice');
    expect(html).toContain('Drag &amp; drop documents here');
  });

  it('renders document table when documents are provided', () => {
    const docs = [
      {
        id: 'doc-101',
        original_filename: 'Executive_Master_Agreement.pdf',
        file_type: 'pdf',
        page_count: 14,
        file_size_bytes: 204800,
        uploaded_at: '2026-10-28T12:00:00Z',
        insights: { document_type: 'Legal Contract' },
      },
      {
        id: 'doc-102',
        original_filename: 'Financial_Analysis_2026.xlsx',
        file_type: 'xlsx',
        page_count: 4,
        file_size_bytes: 512000,
        uploaded_at: '2026-10-28T13:00:00Z',
        insights: { document_type: 'Financial Sheet' },
      },
    ];

    const { html } = render(DocumentsWorkspace, {
      props: {
        documents: docs,
        totalPages: 18,
        sampleDocuments: [],
      },
    });

    expect(html).toContain('Executive_Master_Agreement.pdf');
    expect(html).toContain('Financial_Analysis_2026.xlsx');
    expect(html).toContain('Legal Contract');
    expect(html).toContain('Financial Sheet');
    expect(html).toContain('PDF');
    expect(html).toContain('XLSX');
    expect(html).toContain('Ready');
    expect(html).toContain('Showing');
    expect(html).toContain('documents');
  });
});
