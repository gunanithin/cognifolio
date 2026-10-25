import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import DeleteConfirmModal from '../DeleteConfirmModal.svelte';

describe('DeleteConfirmModal Component Tests', () => {
  const sampleDoc = {
    id: 'doc-12345-67890',
    original_filename: 'NDA_Master_Agreement_v2.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 1048576,
    page_count: 8,
    insights: {
      title: 'Mutual Non-Disclosure Agreement',
      document_type: 'NDA',
    },
  };

  it('renders nothing when isOpen is false', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: false,
        document: sampleDoc,
      },
    });
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Permanently Delete');
  });

  it('renders document deletion dialog with metadata when open', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: true,
        document: sampleDoc,
        mode: 'document',
      },
    });

    expect(html).toContain('Permanently Delete Document');
    expect(html).toContain('Mutual Non-Disclosure Agreement');
    expect(html).toContain('NDA_Master_Agreement_v2.pdf');
    expect(html).toContain('NDA');
    expect(html).toContain('doc-12345-6789');
    expect(html).toContain('8 pages');
    expect(html).toContain('1024 KB');
    expect(html).toContain('Permanently Delete');
    expect(html).toContain('Cancel');
    expect(html).toContain('Irreversible Action');
  });

  it('renders workspace purge dialog when in workspace mode', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: true,
        mode: 'workspace',
        documentCount: 12,
      },
    });

    expect(html).toContain('Purge Workspace Documents');
    expect(html).toContain('Total Documents in Scope:');
    expect(html).toContain('12 documents');
    expect(html).toContain('PostgreSQL + Qdrant Vector Cloud');
    expect(html).toContain('Full Database Reset');
    expect(html).toContain('Purge Workspace Data');
  });

  it('renders loading spinner when isDeleting is true', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: true,
        document: sampleDoc,
        isDeleting: true,
      },
    });

    expect(html).toContain('animate-spin');
  });
});
