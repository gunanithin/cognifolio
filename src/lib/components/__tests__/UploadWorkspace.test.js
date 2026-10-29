import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import UploadWorkspace from '../UploadWorkspace.svelte';

describe('UploadWorkspace Component', () => {
  it('renders upload dropzone, formats, and enterprise pipeline steps', () => {
    const { html } = render(UploadWorkspace, {
      props: {
        retentionDays: 90,
        uploadStep: 1,
        isUploading: false,
        sampleDocuments: [
          { original_filename: 'TCS_Invoice.pdf' },
          { original_filename: 'MSA_Agreement.docx' },
        ],
      },
    });

    expect(html).toContain('Upload &amp; Document Processing');
    expect(html).toContain('Your documents are 100% private &amp; secure:');
    expect(html).toContain('Drag &amp; Drop documents here');
    expect(html).toContain('Document Ingestion &amp; OCR');
    expect(html).toContain('PII Redaction Engine');
    expect(html).toContain('Multimodal Intelligence Extraction');
    expect(html).toContain('Qdrant 768-D Vector Indexing');
    expect(html).toContain('Test TCS Invoice');
    expect(html).toContain('Test Master Services Agreement');
  });
});
