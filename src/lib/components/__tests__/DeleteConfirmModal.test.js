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
    expect(html).not.toContain('Delete Document?');
  });

  it('renders minimal document deletion confirmation dialog when open', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: true,
        document: sampleDoc,
        mode: 'document',
      },
    });

    expect(html).toContain('Delete Document?');
    expect(html).toContain('Mutual Non-Disclosure Agreement');
    expect(html).toContain('Are you sure you want to permanently delete');
    expect(html).toContain('This action cannot be undone');
    expect(html).toContain('Delete');
    expect(html).toContain('Cancel');
    // Ensure verbose clutter is NOT present
    expect(html).not.toContain('Affected Systems:');
    expect(html).not.toContain('What will be removed:');
    expect(html).not.toContain('Neural vector embeddings in Qdrant');
  });

  it('renders minimal workspace purge confirmation dialog when in workspace mode', () => {
    const { html } = render(DeleteConfirmModal, {
      props: {
        isOpen: true,
        mode: 'workspace',
        documentCount: 12,
      },
    });

    expect(html).toContain('Purge Workspace?');
    expect(html).toContain('12 documents');
    expect(html).toContain('Purge Workspace');
    expect(html).toContain('Cancel');
    // Ensure verbose clutter is NOT present
    expect(html).not.toContain('PostgreSQL + Qdrant Vector Cloud');
    expect(html).not.toContain('Full Database Reset');
    expect(html).not.toContain('Total Documents in Scope:');
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
