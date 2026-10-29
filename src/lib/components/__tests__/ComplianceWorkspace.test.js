import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ComplianceWorkspace from '../ComplianceWorkspace.svelte';

describe('ComplianceWorkspace Component', () => {
  it('renders compliance score, audit KPIs, and framework guardrails', () => {
    const { html } = render(ComplianceWorkspace, {
      props: {
        complianceStats: {
          compliance_score: 99.8,
          valid_audit_events: 120,
          total_pii_masked: 85,
          pii_breakdown: { aadhaar: 12, pan: 8, ssn: 5 },
          action_breakdown: { uploaded: 40, redacted: 15, deleted: 4, exported: 6 },
        },
        auditLogs: [],
        isLoadingCompliance: false,
      },
    });

    expect(html).toContain('Audit &amp; Compliance');
    expect(html).toContain('99.8%');
    expect(html).toContain('120');
    expect(html).toContain('85');
    expect(html).toContain('Aadhaar');
    expect(html).toContain('SOC2 Type II');
    expect(html).toContain('GDPR Article 17 Erasure');
  });

  it('renders audit ledger records when logs are passed', () => {
    const sampleLogs = [
      {
        id: '1',
        action: 'uploaded',
        target_id: 'doc_1',
        created_at: '2026-10-29T10:00:00Z',
        actor_name: 'Lead Auditor',
        metadata: { filename: 'Q3_Tax_Report.pdf' },
      },
    ];

    const { html } = render(ComplianceWorkspace, {
      props: {
        complianceStats: null,
        auditLogs: sampleLogs,
        isLoadingCompliance: false,
      },
    });

    expect(html).toContain('Q3_Tax_Report.pdf');
    expect(html).toContain('Lead Auditor');
    expect(html).toContain('SHA-256');
  });
});
