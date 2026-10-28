import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PdfViewer from '../PdfViewer.svelte';

describe('PdfViewer Multi-Format Rendering Tests', () => {
  it('renders interactive spreadsheet data grid for xlsx format', () => {
    const rawSpreadsheetText = `--- [Sheet: Sales Data] ---

| Month | Revenue | Expenses | Margin |
| --- | --- | --- | --- |
| Jan 2026 | $54,000 | $32,000 | 40.7% |
| Feb 2026 | $61,500 | $34,200 | 44.4% |`;

    const { html } = render(PdfViewer, {
      props: {
        fileType: 'xlsx',
        rawText: rawSpreadsheetText,
        highlightQuery: '$54,000',
      },
    });

    expect(html).toContain('Interactive Grid');
    expect(html).toContain('Month');
    expect(html).toContain('Revenue');
    expect(html).toContain('Jan 2026');
    expect(html).toContain('$54,000');
    expect(html).toContain('cell-matched');
  });

  it('renders multi-sheet tabs when multiple sheets exist in spreadsheet', () => {
    const multiSheetText = `--- [Sheet: Q1 Revenue] ---

| Quarter | Target | Actual |
| --- | --- | --- |
| Q1 | 100K | 115K |

--- [Sheet: Q2 Forecast] ---

| Quarter | Target |
| --- | --- |
| Q2 | 120K |`;

    const { html } = render(PdfViewer, {
      props: {
        fileType: 'xlsx',
        rawText: multiSheetText,
      },
    });

    expect(html).toContain('Q1 Revenue');
    expect(html).toContain('Q2 Forecast');
    expect(html).toContain('Sheet 1 of 2');
  });

  it('renders image document scan viewport for png and jpg', () => {
    const { html } = render(PdfViewer, {
      props: {
        fileUrl: '/uploads/invoice_scan.png',
        fileType: 'png',
        rawText: 'INVOICE #98231 ACME CORP TOTAL: $1,250.00',
        highlightQuery: '$1,250.00',
      },
    });

    expect(html).toContain('Visual Scan');
    expect(html).toContain('OCR Text &amp; Intel');
    expect(html).toContain('src="/uploads/invoice_scan.png"');
    expect(html).toContain('Entity Located:');
  });

  it('renders interactive SVG spatial bounding boxes on image scans when coordinates exist', () => {
    const { html } = render(PdfViewer, {
      props: {
        fileUrl: '/uploads/invoice_scan.png',
        fileType: 'png',
        rawText: 'INVOICE #98231 ACME CORP TOTAL: $1,250.00',
        entities: {
          total_amount: {
            value: '$1,250.00',
            box_2d: [780, 650, 815, 880],
          },
        },
        lineItems: [
          {
            description: 'UI Architecture',
            amount: 1250,
            box_2d: [450, 120, 480, 880],
          },
        ],
        highlightQuery: {
          id: 'total_amount',
          key: 'total_amount',
          box_2d: [780, 650, 815, 880],
        },
      },
    });

    expect(html).toContain('spatial-bounding-svg');
    expect(html).toContain('spatial-box-group');
    expect(html).toContain('total amount: $1,250.00');
    expect(html).toContain('Line Item: UI Architecture');
    expect(html).toContain('active-pulse');
  });

  it('renders formatted document reader for Word docx documents', () => {
    const docxMarkdown = `# Master Service Agreement

## 1. Terms of Engagement
The client agrees to retain Cognifolio Solutions for AI services.

| Deliverable | Due Date | Status |
| --- | --- | --- |
| Initial Audit | 2026-11-01 | Completed |
| Enterprise Migration | 2026-12-15 | In Progress |

- Dedicated 24/7 technical advisory
- Full compliance and PII masking`;

    const { html } = render(PdfViewer, {
      props: {
        fileType: 'docx',
        rawText: docxMarkdown,
        highlightQuery: 'Initial Audit',
      },
    });

    expect(html).toContain('Document Reader');
    expect(html).toContain('Master Service Agreement');
    expect(html).toContain('Terms of Engagement');
    expect(html).toContain('cell-matched');
    expect(html).toContain('📍 Initial Audit');
  });

  it('renders plain text and highlight mode with focal mark', () => {
    const rawTxt = `STATEMENT OF ACCOUNT
Account: 8847-1928-1120
Balance: $4,580.00
Status: ACTIVE`;

    const { html } = render(PdfViewer, {
      props: {
        fileType: 'txt',
        rawText: rawTxt,
        highlightQuery: '$4,580.00',
      },
    });

    expect(html).toContain('Formatted View');
    expect(html).toContain('Text &amp; Highlights');
    expect(html).toContain('STATEMENT OF ACCOUNT');
    expect(html).toContain('focal-target');
  });

  it('matches key takeaway findings to corresponding spatial bounding boxes on scan canvas', () => {
    const { html } = render(PdfViewer, {
      props: {
        fileType: 'png',
        fileUrl: '/uploads/dashboard_scan.png',
        entities: {
          renewal_date: {
            value: '18/11/2026',
            box_2d: [350, 400, 390, 600],
          },
        },
        lineItems: [
          {
            description: 'Optima Secure',
            amount: 0,
            box_2d: [500, 100, 540, 450],
          },
        ],
        highlightQuery: {
          type: 'takeaway',
          text: 'Earliest renewal date is set for ICICI Lombard Protect on November 18, 2026.',
          id: 'Earliest renewal date is set for ICICI Lombard Protect on November 18, 2026.',
          label: 'Earliest renewal date is set for...',
        },
      },
    });

    expect(html).toContain('spatial-bounding-svg');
    expect(html).toContain('active-pulse');
    expect(html).toContain('📍 renewal date: 18/11/2026');
    expect(html).toContain('Visual Box: renewal date');
  });

  it('favors granular leaf bounding boxes over macro container sections for takeaway queries', () => {
    const { html } = render(PdfViewer, {
      props: {
        fileType: 'png',
        fileUrl: '/uploads/architecture.png',
        lineItems: [
          {
            description:
              'Backend & Processing (FastAPI, PII Redaction Engine, Temporal Workflow Orchestration, Gemini Flash API)',
            amount: 0,
            box_2d: [80, 311, 813, 743],
          },
          {
            description: 'Temporal Workflow Orchestration',
            amount: 0,
            box_2d: [466, 321, 658, 733],
          },
        ],
        highlightQuery: {
          type: 'takeaway',
          text: 'Temporal multi-step pipeline executes sequential stages: Extract Text, Redact PII, AI Processing, Generate Embeddings, and Store Results.',
          id: 'takeaway-3',
          label: 'Temporal multi-step pipeline...',
        },
      },
    });

    expect(html).toContain('spatial-bounding-svg');
    expect(html).toContain('active-pulse');
    expect(html).toContain('📍 Line Item: Temporal Workflow Orchestration');
  });

  it('unpacks compound container line items into granular leaf spatial boxes on scan canvas', () => {
    const { html } = render(PdfViewer, {
      props: {
        fileType: 'png',
        fileUrl: '/uploads/architecture.png',
        lineItems: [
          {
            description:
              'Backend & Processing (FastAPI, PII Redaction Engine, Temporal Workflow Orchestration, Gemini Flash API)',
            amount: 0,
            box_2d: [80, 311, 813, 743],
          },
        ],
        highlightQuery: {
          type: 'takeaway',
          text: 'Temporal multi-step pipeline executes sequential stages: Extract Text, Redact PII, AI Processing, Generate Embeddings, and Store Results.',
          id: 'takeaway-3',
          label: 'Temporal multi-step pipeline...',
        },
      },
    });

    expect(html).toContain('spatial-bounding-svg');
    expect(html).toContain('active-pulse');
    expect(html).toContain('📍 Component: Temporal Workflow Orchestration');
    expect(html).toContain('Visual Box: Component');
  });
});
