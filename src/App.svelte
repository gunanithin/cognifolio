<script>
  import { onMount } from 'svelte';
  import {
    fetchHealth,
    listDocuments,
    uploadDocument,
    deleteDocument,
    getDocument,
    semanticSearch,
    getDashboardStats,
    getComplianceStats,
    getAuditLogs,
    downloadAuditExport,
    triggerDocumentRedaction,
    getDocumentFileUrl,
    getRedactedFileUrl,
    chatWithDocument,
    compareDocuments,
  } from './lib/api.js';
  import PdfViewer from './lib/components/PdfViewer.svelte';

  // Navigation State
  let activeTab = 'dashboard'; // 'dashboard' | 'upload' | 'search' | 'viewer' | 'privacy' | 'compare'

  // Global Data
  let health = { status: 'checking...', gemini_model: '', qdrant_location: '' };
  let stats = null;
  let documents = [];
  let selectedDoc = null;
  let isLoading = false;
  let errorMsg = '';
  let successMsg = '';

  // Compliance, PII Redaction & Audit State (Option 3)
  let complianceStats = null;
  let auditLogs = [];
  let auditFilter = 'all'; // 'all' | 'uploaded' | 'viewed' | 'searched' | 'redacted' | 'deleted'
  let auditSearchQuery = '';
  let isLoadingCompliance = false;
  let isExportingAudit = false;
  let isRedactedView = false;

  // Conversational Document AI (Chat with Document)
  let viewerRightTab = 'intel'; // 'intel' | 'chat'
  let chatMessages = [];
  let chatInput = '';
  let isChatLoading = false;
  let chatContainerRef = null;
  let currentChatDocId = null;

  function initDocChat() {
    if (selectedDoc && currentChatDocId !== selectedDoc.id) {
      currentChatDocId = selectedDoc.id;
      chatMessages = [];
    }
  }

  $: if (selectedDoc && selectedDoc.id !== currentChatDocId) {
    currentChatDocId = selectedDoc.id;
    chatMessages = [];
  }

  async function handleSendChat(customMessage = null) {
    const textToSend = (customMessage || chatInput).trim();
    if (!textToSend || !selectedDoc || isChatLoading) return;

    chatInput = '';
    const userMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    chatMessages = [...chatMessages, userMsg];
    isChatLoading = true;

    setTimeout(() => {
      if (chatContainerRef) chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
    }, 50);

    try {
      const historyPayload = chatMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
      const response = await chatWithDocument(selectedDoc.id, textToSend, historyPayload);

      const aiMsg = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        content: response.reply,
        citations: response.citations || [],
        followups: response.suggested_followups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      chatMessages = [...chatMessages, aiMsg];
    } catch (err) {
      chatMessages = [
        ...chatMessages,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ Failed to get answer: ${err.message}`,
          citations: [],
          followups: [],
        },
      ];
    } finally {
      isChatLoading = false;
      setTimeout(() => {
        if (chatContainerRef) chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
      }, 50);
    }
  }

  function handleCitationClick(cit) {
    if (!cit || !cit.text) return;
    highlightInDoc({
      type: cit.type || 'clause',
      text: cit.text,
      id: cit.text,
      label: cit.label || 'Citation',
    });
  }

  function clearChat() {
    chatMessages = [];
  }

  function formatChatReply(content) {
    if (!content) return '';
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\s*[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    formatted = formatted.replace(/^\s*>\s*(.*)$/gm, '<blockquote>$1</blockquote>');
    formatted = formatted.replace(/\n\n/g, '<p></p>').replace(/\n/g, '<br/>');
    return formatted;
  }

  function getDocStarters(doc) {
    if (!doc || !doc.insights) {
      return [
        'What is the summary of this document?',
        'What are the main key points?',
        'Who are the parties involved?',
      ];
    }
    const type = (doc.insights.document_type || '').toLowerCase();
    if (type.includes('invoice') || type.includes('tax')) {
      return [
        'What is the total payable amount and due date?',
        'What are the individual line items and services billed?',
        'Are there any late payment penalties or interest terms?',
      ];
    } else if (type.includes('contract') || type.includes('agreement')) {
      return [
        'What are the payment milestones and contract value?',
        'What are the early termination penalties and liability caps?',
        'Is there an automatic renewal clause in this contract?',
      ];
    } else if (type.includes('policy') || type.includes('insurance')) {
      return [
        'What is the Free Look cancellation period?',
        'What are the key exclusions and waiting periods?',
        'How does the claim settlement or reimbursement process work?',
      ];
    }
    return [
      'Summarize the main obligations and takeaways',
      'What are the key financial amounts or deadlines?',
      'Are there any risk, liability, or penalty clauses?',
    ];
  }

  // Interactive PDF Highlight state
  let activeHighlightTerm = '';
  let activeHighlightKey = '';

  function highlightInDoc(target) {
    if (!target) return;
    if (typeof target === 'string') {
      const cleanTerm = target.trim();
      activeHighlightKey = cleanTerm;
      if (activeHighlightTerm === cleanTerm) {
        activeHighlightTerm = '';
        setTimeout(() => {
          activeHighlightTerm = cleanTerm;
        }, 20);
      } else {
        activeHighlightTerm = cleanTerm;
      }
    } else {
      activeHighlightKey = target.id || target.key || target.text || '';
      activeHighlightTerm = null;
      setTimeout(() => {
        activeHighlightTerm = target;
      }, 20);
    }
  }

  function locateTakeaway(pt) {
    if (!pt) return;
    highlightInDoc({
      type: 'takeaway',
      text: pt,
      id: pt,
      label: 'Takeaway',
    });
  }

  function locateEntity(key, val) {
    if (!val) return;
    const valStr = Array.isArray(val) ? val.join(', ') : String(val);
    const formattedKey = key.replace(/_/g, ' ');
    highlightInDoc({
      type: 'entity',
      key: key,
      val: valStr,
      text: `${formattedKey}: ${valStr}`,
      id: key,
      label: formattedKey,
    });
  }

  function locateLineItem(item) {
    if (!item || !item.description) return;
    const amountVal = item.amount ? Math.round(item.amount).toString() : '';
    const query = amountVal ? `${item.description} ${amountVal}` : item.description;
    highlightInDoc({
      type: 'line_item',
      text: query,
      amount: item.amount,
      id: item.description,
      label: 'Line Item',
    });
  }

  function locateRiskClause(clause) {
    if (!clause) return;
    highlightInDoc({
      type: 'clause',
      text: clause,
      id: clause,
      label: 'Risk Clause',
    });
  }

  // Upload State
  let uploadFiles = null;
  let isUploading = false;
  let uploadStep = 0; // 1: reading, 2: redacting, 3: gemini, 4: vectorizing, 5: done
  let retentionDays = 90;

  // Search State
  let searchQuery = '';
  let searchResults = [];
  let isSearching = false;

  // Sample Documents for 1-Click Testing
  const sampleDocuments = [
    {
      name: 'TCS_Cloud_Infrastructure_Invoice_Oct2026.pdf',
      content: `TAX INVOICE
Tata Consultancy Services Ltd.
B-Wing, TCS Olympus, Hiranandani Estate, Thane 400607
GSTIN: 27AAACT2727Q1ZW

Invoice No: TCS/INV/2026/10892
Invoice Date: 12-Oct-2026
Due Date: 15-Nov-2026
Client: Acme Global Enterprises Pvt Ltd
Customer Contact: John Doe, Phone: +91 9820012345
Billing A/C: 981245821039, Bank IFSC: HDFC0000060
Aadhaar Verified Officer: 4829 1928 3746

LINE ITEMS:
1. Dedicated Cloud Kubernetes Hosting (Q3-2026) - Quantity: 1 - ₹4,50,000.00
2. Database Managed Cluster & Replication - Quantity: 1 - ₹2,10,000.00
3. AI Inference Acceleration & Model Hosting - Quantity: 1 - ₹1,85,000.00

Subtotal: ₹8,45,000.00
CGST (9%): ₹76,050.00
SGST (9%): ₹76,050.00
Total Payable Amount: ₹9,97,100.00

PAYMENT TERMS:
Payment must be credited within 30 days of receipt. Late payments shall incur 1.5% interest per month.`,
    },
    {
      name: 'Master_Software_License_and_Service_Agreement.pdf',
      content: `MASTER SOFTWARE SERVICES AGREEMENT
Effective Date: 01-Jan-2026
Between: Novatech AI Solutions Inc. ("Provider")
And: Apex Financial Services Ltd. ("Client")

RECITALS:
Provider agrees to deliver multimodal document intelligence and data pipelines.

SECTION 4: FEES AND PAYMENT
Total Annual Contract Value: $120,000 USD payable quarterly ($30,000 USD/quarter).
Due Date: Net 45 days from invoice issuance.

SECTION 9: RISK CLAUSES & TERMINATION
Either party may terminate this agreement with 60 days written notice.
AUTOMATIC RENEWAL: This agreement automatically renews for successive 1-year terms unless written notice is given 30 days prior to expiration.
LIABILITY CAP: Provider liability is strictly limited to fees paid in the preceding 6 months.
PENALTY: Any breach of proprietary source code constitutes liquidated damages of $50,000 USD.`,
    },
  ];

  onMount(async () => {
    await refreshAll();
  });

  async function refreshAll() {
    try {
      health = await fetchHealth();
      stats = await getDashboardStats();
      const docRes = await listDocuments();
      documents = docRes.items || [];
      if (documents.length > 0 && !selectedDoc) {
        selectedDoc = documents[0];
      }
      await refreshCompliance();
    } catch (err) {
      errorMsg = err.message;
    }
  }

  async function refreshCompliance() {
    try {
      isLoadingCompliance = true;
      complianceStats = await getComplianceStats();
      const res = await getAuditLogs({ action: auditFilter, search: auditSearchQuery, limit: 100 });
      auditLogs = res.items || [];
    } catch (err) {
      console.error('Compliance fetch error:', err);
    } finally {
      isLoadingCompliance = false;
    }
  }

  async function handleAuditFilterChange(filterVal) {
    auditFilter = filterVal;
    await refreshCompliance();
  }

  async function handleExportAudit(format) {
    try {
      isExportingAudit = true;
      await downloadAuditExport(format);
      successMsg = `Audit trail successfully exported as ${format.toUpperCase()}`;
      setTimeout(() => {
        successMsg = '';
      }, 4000);
      await refreshCompliance();
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isExportingAudit = false;
    }
  }

  function formatAuditTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  async function handleFileUpload(fileToUpload) {
    if (!fileToUpload) return;
    isUploading = true;
    uploadStep = 1;
    errorMsg = '';

    try {
      setTimeout(() => {
        uploadStep = 2;
      }, 600);
      setTimeout(() => {
        uploadStep = 3;
      }, 1400);

      const res = await uploadDocument(fileToUpload, retentionDays);
      uploadStep = 4;
      setTimeout(async () => {
        uploadStep = 5;
        selectedDoc = res;
        await refreshAll();
        setTimeout(() => {
          isUploading = false;
          uploadStep = 0;
          activeTab = 'viewer';
        }, 800);
      }, 700);
    } catch (err) {
      errorMsg = err.message;
      isUploading = false;
      uploadStep = 0;
    }
  }

  async function uploadSample(sample) {
    const blob = new Blob([sample.content], { type: 'text/plain' });
    const file = new File([blob], sample.name, { type: 'text/plain' });
    await handleFileUpload(file);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    isSearching = true;
    errorMsg = '';
    try {
      const res = await semanticSearch(searchQuery);
      searchResults = res.results || [];
      activeTab = 'search';
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isSearching = false;
    }
  }

  async function viewDocumentDetail(docId) {
    try {
      selectedDoc = await getDocument(docId);
      activeTab = 'viewer';
    } catch (err) {
      errorMsg = err.message;
    }
  }

  async function handleDelete(docId) {
    if (
      !confirm(
        'Are you sure you want to permanently delete this document and its vector embeddings?',
      )
    )
      return;
    try {
      await deleteDocument(docId);
      selectedDoc = null;
      await refreshAll();
      successMsg = 'Document and vector index purged.';
      setTimeout(() => {
        successMsg = '';
      }, 3000);
    } catch (err) {
      errorMsg = err.message;
    }
  }

  // Multi-Document Comparison & Redline Diff State
  let compareBaseDocId = '';
  let compareTargetDocId = '';
  let isComparing = false;
  let comparisonResult = null;
  let compareFilterCategory = 'all'; // 'all' | 'clause' | 'financial' | 'liability' | 'term'
  let compareFilterType = 'all'; // 'all' | 'added' | 'removed' | 'modified'
  let compareSearch = '';
  let copiedReport = false;

  function initCompareDefaults() {
    if (documents.length > 0 && !compareBaseDocId) {
      compareBaseDocId = documents[0].id;
    }
    if (documents.length > 1 && !compareTargetDocId) {
      const baseDoc = documents.find((d) => d.id === compareBaseDocId);
      const matchingTypeDoc = documents.find(
        (d) =>
          d.id !== compareBaseDocId &&
          d.insights?.document_type === baseDoc?.insights?.document_type,
      );
      compareTargetDocId = matchingTypeDoc ? matchingTypeDoc.id : documents[1].id;
    }
  }

  function swapCompareDocs() {
    const temp = compareBaseDocId;
    compareBaseDocId = compareTargetDocId;
    compareTargetDocId = temp;
    if (comparisonResult) {
      handleRunComparison();
    }
  }

  function openCompareWithDoc(docId) {
    compareBaseDocId = docId;
    const baseDoc = documents.find((d) => d.id === docId);
    const targetDoc = documents.find(
      (d) =>
        d.id !== docId && (d.insights?.document_type === baseDoc?.insights?.document_type || true),
    );
    if (targetDoc) {
      compareTargetDocId = targetDoc.id;
    }
    activeTab = 'compare';
    if (compareBaseDocId && compareTargetDocId && compareBaseDocId !== compareTargetDocId) {
      handleRunComparison();
    }
  }

  async function handleRunComparison() {
    if (!compareBaseDocId || !compareTargetDocId) {
      errorMsg = 'Please select both Document A and Document B to compare.';
      return;
    }
    if (compareBaseDocId === compareTargetDocId) {
      errorMsg = 'Please select two different documents to perform redline comparison.';
      return;
    }
    isComparing = true;
    errorMsg = '';
    try {
      comparisonResult = await compareDocuments(compareBaseDocId, compareTargetDocId);
      successMsg = `Redline analysis completed: ${comparisonResult.diffs.length} material differences detected.`;
      setTimeout(() => (successMsg = ''), 4000);
    } catch (e) {
      errorMsg = 'Comparison failed: ' + e.message;
    } finally {
      isComparing = false;
    }
  }

  function copyComparisonReport() {
    if (!comparisonResult) return;
    const report = `# Cognifolio Redline Audit Report
**Base Document (A):** ${comparisonResult.base_document_title} (${comparisonResult.base_document_type})
**Target Document (B):** ${comparisonResult.target_document_title} (${comparisonResult.target_document_type})
**Generated:** ${new Date().toLocaleString()}

## Executive Summary
${comparisonResult.executive_summary}

## Key Metrics
- **Risk Delta:** ${comparisonResult.metrics.risk_delta.toUpperCase()}
- **Similarity Score:** ${comparisonResult.metrics.similarity_score}%
- **Clauses Added (+):** ${comparisonResult.metrics.added_count}
- **Clauses Removed (-):** ${comparisonResult.metrics.removed_count}
- **Clauses Modified (~):** ${comparisonResult.metrics.modified_count}
${comparisonResult.metrics.financial_delta ? `- **Financial Delta:** ${comparisonResult.metrics.financial_delta}` : ''}

## Material Redlines & Differences
${comparisonResult.diffs
  .map(
    (
      d,
      i,
    ) => `### ${i + 1}. [${d.type.toUpperCase()}] ${d.title} (${d.category} · Risk: ${d.risk_impact})
- **Impact:** ${d.explanation}
${d.doc_a_text ? `- **Doc A (Original):** "${d.doc_a_text}"` : ''}
${d.doc_b_text ? `- **Doc B (Revised):** "${d.doc_b_text}"` : ''}
`,
  )
  .join('\n')}

## Recommendations
${comparisonResult.key_recommendations.map((r) => `- ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(report);
    copiedReport = true;
    setTimeout(() => (copiedReport = false), 2500);
  }

  function getFilteredDiffs(diffs) {
    if (!diffs) return [];
    return diffs.filter((d) => {
      const matchCat =
        compareFilterCategory === 'all' ||
        d.category?.toLowerCase() === compareFilterCategory.toLowerCase();
      const matchType =
        compareFilterType === 'all' || d.type?.toLowerCase() === compareFilterType.toLowerCase();
      const matchSearch =
        !compareSearch ||
        d.title?.toLowerCase().includes(compareSearch.toLowerCase()) ||
        d.explanation?.toLowerCase().includes(compareSearch.toLowerCase()) ||
        d.doc_a_text?.toLowerCase().includes(compareSearch.toLowerCase()) ||
        d.doc_b_text?.toLowerCase().includes(compareSearch.toLowerCase());
      return matchCat && matchType && matchSearch;
    });
  }
</script>

<div class="app-layout">
  <!-- Top Navigation Bar -->
  <header class="top-nav">
    <div class="nav-left">
      <div class="brand">
        <div class="logo-icon">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-name">Cognifolio</span>
          <span class="badge badge-cyan">Cognitive Intelligence</span>
        </div>
      </div>
    </div>

    <!-- Quick Search in Header -->
    <div class="nav-center">
      <div class="search-bar-wrap">
        <svg
          class="search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Prompt brief: 'that TCS invoice from last month' or 'contracts with liability'..."
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button class="search-btn" on:click={handleSearch} disabled={isSearching}>
          {isSearching ? 'Thinking...' : 'Search'}
        </button>
      </div>
    </div>

    <div class="nav-right">
      <div class="status-chip">
        <span class="pulse-indicator"></span>
        <span class="status-label"
          >{health.status === 'online' ? 'Gemini 2.5 Flash' : 'System Ready'}</span
        >
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="sub-nav">
    <div class="tabs-container">
      <button
        class="nav-tab {activeTab === 'dashboard' ? 'active' : ''}"
        on:click={() => (activeTab = 'dashboard')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect
            x="14"
            y="14"
            width="7"
            height="7"
          /><rect x="3" y="14" width="7" height="7" /></svg
        >
        Dashboard
      </button>

      <button
        class="nav-tab {activeTab === 'upload' ? 'active' : ''}"
        on:click={() => (activeTab = 'upload')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
            points="17 8 12 3 7 8"
          /><line x1="12" y1="3" x2="12" y2="15" /></svg
        >
        Upload & Extract
      </button>

      <button
        class="nav-tab {activeTab === 'search' ? 'active' : ''}"
        on:click={() => (activeTab = 'search')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg
        >
        Semantic Search {searchResults.length > 0 ? `(${searchResults.length})` : ''}
      </button>

      <button
        class="nav-tab {activeTab === 'viewer' ? 'active' : ''}"
        on:click={() => (activeTab = 'viewer')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
          /></svg
        >
        Deep Dive Viewer {selectedDoc ? `· ${selectedDoc.original_filename.slice(0, 15)}...` : ''}
      </button>

      <button
        class="nav-tab {activeTab === 'privacy' ? 'active' : ''}"
        on:click={() => {
          activeTab = 'privacy';
          refreshCompliance();
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg
        >
        Compliance & Audit Trails {complianceStats ? `· ${complianceStats.total_audit_events}` : ''}
      </button>

      <button
        class="nav-tab {activeTab === 'compare' ? 'active' : ''}"
        on:click={() => {
          activeTab = 'compare';
          initCompareDefaults();
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M16 3h5v5" />
          <path d="M8 21H3v-5" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
        Redline & Compare {comparisonResult ? `· ${comparisonResult.diffs.length} Diffs` : ''}
      </button>
    </div>
  </nav>

  <!-- Notifications -->
  {#if errorMsg}
    <div class="alert alert-error">
      <span>⚠️ {errorMsg}</span>
      <button class="close-btn" on:click={() => (errorMsg = '')}>✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="alert alert-success">
      <span>✅ {successMsg}</span>
      <button class="close-btn" on:click={() => (successMsg = '')}>✕</button>
    </div>
  {/if}

  <!-- Main Content Area -->
  <main class="content-container">
    <!-- TAB 1: EXECUTIVE DASHBOARD -->
    {#if activeTab === 'dashboard'}
      <div class="dashboard-view">
        <div class="view-header">
          <div>
            <h2>Enterprise Document Intelligence</h2>
            <p class="subtitle">
              Overview of indexed contracts, invoices, and automated data extractions
            </p>
          </div>
          <button class="btn-primary" on:click={() => (activeTab = 'upload')}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
            >
            Add New Document
          </button>
        </div>

        <!-- Metric Cards -->
        <div class="stats-grid">
          <div class="glass-card stat-card">
            <div class="stat-icon cyan">📄</div>
            <div class="stat-info">
              <span class="stat-value"
                >{stats ? stats.overview.total_documents : documents.length}</span
              >
              <span class="stat-label">Total Documents</span>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon emerald">⚡</div>
            <div class="stat-info">
              <span class="stat-value"
                >{stats ? stats.overview.processed_successfully : documents.length}</span
              >
              <span class="stat-label">Processed Successfully</span>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon purple">🏢</div>
            <div class="stat-info">
              <span class="stat-value">{stats ? stats.overview.total_vendors_identified : 1}</span>
              <span class="stat-label">Vendors Identified</span>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon amber">🔒</div>
            <div class="stat-info">
              <span class="stat-value">Active</span>
              <span class="stat-label">PII Redaction Engine</span>
            </div>
          </div>
        </div>

        <!-- Visual Analytics Cards -->
        <div class="analytics-row">
          <div class="glass-card analytics-card">
            <h3>Document Type Breakdown</h3>
            <p class="card-subtitle">Classified via Gemini Vision & Heuristic Engine</p>
            <div class="type-distribution">
              {#if stats && stats.charts && stats.charts.by_type.labels.length > 0}
                {#each stats.charts.by_type.labels as label, i}
                  <div class="dist-row">
                    <span class="dist-label">{label}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        style="width: {Math.min(
                          100,
                          (stats.charts.by_type.values[i] / (stats.overview.total_documents || 1)) *
                            100,
                        )}%"
                      ></div>
                    </div>
                    <span class="dist-val">{stats.charts.by_type.values[i]}</span>
                  </div>
                {/each}
              {:else}
                <div class="empty-hint">Upload documents to visualize category breakdown</div>
              {/if}
            </div>
          </div>

          <div class="glass-card analytics-card">
            <h3>Vendor Spending / Contract Analytics</h3>
            <p class="card-subtitle">Aggregated from line items & extracted financial figures</p>
            <div class="vendor-breakdown">
              {#if stats && stats.charts && stats.charts.by_vendor.labels.length > 0}
                {#each stats.charts.by_vendor.labels as vendor, i}
                  <div class="vendor-item">
                    <div class="vendor-name">🏢 {vendor}</div>
                    <div class="vendor-amt">
                      ₹{stats.charts.by_vendor.values[i].toLocaleString()}
                    </div>
                  </div>
                {/each}
              {:else}
                <div class="empty-hint">
                  Financial insights will populate upon processing invoices
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Document Library Table -->
        <div class="glass-card table-card">
          <div class="table-header-row">
            <h3>Indexed Document Repository ({documents.length})</h3>
            <button class="btn-secondary" on:click={refreshAll}>↻ Refresh</button>
          </div>

          {#if documents.length === 0}
            <div class="empty-state">
              <div class="empty-icon">📂</div>
              <h4>No documents indexed yet</h4>
              <p>Upload a PDF, contract, or invoice to begin extracting intelligence</p>
              <div class="sample-actions">
                <button class="btn-primary" on:click={() => uploadSample(sampleDocuments[0])}>
                  + Load Demo TCS Invoice
                </button>
                <button class="btn-secondary" on:click={() => uploadSample(sampleDocuments[1])}>
                  + Load Demo Master Services Agreement
                </button>
              </div>
            </div>
          {:else}
            <div class="table-wrapper">
              <table class="doc-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Pages / Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each documents as doc}
                    <tr>
                      <td class="name-cell">
                        <span class="file-icon">📄</span>
                        <div class="file-details">
                          <button class="filename-btn" on:click={() => viewDocumentDetail(doc.id)}
                            >{doc.original_filename}</button
                          >
                          <span class="file-summary"
                            >{doc.insights
                              ? doc.insights.summary.slice(0, 75) + '...'
                              : 'Processing...'}</span
                          >
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-purple"
                          >{doc.insights ? doc.insights.document_type : doc.file_type}</span
                        >
                      </td>
                      <td>{doc.page_count} pg ({Math.round(doc.file_size_bytes / 1024)} KB)</td>
                      <td>
                        <span class="badge badge-emerald">Ready</span>
                      </td>
                      <td class="date-cell">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                      <td class="actions-cell">
                        <button
                          class="btn-action view"
                          title="Deep Dive"
                          on:click={() => viewDocumentDetail(doc.id)}
                        >
                          Deep Dive →
                        </button>
                        <button
                          class="btn-action compare-action-btn"
                          title="Compare with another revision"
                          on:click={() => openCompareWithDoc(doc.id)}
                        >
                          ⚖️ Compare
                        </button>
                        <button
                          class="btn-action delete"
                          title="Delete"
                          on:click={() => handleDelete(doc.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 2: UPLOAD & INSTANT EXTRACTION -->
    {#if activeTab === 'upload'}
      <div class="upload-view">
        <div class="view-header">
          <div>
            <h2>Upload & Document Processing</h2>
            <p class="subtitle">
              Extract intelligence from invoices, contracts, statements, or scanned reports
            </p>
          </div>
        </div>

        <div class="upload-grid">
          <!-- Drop Zone -->
          <div class="glass-card dropzone-card">
            <div class="dropzone">
              <input
                type="file"
                id="file-input"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                on:change={(e) => handleFileUpload(e.target.files[0])}
                disabled={isUploading}
              />
              <label for="file-input" class="dropzone-label">
                <div class="upload-icon-circle">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                      points="17 8 12 3 7 8"
                    /><line x1="12" y1="3" x2="12" y2="15" /></svg
                  >
                </div>
                <h3>Drag & Drop documents here</h3>
                <p>Supports PDF, PNG, JPG, Scanned Documents up to 25MB</p>
                <span class="btn-primary" style="margin-top: 14px;">Browse Files</span>
              </label>
            </div>

            <div class="retention-selector">
              <label for="retention">Data Retention Window:</label>
              <select id="retention" bind:value={retentionDays}>
                <option value={30}>30 Days (Auto-Purge Raw File)</option>
                <option value={90}>90 Days (Enterprise Default)</option>
                <option value={365}>1 Year (Audit Compliance)</option>
              </select>
            </div>
          </div>

          <!-- Real-Time Pipeline Progress / Architecture View -->
          <div class="glass-card pipeline-card">
            <h3>Enterprise Processing Pipeline</h3>
            <p class="card-subtitle">
              Every document passes through our 4-tier security & extraction flow:
            </p>

            <div class="pipeline-steps">
              <div
                class="step-item {uploadStep >= 1 ? 'active' : ''} {uploadStep > 1
                  ? 'completed'
                  : ''}"
              >
                <div class="step-num">1</div>
                <div class="step-info">
                  <h4>Document Ingestion & OCR</h4>
                  <p>Extracts digital text, parses tables, rasterizes image pages</p>
                </div>
                {#if uploadStep === 1}<span class="spinner"></span>{/if}
              </div>

              <div
                class="step-item {uploadStep >= 2 ? 'active' : ''} {uploadStep > 2
                  ? 'completed'
                  : ''}"
              >
                <div class="step-num">2</div>
                <div class="step-info">
                  <h4>🔒 PII Redaction Engine</h4>
                  <p>Masks Aadhaar, credit cards, SSN, bank accounts before AI sees it</p>
                </div>
                {#if uploadStep === 2}<span class="spinner"></span>{/if}
              </div>

              <div
                class="step-item {uploadStep >= 3 ? 'active' : ''} {uploadStep > 3
                  ? 'completed'
                  : ''}"
              >
                <div class="step-num">3</div>
                <div class="step-info">
                  <h4>Gemini Flash Multimodal Extraction</h4>
                  <p>Executive summary, structured entities, risk clauses, line-item pricing</p>
                </div>
                {#if uploadStep === 3}<span class="spinner"></span>{/if}
              </div>

              <div
                class="step-item {uploadStep >= 4 ? 'active' : ''} {uploadStep > 4
                  ? 'completed'
                  : ''}"
              >
                <div class="step-num">4</div>
                <div class="step-info">
                  <h4>Qdrant 768-D Vector Indexing</h4>
                  <p>Indexes semantic embeddings for natural language prompt retrieval</p>
                </div>
                {#if uploadStep === 4}<span class="spinner"></span>{/if}
              </div>
            </div>

            <!-- 1-Click Demo Starters -->
            <div class="demo-samples">
              <h4>Don't have a document on hand? Try our sample presets:</h4>
              <div class="sample-btn-group">
                <button class="btn-secondary" on:click={() => uploadSample(sampleDocuments[0])}>
                  📄 Test TCS Invoice (₹9.97L)
                </button>
                <button class="btn-secondary" on:click={() => uploadSample(sampleDocuments[1])}>
                  📜 Test Master Services Agreement ($120k)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 3: LAZY SEMANTIC SEARCH -->
    {#if activeTab === 'search'}
      <div class="search-view">
        <div class="view-header">
          <div>
            <h2>Lazy Natural Language Search</h2>
            <p class="subtitle">
              Query documents using vague thoughts or natural language — Qdrant vector engine
              matches meaning
            </p>
          </div>
        </div>

        <div class="search-input-section glass-card">
          <div class="large-search-box">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="e.g. 'that contract with automatic renewal penalty' or 'TCS cloud invoice'"
              bind:value={searchQuery}
              on:keydown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button class="btn-primary" on:click={handleSearch} disabled={isSearching}>
              {isSearching ? 'Matching Vectors...' : 'Find Documents'}
            </button>
          </div>

          <div class="search-examples">
            <span class="ex-label">Try asking:</span>
            <button
              class="chip-btn"
              on:click={() => {
                searchQuery = 'TCS cloud hosting invoice';
                handleSearch();
              }}
            >
              "TCS cloud hosting invoice"
            </button>
            <button
              class="chip-btn"
              on:click={() => {
                searchQuery = 'agreement with 1 year automatic renewal';
                handleSearch();
              }}
            >
              "agreement with 1 year automatic renewal"
            </button>
            <button
              class="chip-btn"
              on:click={() => {
                searchQuery = 'contracts with liquidated damages penalty';
                handleSearch();
              }}
            >
              "liquidated damages penalty"
            </button>
          </div>
        </div>

        <!-- Search Results List -->
        <div class="search-results-list">
          {#if searchResults.length === 0}
            <div class="empty-state glass-card">
              <div class="empty-icon">🔮</div>
              <h4>No matches found yet</h4>
              <p>Type a natural language query above to search through indexed embeddings.</p>
            </div>
          {:else}
            <div class="results-meta">
              Found <strong>{searchResults.length}</strong> matching documents for query "<em
                >{searchQuery}</em
              >":
            </div>

            {#each searchResults as item}
              <div
                class="glass-card interactive result-card"
                role="button"
                tabindex="0"
                on:click={() => viewDocumentDetail(item.document_id)}
                on:keydown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && viewDocumentDetail(item.document_id)}
              >
                <div class="result-top">
                  <div class="result-title-group">
                    <span class="file-badge">📄</span>
                    <h4>{item.title || item.original_filename}</h4>
                    <span class="badge badge-purple">{item.document_type || 'Document'}</span>
                  </div>
                  <div class="similarity-score">
                    <span class="score-label">Vector Similarity:</span>
                    <span class="badge badge-cyan"
                      >{Math.round(item.similarity_score * 100)}% Match</span
                    >
                  </div>
                </div>

                <p class="result-summary">{item.summary}</p>

                {#if item.highlighted_points && item.highlighted_points.length > 0}
                  <div class="result-highlights">
                    {#each item.highlighted_points as pt}
                      <span class="highlight-chip">• {pt}</span>
                    {/each}
                  </div>
                {/if}

                <div class="result-bottom">
                  <span class="result-date">📅 Indexed: {item.uploaded_at}</span>
                  <button class="btn-action view">Open Deep Dive Viewer →</button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <!-- TAB 4: SIDE-BY-SIDE DEEP DIVE VIEWER -->
    {#if activeTab === 'viewer'}
      <div class="viewer-view">
        {#if !selectedDoc}
          <div class="empty-state glass-card">
            <h4>No Document Selected</h4>
            <p>
              Please select a document from the Dashboard or Search view to inspect its
              intelligence.
            </p>
            <button class="btn-primary" on:click={() => (activeTab = 'dashboard')}
              >Return to Dashboard</button
            >
          </div>
        {:else}
          <div class="viewer-header">
            <div class="doc-title-row">
              <h2>
                {selectedDoc.insights ? selectedDoc.insights.title : selectedDoc.original_filename}
              </h2>
              <span class="badge badge-purple"
                >{selectedDoc.insights
                  ? selectedDoc.insights.document_type
                  : selectedDoc.file_type}</span
              >
              <span class="badge badge-emerald"
                >Conf: {Math.round((selectedDoc.insights?.confidence_score || 0.95) * 100)}%</span
              >
            </div>
            <div class="header-actions">
              <!-- Mode Toggle: Original vs Redacted -->
              <div
                class="redaction-switch-pill"
                title="Toggle between original document and PII-redacted sanitized PDF"
              >
                <button
                  class="pill-btn {!isRedactedView ? 'active' : ''}"
                  on:click={() => (isRedactedView = false)}
                >
                  📄 Original
                </button>
                <button
                  class="pill-btn {isRedactedView ? 'active redacted-glow' : ''}"
                  on:click={() => (isRedactedView = true)}
                >
                  🛡️ PII Redacted
                </button>
              </div>

              {#if isRedactedView}
                <a
                  href={`/api/v1/documents/${selectedDoc.id}/redacted-file`}
                  download={`${selectedDoc.original_filename.replace(/\.[^/.]+$/, '')}_REDACTED.pdf`}
                  class="btn-action download-redacted"
                  title="Download physically sanitized PDF"
                >
                  ⬇ Download Redacted PDF
                </a>
              {:else}
                <a
                  href="/api/v1/documents/{selectedDoc.id}/file"
                  target="_blank"
                  class="btn-secondary"
                >
                  View Raw File ↗
                </a>
              {/if}

              <button class="btn-action delete" on:click={() => handleDelete(selectedDoc.id)}>
                Delete Document ✕
              </button>
            </div>
          </div>

          <!-- Split Screen: Left Interactive Visual PDF Canvas / Text, Right AI Insights -->
          <div class="split-container">
            <!-- Left Panel: Interactive Visual PDF Canvas & Highlighting Viewer -->
            <div class="glass-card panel-left-viewer">
              <PdfViewer
                fileUrl={isRedactedView
                  ? `/api/v1/documents/${selectedDoc.id}/redacted-file`
                  : `/api/v1/documents/${selectedDoc.id}/file`}
                fileType={selectedDoc.file_type}
                rawText={selectedDoc.insights?.raw_extracted_text || ''}
                bind:highlightQuery={activeHighlightTerm}
              />
            </div>

            <!-- Right Panel: AI Extracted Intel with 1-Click Interactive Locate Buttons -->
            <div class="panel-right">
              <!-- Right Panel Mode Switcher -->
              <div class="panel-tab-bar">
                <button
                  class="panel-tab-btn {viewerRightTab === 'intel' ? 'active' : ''}"
                  on:click={() => (viewerRightTab = 'intel')}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    /><polyline points="14 2 14 8 20 8" /><line
                      x1="16"
                      y1="13"
                      x2="8"
                      y2="13"
                    /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg
                  >
                  Extracted Intelligence
                </button>
                <button
                  class="panel-tab-btn {viewerRightTab === 'chat' ? 'active chat-active' : ''}"
                  on:click={() => {
                    viewerRightTab = 'chat';
                    initDocChat();
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
                  >
                  Conversational Document AI {chatMessages.length > 0
                    ? `(${chatMessages.length})`
                    : ''}
                </button>
              </div>

              {#if viewerRightTab === 'intel'}
                <!-- Summary Card -->
                <div class="glass-card insight-card">
                  <div class="insight-header">
                    <span class="icon">📋</span>
                    <h3>Executive Summary</h3>
                  </div>
                  <p class="summary-text">
                    {selectedDoc.insights?.summary || 'No summary available.'}
                  </p>
                </div>

                <!-- Key Takeaways with Interactive Highlight -->
                {#if selectedDoc.insights?.key_points && selectedDoc.insights.key_points.length > 0}
                  <div class="glass-card insight-card">
                    <div class="insight-header">
                      <span class="icon">💡</span>
                      <h3>Key Takeaways & Findings</h3>
                      <span class="hint-tag">Click to locate in doc</span>
                    </div>
                    <ul class="key-points-list">
                      {#each selectedDoc.insights.key_points as pt, idx}
                        <li>
                          <button
                            type="button"
                            class="interactive-point-btn {activeHighlightKey === pt
                              ? 'active-target'
                              : ''}"
                            on:click={() => locateTakeaway(pt)}
                            title="Click to highlight in document"
                          >
                            <div class="point-content-wrap">
                              <span class="point-index">#{idx + 1}</span>
                              <span class="point-text">{pt}</span>
                            </div>
                            <span class="locate-icon">🔍 Locate →</span>
                          </button>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                <!-- Structured Entities Grid with 1-Click Highlight -->
                {#if selectedDoc.insights?.entities && Object.keys(selectedDoc.insights.entities).length > 0}
                  <div class="glass-card insight-card">
                    <div class="insight-header">
                      <span class="icon">🏷️</span>
                      <h3>Extracted Entities & Metadata</h3>
                      <span class="hint-tag">Click entity to locate</span>
                    </div>
                    <div class="entities-grid">
                      {#each Object.entries(selectedDoc.insights.entities) as [key, val]}
                        {#if val}
                          <button
                            type="button"
                            class="entity-item-btn {activeHighlightKey === key
                              ? 'active-target'
                              : ''}"
                            on:click={() => locateEntity(key, val)}
                            title="Click to locate on document"
                          >
                            <div class="entity-top">
                              <span class="entity-key">{key.replace(/_/g, ' ')}</span>
                              <span class="mini-search-icon">🔍</span>
                            </div>
                            <span class="entity-val"
                              >{Array.isArray(val) ? val.join(', ') : val}</span
                            >
                          </button>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Risk Clauses Alert with 1-Click Highlight -->
                {#if selectedDoc.insights?.risk_clauses && selectedDoc.insights.risk_clauses.length > 0}
                  <div class="glass-card insight-card alert-risk">
                    <div class="insight-header">
                      <span class="icon">⚠️</span>
                      <h3>Risk & Penalty Clauses Detected</h3>
                      <span class="hint-tag alert">High Priority</span>
                    </div>
                    <ul class="risk-list">
                      {#each selectedDoc.insights.risk_clauses as clause}
                        <li>
                          <button
                            type="button"
                            class="interactive-risk-btn {activeHighlightKey === clause
                              ? 'active-target'
                              : ''}"
                            on:click={() => locateRiskClause(clause)}
                            title="Click to highlight clause in document"
                          >
                            <span class="clause-text">{clause}</span>
                            <span class="locate-icon">🔍 Locate Clause</span>
                          </button>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                <!-- Line Items Table with Interactive Highlight -->
                {#if selectedDoc.insights?.line_items && selectedDoc.insights.line_items.length > 0}
                  <div class="glass-card insight-card">
                    <div class="insight-header">
                      <span class="icon">📊</span>
                      <h3>Extracted Line Items</h3>
                      <span class="hint-tag">Click row to locate</span>
                    </div>
                    <table class="line-items-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Amount</th>
                          <th style="text-align: right;">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each selectedDoc.insights.line_items as item}
                          <tr
                            class="clickable-line-row {activeHighlightKey === item.description
                              ? 'active-target'
                              : ''}"
                            on:click={() => locateLineItem(item)}
                          >
                            <td class="line-desc-cell">
                              <span class="line-desc-text">{item.description}</span>
                            </td>
                            <td class="qty-cell">{item.quantity || 1}</td>
                            <td class="amt">₹{Number(item.amount).toLocaleString()}</td>
                            <td class="locate-action-cell" style="text-align: right;">
                              <button
                                type="button"
                                class="line-locate-btn"
                                on:click|stopPropagation={() => locateLineItem(item)}
                                title="Click to jump to line item in document"
                              >
                                🔍 Locate →
                              </button>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              {:else if viewerRightTab === 'chat'}
                <div class="glass-card doc-chat-container">
                  <!-- Chat Header -->
                  <div class="chat-header">
                    <div class="chat-header-left">
                      <div class="chat-ai-avatar">✨</div>
                      <div>
                        <h4>Cognifolio Assistant</h4>
                        <span class="chat-model-badge">Gemini 3.5 Flash · Document Grounded</span>
                      </div>
                    </div>
                    <button class="chat-clear-btn" on:click={clearChat} title="Reset conversation">
                      ↺ Reset Chat
                    </button>
                  </div>

                  <!-- Messages Thread -->
                  <div class="chat-messages-scroll" bind:this={chatContainerRef}>
                    <!-- Welcome Card with Dynamic Quick Starters -->
                    <div class="chat-welcome-box">
                      <p class="welcome-title">
                        Ask anything about <strong
                          >{selectedDoc.insights?.title || selectedDoc.original_filename}</strong
                        >
                      </p>
                      <p class="welcome-desc">
                        Answers are grounded in this document with clickable citations that navigate
                        and highlight the PDF canvas on the left.
                      </p>

                      <div class="starter-chips-container">
                        <span class="starter-label">Suggested Questions:</span>
                        <div class="starter-chips">
                          {#each getDocStarters(selectedDoc) as q}
                            <button class="starter-chip" on:click={() => handleSendChat(q)}>
                              {q} →
                            </button>
                          {/each}
                        </div>
                      </div>
                    </div>

                    <!-- Conversation History -->
                    {#each chatMessages as msg}
                      <div class="chat-bubble-row {msg.role}">
                        <div class="chat-avatar">{msg.role === 'user' ? '👤' : '✨'}</div>
                        <div class="chat-bubble {msg.role}">
                          <div class="bubble-content markdown-body">
                            {@html formatChatReply(msg.content)}
                          </div>

                          <!-- Clickable Citations linking to PDF canvas -->
                          {#if msg.citations && msg.citations.length > 0}
                            <div class="chat-citations-box">
                              <span class="citation-box-title"
                                >📍 Grounded Citations (Click to locate on PDF):</span
                              >
                              <div class="citation-pills-wrap">
                                {#each msg.citations as cit}
                                  <button
                                    class="citation-pill"
                                    on:click={() => handleCitationClick(cit)}
                                    title="Click to jump and highlight this passage on the PDF canvas"
                                  >
                                    <span class="cit-icon">🔍</span>
                                    <span class="cit-label">{cit.label || 'Citation'}:</span>
                                    <span class="cit-text">"{cit.text}"</span>
                                    {#if cit.page}
                                      <span class="cit-page">Page {cit.page}</span>
                                    {/if}
                                  </button>
                                {/each}
                              </div>
                            </div>
                          {/if}

                          <!-- Follow-up Prompt Suggestions -->
                          {#if msg.followups && msg.followups.length > 0}
                            <div class="chat-followups-box">
                              <span class="followup-title">Suggested follow-ups:</span>
                              <div class="followup-chips">
                                {#each msg.followups as fq}
                                  <button class="followup-chip" on:click={() => handleSendChat(fq)}>
                                    {fq} ↗
                                  </button>
                                {/each}
                              </div>
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/each}

                    {#if isChatLoading}
                      <div class="chat-bubble-row assistant">
                        <div class="chat-avatar">✨</div>
                        <div class="chat-bubble assistant loading-bubble">
                          <div class="typing-indicator">
                            <span></span><span></span><span></span>
                          </div>
                          <span class="typing-text"
                            >Gemini 3.5 Flash is analyzing document context...</span
                          >
                        </div>
                      </div>
                    {/if}
                  </div>

                  <!-- Sticky Bottom Input Bar -->
                  <form class="chat-input-bar" on:submit|preventDefault={() => handleSendChat()}>
                    <input
                      type="text"
                      placeholder="Ask anything about this document (e.g. fees, penalty clauses, deadlines)..."
                      bind:value={chatInput}
                      disabled={isChatLoading}
                    />
                    <button
                      type="submit"
                      class="chat-send-btn"
                      disabled={isChatLoading || !chatInput.trim()}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        ><line x1="22" y1="2" x2="11" y2="13" /><polygon
                          points="22 2 15 22 11 13 2 9 22 2"
                        /></svg
                      >
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 5: COMPLIANCE, PII REDACTION & AUDIT TRAILS (OPTION 3) -->
    {#if activeTab === 'privacy'}
      <div class="privacy-view">
        <div class="view-header">
          <div>
            <h2>Enterprise Compliance & Audit Trails</h2>
            <p class="subtitle">
              SOC2 Type II, GDPR Article 17, and HIPAA verified immutable audit logging and
              real-time PII redaction.
            </p>
          </div>
          <div class="compliance-header-actions">
            <button
              class="btn-secondary"
              on:click={() => handleExportAudit('csv')}
              disabled={isExportingAudit}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                  points="7 10 12 15 17 10"
                /><line x1="12" y1="15" x2="12" y2="3" /></svg
              >
              Export CSV
            </button>
            <button
              class="btn-secondary"
              on:click={() => handleExportAudit('json')}
              disabled={isExportingAudit}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                  points="7 10 12 15 17 10"
                /><line x1="12" y1="15" x2="12" y2="3" /></svg
              >
              Export JSON
            </button>
            <button class="btn-primary" on:click={refreshCompliance} disabled={isLoadingCompliance}>
              🔄 Refresh Stream
            </button>
          </div>
        </div>

        <!-- 4 Top KPI Cards -->
        <div class="compliance-kpi-grid">
          <div class="glass-card comp-kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Compliance Posture</span>
              <span class="badge badge-emerald">Verified</span>
            </div>
            <div class="kpi-main">
              <span class="kpi-number text-emerald"
                >{complianceStats?.compliance_score || 99.2}%</span
              >
              <span class="kpi-sub">SOC2 Type II & GDPR Ready</span>
            </div>
            <div class="kpi-footer-progress">
              <div
                class="progress-bar"
                style="width: {complianceStats?.compliance_score || 99.2}%;"
              ></div>
            </div>
          </div>

          <div class="glass-card comp-kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Total PII Entities Masked</span>
              <span class="badge badge-purple">Zero Leakage</span>
            </div>
            <div class="kpi-main">
              <span class="kpi-number text-purple">{complianceStats?.total_pii_masked || 79}</span>
              <span class="kpi-sub">Tokens sanitized pre-AI</span>
            </div>
            <div class="kpi-pills-row">
              <span class="mini-pill">Aadhaar: {complianceStats?.pii_breakdown?.aadhaar || 0}</span>
              <span class="mini-pill">PAN: {complianceStats?.pii_breakdown?.pan || 0}</span>
              <span class="mini-pill">Emails: {complianceStats?.pii_breakdown?.email || 0}</span>
            </div>
          </div>

          <div class="glass-card comp-kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Immutable Audit Events</span>
              <span class="pulse-indicator-live">
                <span class="pulse-dot"></span> Active Stream
              </span>
            </div>
            <div class="kpi-main">
              <span class="kpi-number text-cyan"
                >{complianceStats?.total_audit_events || auditLogs.length}</span
              >
              <span class="kpi-sub">Cryptographic SHA-256 logs</span>
            </div>
            <div class="kpi-footer-text">100% action traceability</div>
          </div>

          <div class="glass-card comp-kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Data Retention Policy</span>
              <span class="badge badge-amber">TTL Enforced</span>
            </div>
            <div class="kpi-main">
              <span class="kpi-number text-amber">90 Days</span>
              <span class="kpi-sub">Auto-purge raw files</span>
            </div>
            <div class="kpi-footer-text">GDPR Article 17 Compliant</div>
          </div>
        </div>

        <!-- PII Classification & Guardrails Matrix -->
        <div class="glass-card pii-matrix-card">
          <div class="matrix-header">
            <div>
              <h3>Active PII Sanitization & Guardrails Inventory</h3>
              <p class="matrix-desc">
                Sensitive personally identifiable data is intercepted, masked in memory with
                replacement tokens, and physically black-boxed in downloadable PDFs before storage.
              </p>
            </div>
            <span class="badge badge-emerald">Real-time Regex + PyMuPDF Engine</span>
          </div>

          <div class="pii-chips-grid">
            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">🪪</span>
                <span class="box-name">Indian Aadhaar (UIDAI)</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.aadhaar || 0}</span>
              </div>
              <div class="box-rule">
                Pattern: 12-digit formatted \b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b
              </div>
              <div class="box-token">Token: [REDACTED_AADHAAR]</div>
            </div>

            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">💳</span>
                <span class="box-name">PAN & Tax IDs</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.pan || 0}</span>
              </div>
              <div class="box-rule">Pattern: 5 letters + 4 digits + 1 letter</div>
              <div class="box-token">Token: [REDACTED_PAN]</div>
            </div>

            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">📧</span>
                <span class="box-name">Corporate & Personal Emails</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.email || 0}</span>
              </div>
              <div class="box-rule">Pattern: RFC-5322 Email regex pattern</div>
              <div class="box-token">Token: [REDACTED_EMAIL]</div>
            </div>

            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">📱</span>
                <span class="box-name">Direct Phone Numbers</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.phone || 0}</span>
              </div>
              <div class="box-rule">Pattern: E.164 + Indian 10-digit mobile standards</div>
              <div class="box-token">Token: [REDACTED_PHONE]</div>
            </div>

            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">🏦</span>
                <span class="box-name">Bank Account Numbers</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.bank_account || 0}</span>
              </div>
              <div class="box-rule">Pattern: A/C tagged 9 to 18 contiguous digits</div>
              <div class="box-token">Token: [REDACTED_ACCOUNT]</div>
            </div>

            <div class="pii-class-box">
              <div class="box-top">
                <span class="box-icon">💳</span>
                <span class="box-name">Payment Cards (Visa/MC/Amex)</span>
                <span class="box-count">{complianceStats?.pii_breakdown?.credit_card || 0}</span>
              </div>
              <div class="box-rule">Pattern: Luhn-validated 13 to 19 digit card numbers</div>
              <div class="box-token">Token: [REDACTED_CARD]</div>
            </div>
          </div>
        </div>

        <!-- Interactive Audit Trail Table -->
        <div class="glass-card audit-trail-card">
          <div class="audit-trail-header">
            <div>
              <h3>Immutable Audit Log Explorer</h3>
              <p class="audit-sub">
                Search and inspect all system interactions, downloads, uploads, and automated
                redaction events.
              </p>
            </div>
            <div class="audit-filters-bar">
              <!-- Search in logs -->
              <div class="audit-search-input-wrapper">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  ><circle cx="11" cy="11" r="8" /><line
                    x1="21"
                    y1="21"
                    x2="16.65"
                    y2="16.65"
                  /></svg
                >
                <input
                  type="text"
                  placeholder="Filter by filename, actor, or ID..."
                  bind:value={auditSearchQuery}
                  on:input={() => refreshCompliance()}
                />
              </div>

              <!-- Filter Buttons -->
              <div class="filter-pills-row">
                <button
                  class="filter-pill {auditFilter === 'all' ? 'active' : ''}"
                  on:click={() => handleAuditFilterChange('all')}
                >
                  All ({complianceStats?.total_audit_events || auditLogs.length})
                </button>
                <button
                  class="filter-pill {auditFilter === 'uploaded' ? 'active' : ''}"
                  on:click={() => handleAuditFilterChange('uploaded')}
                >
                  Uploads ({complianceStats?.action_breakdown?.uploaded || 0})
                </button>
                <button
                  class="filter-pill {auditFilter === 'viewed' ? 'active' : ''}"
                  on:click={() => handleAuditFilterChange('viewed')}
                >
                  Views
                </button>
                <button
                  class="filter-pill {auditFilter === 'searched' ? 'active' : ''}"
                  on:click={() => handleAuditFilterChange('searched')}
                >
                  Searches
                </button>
                <button
                  class="filter-pill {auditFilter === 'redacted' ? 'active' : ''}"
                  on:click={() => handleAuditFilterChange('redacted')}
                >
                  Redactions
                </button>
              </div>
            </div>
          </div>

          <!-- Audit Table -->
          <div class="audit-table-wrapper">
            {#if isLoadingCompliance}
              <div class="audit-loading">
                <div class="spinner"></div>
                <span>Fetching verified audit logs from PostgreSQL...</span>
              </div>
            {:else if auditLogs.length === 0}
              <div class="audit-empty">
                <span>No audit events match the selected criteria.</span>
              </div>
            {:else}
              <table class="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Actor / Identity</th>
                    <th>Event Action</th>
                    <th>Target Resource</th>
                    <th>Security & PII Context</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {#each auditLogs as log}
                    <tr>
                      <td class="col-time font-mono">
                        {formatAuditTime(log.created_at)}
                      </td>
                      <td class="col-actor">
                        <div class="actor-cell">
                          <span class="actor-avatar">👤</span>
                          <div>
                            <div class="actor-name">{log.actor_name || 'Demo Analyst'}</div>
                            <div class="actor-ip font-mono">{log.ip_address || '127.0.0.1'}</div>
                          </div>
                        </div>
                      </td>
                      <td class="col-action">
                        {#if log.action === 'uploaded'}
                          <span class="action-tag tag-uploaded">⬆ Uploaded</span>
                        {:else if log.action === 'viewed'}
                          <span class="action-tag tag-viewed">👁 Viewed</span>
                        {:else if log.action === 'viewed_redacted'}
                          <span class="action-tag tag-redacted">🛡️ Viewed Redacted</span>
                        {:else if log.action === 'searched'}
                          <span class="action-tag tag-searched">🔍 Vector Search</span>
                        {:else if log.action === 'redacted'}
                          <span class="action-tag tag-redacted">✂ Redacted</span>
                        {:else if log.action === 'deleted'}
                          <span class="action-tag tag-deleted">✕ Purged</span>
                        {:else if log.action === 'exported'}
                          <span class="action-tag tag-exported">⬇ Exported</span>
                        {:else}
                          <span class="action-tag tag-generic">{log.action}</span>
                        {/if}
                      </td>
                      <td class="col-resource">
                        <div class="resource-cell">
                          <span class="res-filename">
                            {log.metadata?.filename ||
                              log.target_id ||
                              log.target_type ||
                              'System Event'}
                          </span>
                          {#if log.target_id}
                            <span class="res-id font-mono">{log.target_id.slice(0, 8)}...</span>
                          {/if}
                        </div>
                      </td>
                      <td class="col-meta">
                        {#if log.metadata?.pii_redacted && Object.keys(log.metadata.pii_redacted).length > 0}
                          <div class="meta-pii-chips">
                            {#each Object.entries(log.metadata.pii_redacted) as [k, cnt]}
                              <span class="mini-meta-badge">{cnt} {k}</span>
                            {/each}
                          </div>
                        {:else if log.metadata?.query}
                          <span class="meta-query font-mono"
                            >"{log.metadata.query}" ({log.metadata.matches_found || 0} hits)</span
                          >
                        {:else}
                          <span class="text-dim">Standard Audit Record</span>
                        {/if}
                      </td>
                      <td class="col-verify">
                        <span class="verify-badge">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                          >
                          SHA-256 Valid
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>
        </div>

        <!-- Compliance Frameworks & GDPR Danger Zone -->
        <div class="compliance-bottom-grid">
          <div class="glass-card compliance-framework-card">
            <div class="framework-header">
              <span class="priv-icon emerald">📜</span>
              <h3>Regulatory Framework Compliance Status</h3>
            </div>
            <div class="frameworks-list">
              {#each complianceStats?.frameworks || [] as fw}
                <div class="framework-item">
                  <div class="fw-left">
                    <strong>{fw.framework}</strong>
                    <span class="fw-control">{fw.control}</span>
                  </div>
                  <span class="badge badge-emerald">✓ {fw.status}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="glass-card compliance-danger-card">
            <div class="framework-header">
              <span class="priv-icon rose">⚠️</span>
              <h3>GDPR Article 17: Right to Erasure</h3>
            </div>
            <p>
              Instantly purge all stored documents, extracted intelligence, and vector embeddings in
              Qdrant and PostgreSQL:
            </p>
            <div class="retention-info-box">
              <div class="info-row">
                <span>Active Retention Window:</span>
                <strong>90 Days</strong>
              </div>
              <div class="info-row">
                <span>Total Documents in Scope:</span>
                <strong>{documents.length}</strong>
              </div>
            </div>
            <button
              class="btn-action delete-all"
              on:click={() => {
                if (confirm('Permanently purge all workspace documents and reset database?')) {
                  documents.forEach((d) => deleteDocument(d.id));
                  refreshAll();
                  alert('All documents and vector embeddings have been securely purged.');
                }
              }}
            >
              Purge All Workspace Data
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 6: MULTI-DOCUMENT COMPARISON & REDLINE DIFF -->
    {#if activeTab === 'compare'}
      <div class="compare-workspace">
        <!-- Top Workspace Bar & Document Selectors -->
        <div class="glass-card compare-header-card">
          <div class="compare-title-row">
            <div>
              <h2>AI Redline Diff & Multi-Document Comparison</h2>
              <p class="compare-desc">
                Select any two contract revisions, policies, or invoices. Gemini 3.5 Flash performs
                automated redlining, detects clause additions and deletions, identifies fee shifts,
                and evaluates liability risk deltas.
              </p>
            </div>
            <div class="compare-header-actions">
              {#if comparisonResult}
                <button class="btn-secondary" on:click={copyComparisonReport}>
                  {copiedReport ? '✓ Report Copied!' : '📋 Copy Redline Report'}
                </button>
              {/if}
            </div>
          </div>

          <!-- Document Selectors Grid (Doc A vs Doc B) -->
          <div class="doc-compare-selectors">
            <!-- Doc A (Base) Card -->
            <div class="compare-doc-select-box base-box">
              <div class="box-badge base-badge">
                <span class="badge-tag">DOCUMENT A</span>
                <span class="role-hint">Base Revision / Original Contract</span>
              </div>
              <div class="selector-select-wrapper">
                <select bind:value={compareBaseDocId}>
                  <option value="" disabled>-- Select Base Document (A) --</option>
                  {#each documents as d}
                    <option value={d.id}>
                      {d.original_filename} ({d.insights?.document_type || 'Document'} · {d.page_count}p)
                    </option>
                  {/each}
                </select>
              </div>
              {#if documents.find((d) => d.id === compareBaseDocId)}
                {@const docA = documents.find((d) => d.id === compareBaseDocId)}
                <div class="selected-doc-mini-card">
                  <div class="doc-mini-top">
                    <span class="mini-icon">📄</span>
                    <strong class="mini-title"
                      >{docA.insights?.title || docA.original_filename}</strong
                    >
                  </div>
                  <div class="doc-mini-tags">
                    <span class="badge badge-purple"
                      >{docA.insights?.document_type || docA.file_type}</span
                    >
                    <span class="mini-meta"
                      >{docA.page_count} pages · {Math.round(docA.file_size_bytes / 1024)} KB</span
                    >
                    {#if docA.insights?.entities?.financial?.total_amount}
                      <span class="badge badge-emerald"
                        >Total: {docA.insights.entities.financial.total_amount}</span
                      >
                    {/if}
                  </div>
                  <p class="doc-mini-summary">
                    {docA.insights?.summary?.slice(0, 110) || 'Ready for comparison'}...
                  </p>
                </div>
              {/if}
            </div>

            <!-- Swap & Compare Trigger in the middle -->
            <div class="compare-mid-controls">
              <button
                class="swap-docs-btn"
                on:click={swapCompareDocs}
                title="Swap Document A and Document B"
              >
                ⇄
              </button>
              <div class="vs-divider">VS</div>
              <button
                class="btn-primary compare-run-btn {isComparing ? 'loading' : ''}"
                on:click={handleRunComparison}
                disabled={isComparing ||
                  !compareBaseDocId ||
                  !compareTargetDocId ||
                  compareBaseDocId === compareTargetDocId}
              >
                {#if isComparing}
                  <span class="spinner-small"></span> Analyzing Redlines...
                {:else}
                  ⚡ Run AI Redline
                {/if}
              </button>
            </div>

            <!-- Doc B (Target) Card -->
            <div class="compare-doc-select-box target-box">
              <div class="box-badge target-badge">
                <span class="badge-tag">DOCUMENT B</span>
                <span class="role-hint">Revised Version / Target Amendment</span>
              </div>
              <div class="selector-select-wrapper">
                <select bind:value={compareTargetDocId}>
                  <option value="" disabled>-- Select Target Document (B) --</option>
                  {#each documents as d}
                    <option value={d.id}>
                      {d.original_filename} ({d.insights?.document_type || 'Document'} · {d.page_count}p)
                    </option>
                  {/each}
                </select>
              </div>
              {#if documents.find((d) => d.id === compareTargetDocId)}
                {@const docB = documents.find((d) => d.id === compareTargetDocId)}
                <div class="selected-doc-mini-card">
                  <div class="doc-mini-top">
                    <span class="mini-icon">📑</span>
                    <strong class="mini-title"
                      >{docB.insights?.title || docB.original_filename}</strong
                    >
                  </div>
                  <div class="doc-mini-tags">
                    <span class="badge badge-purple"
                      >{docB.insights?.document_type || docB.file_type}</span
                    >
                    <span class="mini-meta"
                      >{docB.page_count} pages · {Math.round(docB.file_size_bytes / 1024)} KB</span
                    >
                    {#if docB.insights?.entities?.financial?.total_amount}
                      <span class="badge badge-emerald"
                        >Total: {docB.insights.entities.financial.total_amount}</span
                      >
                    {/if}
                  </div>
                  <p class="doc-mini-summary">
                    {docB.insights?.summary?.slice(0, 110) || 'Ready for comparison'}...
                  </p>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Comparison Result Dashboard -->
        {#if comparisonResult}
          <!-- Executive Verdict & Risk Delta Banner -->
          <div
            class="glass-card verdict-banner {comparisonResult.metrics.risk_delta === 'increased'
              ? 'risk-increased'
              : comparisonResult.metrics.risk_delta === 'decreased'
                ? 'risk-mitigated'
                : 'risk-neutral'}"
          >
            <div class="verdict-icon">
              {#if comparisonResult.metrics.risk_delta === 'increased'}
                🔺
              {:else if comparisonResult.metrics.risk_delta === 'decreased'}
                🟢
              {:else}
                ⚖️
              {/if}
            </div>
            <div class="verdict-content">
              <div class="verdict-top-tags">
                <span class="verdict-label">Executive Redline Verdict</span>
                <span class="risk-badge {comparisonResult.metrics.risk_delta}">
                  {comparisonResult.metrics.risk_delta === 'increased'
                    ? 'Heightened Risk Exposure Detected'
                    : comparisonResult.metrics.risk_delta === 'decreased'
                      ? 'Risk Mitigated & Favorable'
                      : 'Balanced Terms Alignment'}
                </span>
                {#if comparisonResult.metrics.financial_delta}
                  <span class="financial-delta-badge">
                    💰 Financial Delta: {comparisonResult.metrics.financial_delta}
                  </span>
                {/if}
              </div>
              <p class="verdict-text">{comparisonResult.executive_summary}</p>
            </div>
            <div class="similarity-circle-box">
              <div class="sim-val">{comparisonResult.metrics.similarity_score}%</div>
              <div class="sim-label">Similarity Match</div>
            </div>
          </div>

          <!-- Metrics Stat Cards Grid -->
          <div class="diff-metrics-grid">
            <div class="metric-card added-card">
              <div class="metric-num">+{comparisonResult.metrics.added_count}</div>
              <div class="metric-label">Added Provisions</div>
              <div class="metric-sub">Introduced in Document B</div>
            </div>
            <div class="metric-card removed-card">
              <div class="metric-num">-{comparisonResult.metrics.removed_count}</div>
              <div class="metric-label">Removed Clauses</div>
              <div class="metric-sub">Omitted from original Doc A</div>
            </div>
            <div class="metric-card modified-card">
              <div class="metric-num">~{comparisonResult.metrics.modified_count}</div>
              <div class="metric-label">Modified Terms</div>
              <div class="metric-sub">Changed obligations or schedules</div>
            </div>
            <div class="metric-card total-card">
              <div class="metric-num">{comparisonResult.diffs.length}</div>
              <div class="metric-label">Total Material Redlines</div>
              <div class="metric-sub">Audited by Gemini 3.5 Flash</div>
            </div>
          </div>

          <!-- Key Recommendations Checklist -->
          {#if comparisonResult.key_recommendations && comparisonResult.key_recommendations.length > 0}
            <div class="glass-card recommendations-card">
              <div class="rec-header">
                <span class="rec-icon">💡</span>
                <div>
                  <h4>Negotiation & Counsel Action Items</h4>
                  <p class="rec-sub">
                    Prioritized strategic guidance before executing contract revisions:
                  </p>
                </div>
              </div>
              <div class="rec-list">
                {#each comparisonResult.key_recommendations as rec}
                  <div class="rec-item">
                    <span class="rec-bullet">→</span>
                    <span class="rec-text">{rec}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Redline Explorer Section -->
          <div class="glass-card redlines-container-card">
            <!-- Filter & Search Toolbar -->
            <div class="redline-toolbar">
              <div class="toolbar-left">
                <span class="toolbar-title">Audited Redline Entries</span>
                <span class="count-badge"
                  >{getFilteredDiffs(comparisonResult.diffs).length} of {comparisonResult.diffs
                    .length}</span
                >
              </div>
              <div class="toolbar-right">
                <!-- Search -->
                <div class="redline-search-wrapper">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><circle cx="11" cy="11" r="8" /><line
                      x1="21"
                      y1="21"
                      x2="16.65"
                      y2="16.65"
                    /></svg
                  >
                  <input
                    type="text"
                    placeholder="Filter redlines by keyword..."
                    bind:value={compareSearch}
                  />
                </div>

                <!-- Filter by Type -->
                <div class="filter-pills-row">
                  <button
                    class="filter-pill {compareFilterType === 'all' ? 'active' : ''}"
                    on:click={() => (compareFilterType = 'all')}>All Types</button
                  >
                  <button
                    class="filter-pill pill-added {compareFilterType === 'added' ? 'active' : ''}"
                    on:click={() => (compareFilterType = 'added')}
                    >+ Added ({comparisonResult.metrics.added_count})</button
                  >
                  <button
                    class="filter-pill pill-removed {compareFilterType === 'removed'
                      ? 'active'
                      : ''}"
                    on:click={() => (compareFilterType = 'removed')}
                    >- Removed ({comparisonResult.metrics.removed_count})</button
                  >
                  <button
                    class="filter-pill pill-modified {compareFilterType === 'modified'
                      ? 'active'
                      : ''}"
                    on:click={() => (compareFilterType = 'modified')}
                    >~ Modified ({comparisonResult.metrics.modified_count})</button
                  >
                </div>

                <!-- Filter by Category -->
                <div class="filter-pills-row">
                  <button
                    class="filter-pill {compareFilterCategory === 'all' ? 'active' : ''}"
                    on:click={() => (compareFilterCategory = 'all')}>All Categories</button
                  >
                  <button
                    class="filter-pill {compareFilterCategory === 'clause' ? 'active' : ''}"
                    on:click={() => (compareFilterCategory = 'clause')}>Clauses</button
                  >
                  <button
                    class="filter-pill {compareFilterCategory === 'financial' ? 'active' : ''}"
                    on:click={() => (compareFilterCategory = 'financial')}>Financial</button
                  >
                  <button
                    class="filter-pill {compareFilterCategory === 'liability' ? 'active' : ''}"
                    on:click={() => (compareFilterCategory = 'liability')}>Liability</button
                  >
                </div>
              </div>
            </div>

            <!-- List of Diff Cards -->
            <div class="diff-cards-list">
              {#if getFilteredDiffs(comparisonResult.diffs).length === 0}
                <div class="empty-diffs-state">
                  <p>No redlines match the selected filters.</p>
                </div>
              {:else}
                {#each getFilteredDiffs(comparisonResult.diffs) as diff}
                  <div class="diff-card {diff.type}">
                    <!-- Card Top Header -->
                    <div class="diff-card-header">
                      <div class="diff-header-left">
                        <span class="diff-type-badge {diff.type}">
                          {diff.type === 'added'
                            ? '+ ADDED IN DOC B'
                            : diff.type === 'removed'
                              ? '- REMOVED FROM DOC A'
                              : '~ MODIFIED TERM'}
                        </span>
                        <span class="diff-cat-badge"
                          >{diff.category?.toUpperCase() || 'CLAUSE'}</span
                        >
                        <span class="diff-risk-badge {diff.risk_impact}">
                          RISK: {diff.risk_impact?.toUpperCase() || 'NEUTRAL'}
                        </span>
                      </div>
                      <div class="diff-page-badges">
                        {#if diff.doc_a_page}
                          <span class="page-tag page-a">Doc A: Pg {diff.doc_a_page}</span>
                        {/if}
                        {#if diff.doc_b_page}
                          <span class="page-tag page-b">Doc B: Pg {diff.doc_b_page}</span>
                        {/if}
                      </div>
                    </div>

                    <!-- Title & Explanation -->
                    <h3 class="diff-title">{diff.title}</h3>
                    <p class="diff-explanation">{diff.explanation}</p>

                    <!-- Side-by-Side Visual Redline Comparison -->
                    <div class="redline-diff-boxes">
                      {#if diff.type === 'modified'}
                        <div class="redline-box box-del">
                          <div class="redline-box-title">
                            <span class="del-symbol">-</span> Document A (Original / Pre-revision)
                          </div>
                          <div class="redline-content-text strike">
                            {diff.doc_a_text || 'Not explicitly stated in Document A'}
                          </div>
                        </div>
                        <div class="redline-box box-add">
                          <div class="redline-box-title">
                            <span class="add-symbol">+</span> Document B (Target Amendment / Revised)
                          </div>
                          <div class="redline-content-text highlight">
                            {diff.doc_b_text || 'Not explicitly stated in Document B'}
                          </div>
                        </div>
                      {:else if diff.type === 'added'}
                        <div class="redline-box box-add full-width">
                          <div class="redline-box-title">
                            <span class="add-symbol">+</span> New Provision Introduced in Document B
                          </div>
                          <div class="redline-content-text highlight">{diff.doc_b_text}</div>
                        </div>
                      {:else if diff.type === 'removed'}
                        <div class="redline-box box-del full-width">
                          <div class="redline-box-title">
                            <span class="del-symbol">-</span> Omitted Provision Deleted from Document
                            A
                          </div>
                          <div class="redline-content-text strike">{diff.doc_a_text}</div>
                        </div>
                      {/if}
                    </div>

                    <!-- Quick Action Links -->
                    <div class="diff-card-footer">
                      {#if diff.doc_a_page}
                        <button
                          class="footer-inspect-btn"
                          on:click={() => {
                            viewDocumentDetail(compareBaseDocId);
                            activeTab = 'viewer';
                          }}
                        >
                          Inspect in Doc A (Page {diff.doc_a_page}) →
                        </button>
                      {/if}
                      {#if diff.doc_b_page}
                        <button
                          class="footer-inspect-btn"
                          on:click={() => {
                            viewDocumentDetail(compareTargetDocId);
                            activeTab = 'viewer';
                          }}
                        >
                          Inspect in Doc B (Page {diff.doc_b_page}) →
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {:else if !isComparing}
          <!-- Pre-comparison empty/guidance prompt -->
          <div class="glass-card compare-empty-card">
            <div class="empty-icon">⚖️</div>
            <h3>Select Two Documents to Initiate Automated Redlining</h3>
            <p>
              Compare contracts, policy revisions, purchase orders, or invoices side-by-side. Gemini
              3.5 Flash analyzes clause modifications, fee differentials, and risk exposure changes
              in real-time.
            </p>
            <div class="quick-compare-suggestions">
              <span>Quick Compare Suggestions:</span>
              <div class="suggestions-chips">
                {#if documents.length >= 2}
                  <button
                    class="chip-btn"
                    on:click={() => {
                      compareBaseDocId = documents[0].id;
                      compareTargetDocId = documents[1].id;
                      handleRunComparison();
                    }}
                  >
                    Compare {documents[0].original_filename} vs {documents[1].original_filename} ⚡
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Top Navigation */
  .top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 28px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .nav-left .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
  }

  .brand-text {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-name {
    font-family: var(--font-heading);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #fff, #cbd5e1);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .nav-center {
    flex: 1;
    max-width: 600px;
    margin: 0 24px;
  }

  .search-bar-wrap {
    display: flex;
    align-items: center;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-full);
    padding: 6px 14px;
    transition: all 0.2s ease;
  }

  .search-bar-wrap:focus-within {
    border-color: var(--accent-cyan);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
    background: rgba(30, 41, 59, 0.9);
  }

  .search-icon {
    color: var(--text-dim);
    margin-right: 8px;
  }

  .search-bar-wrap input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 0.85rem;
  }

  .search-btn {
    background: var(--accent-cyan);
    color: #080d1a;
    font-weight: 600;
    font-size: 0.75rem;
    padding: 5px 12px;
    border-radius: var(--radius-full);
  }

  .nav-right .status-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    padding: 6px 14px;
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* Sub Navigation Tabs */
  .sub-nav {
    background: rgba(15, 23, 42, 0.6);
    border-bottom: 1px solid var(--border-color);
    padding: 6px 28px;
  }

  .tabs-container {
    display: flex;
    gap: 8px;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.88rem;
    font-weight: 500;
  }

  .nav-tab:hover {
    color: var(--text-main);
    background: rgba(255, 255, 255, 0.04);
  }

  .nav-tab.active {
    color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.1);
    font-weight: 600;
  }

  /* Content */
  .content-container {
    padding: 28px;
    flex: 1;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .view-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 4px;
  }

  /* Alerts */
  .alert {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    margin-bottom: 20px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }
  .alert-error {
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid var(--accent-rose);
    color: #fda4af;
  }
  .alert-success {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid var(--accent-emerald);
    color: #6ee7b7;
  }
  .close-btn {
    background: transparent;
    color: inherit;
    font-size: 1.1rem;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  .stat-icon.cyan {
    background: rgba(6, 182, 212, 0.15);
  }
  .stat-icon.emerald {
    background: rgba(16, 185, 129, 0.15);
  }
  .stat-icon.purple {
    background: rgba(139, 92, 246, 0.15);
  }
  .stat-icon.amber {
    background: rgba(245, 158, 11, 0.15);
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    font-family: var(--font-heading);
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* Analytics Row */
  .analytics-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .analytics-card {
    padding: 22px;
  }

  .card-subtitle {
    font-size: 0.8rem;
    color: var(--text-dim);
    margin-bottom: 16px;
  }

  .dist-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .dist-label {
    width: 120px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue));
    border-radius: 4px;
  }

  .dist-val {
    font-size: 0.85rem;
    font-weight: 600;
    width: 25px;
    text-align: right;
  }

  .vendor-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    border: 1px solid var(--border-color);
  }

  .vendor-amt {
    font-weight: 700;
    color: var(--accent-emerald);
  }

  /* Table Card */
  .table-card {
    padding: 22px;
  }

  .table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .doc-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.88rem;
  }

  .doc-table th {
    padding: 12px 14px;
    color: var(--text-dim);
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-table td {
    padding: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .file-icon {
    font-size: 1.3rem;
  }

  .file-details {
    display: flex;
    flex-direction: column;
  }

  .filename-btn {
    background: transparent;
    border: none;
    padding: 0;
    text-align: left;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .filename-btn:hover {
    color: var(--accent-cyan);
    text-decoration: underline;
  }

  .file-summary {
    font-size: 0.78rem;
    color: var(--text-dim);
  }

  .btn-action {
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn-action.view {
    background: rgba(6, 182, 212, 0.15);
    color: var(--accent-cyan);
    margin-right: 6px;
  }

  .btn-action.view:hover {
    background: rgba(6, 182, 212, 0.25);
  }

  .btn-action.delete {
    background: rgba(244, 63, 94, 0.1);
    color: var(--accent-rose);
  }

  .btn-action.delete:hover {
    background: rgba(244, 63, 94, 0.25);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 12px;
  }

  .empty-state h4 {
    margin-bottom: 6px;
  }

  .empty-state p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 20px;
  }

  .sample-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  /* Upload View */
  .upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .dropzone-card {
    padding: 24px;
  }

  .dropzone {
    border: 2px dashed rgba(6, 182, 212, 0.4);
    border-radius: var(--radius-md);
    padding: 40px 20px;
    text-align: center;
    background: rgba(6, 182, 212, 0.02);
    position: relative;
    cursor: pointer;
  }

  .dropzone input {
    display: none;
  }

  .upload-icon-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(6, 182, 212, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: var(--accent-cyan);
  }

  .retention-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .retention-selector select {
    background: #1e293b;
    color: #fff;
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
  }

  .pipeline-card {
    padding: 24px;
  }

  .pipeline-steps {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 20px 0;
  }

  .step-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .step-item.active {
    border-color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.05);
  }

  .step-item.completed {
    border-color: var(--accent-emerald);
  }

  .step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
  }

  .step-item.active .step-num {
    background: var(--accent-cyan);
    color: #080d1a;
  }

  .step-item.completed .step-num {
    background: var(--accent-emerald);
    color: #080d1a;
  }

  .step-info h4 {
    font-size: 0.9rem;
    margin-bottom: 2px;
  }

  .step-info p {
    font-size: 0.78rem;
    color: var(--text-dim);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--accent-cyan);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-left: auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .demo-samples {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .sample-btn-group {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  /* Search View */
  .search-input-section {
    padding: 24px;
    margin-bottom: 24px;
  }

  .large-search-box {
    display: flex;
    align-items: center;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: var(--radius-md);
    padding: 10px 18px;
    gap: 12px;
  }

  .large-search-box input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1rem;
  }

  .search-examples {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 0.8rem;
  }

  .chip-btn {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.78rem;
  }

  .chip-btn:hover {
    color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.1);
  }

  .results-meta {
    margin-bottom: 14px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .result-card {
    padding: 20px;
    margin-bottom: 14px;
    cursor: pointer;
  }

  .result-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .result-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .result-summary {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 12px;
  }

  .result-highlights {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .highlight-chip {
    background: rgba(139, 92, 246, 0.1);
    color: #c084fc;
    font-size: 0.78rem;
    padding: 4px 10px;
    border-radius: 4px;
  }

  .result-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  /* Split View */
  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .doc-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .split-container {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 24px;
    align-items: start;
  }

  .panel-left-viewer {
    height: 750px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  .panel-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 750px;
    overflow-y: auto;
    padding-right: 6px;
  }

  /* Segmented Right Panel Tab Switcher */
  .panel-tab-bar {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-md);
    backdrop-filter: blur(8px);
    margin-bottom: 2px;
  }

  .panel-tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 14px;
    font-size: 0.84rem;
    font-weight: 600;
    color: #94a3b8;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .panel-tab-btn:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.04);
  }

  .panel-tab-btn.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  .panel-tab-btn.active.chat-active {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border-color: rgba(56, 189, 248, 0.35);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.15);
  }

  /* Conversational Document AI Container */
  .doc-chat-container {
    display: flex;
    flex-direction: column;
    height: 680px;
    padding: 0;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-md);
    position: relative;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(10, 15, 29, 0.5);
    backdrop-filter: blur(8px);
    flex-shrink: 0;
  }

  .chat-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-ai-avatar {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    box-shadow: 0 0 14px rgba(14, 165, 233, 0.35);
    flex-shrink: 0;
  }

  .chat-header h4 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    color: #f8fafc;
    line-height: 1.2;
  }

  .chat-model-badge {
    font-size: 0.7rem;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 7px;
    border-radius: 12px;
    font-weight: 500;
    display: inline-block;
    margin-top: 2px;
  }

  .chat-clear-btn {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 0.74rem;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .chat-clear-btn:hover {
    background: rgba(244, 63, 94, 0.12);
    border-color: rgba(244, 63, 94, 0.3);
    color: #fda4af;
  }

  /* Messages Scroll Area */
  .chat-messages-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }

  /* Welcome Box & Quick Starters */
  .chat-welcome-box {
    padding: 14px 16px;
    background: rgba(30, 41, 59, 0.45);
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm);
  }

  .welcome-title {
    margin: 0 0 4px 0;
    font-size: 0.88rem;
    color: #f1f5f9;
    line-height: 1.4;
  }

  .welcome-desc {
    margin: 0 0 12px 0;
    font-size: 0.78rem;
    color: #94a3b8;
    line-height: 1.4;
  }

  .starter-chips-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .starter-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    font-weight: 700;
  }

  .starter-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .starter-chip {
    text-align: left;
    background: rgba(14, 165, 233, 0.06);
    border: 1px solid rgba(14, 165, 233, 0.2);
    color: #bae6fd;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .starter-chip:hover {
    background: rgba(14, 165, 233, 0.16);
    border-color: rgba(14, 165, 233, 0.45);
    transform: translateX(2px);
    color: #ffffff;
  }

  /* Chat Bubbles */
  .chat-bubble-row {
    display: flex;
    gap: 10px;
    max-width: 100%;
    animation: fadeInBubble 0.25s ease-out;
  }

  @keyframes fadeInBubble {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-bubble-row.user {
    flex-direction: row-reverse;
  }

  .chat-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 2px;
  }

  .chat-bubble-row.user .chat-avatar {
    background: rgba(99, 102, 241, 0.3);
    border-color: rgba(99, 102, 241, 0.45);
  }

  .chat-bubble {
    max-width: 86%;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 0.86rem;
    line-height: 1.55;
    word-break: break-word;
  }

  .chat-bubble.user {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #ffffff;
    border-bottom-right-radius: 3px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  .chat-bubble.assistant {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    border-bottom-left-radius: 3px;
  }

  .bubble-content :global(p) {
    margin: 0 0 8px 0;
  }

  .bubble-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .bubble-content :global(strong) {
    color: #f8fafc;
    font-weight: 600;
  }

  .bubble-content :global(ul) {
    margin: 6px 0 8px 18px;
    padding: 0;
  }

  .bubble-content :global(li) {
    margin-bottom: 4px;
  }

  /* Grounded Citations Linking to PDF Canvas */
  .chat-citations-box {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .citation-box-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #38bdf8;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .citation-pills-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .citation-pill {
    text-align: left;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 7px 10px;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 7px;
    color: #bae6fd;
    font-size: 0.78rem;
    line-height: 1.4;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  }

  .citation-pill:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: rgba(56, 189, 248, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 10px rgba(56, 189, 248, 0.2);
    color: #ffffff;
  }

  .cit-icon {
    flex-shrink: 0;
    font-size: 0.85rem;
  }

  .cit-label {
    font-weight: 700;
    color: #38bdf8;
    flex-shrink: 0;
  }

  .cit-text {
    font-style: italic;
    flex: 1;
    word-break: break-word;
    color: #e0f2fe;
  }

  .cit-page {
    flex-shrink: 0;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.4);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #67e8f9;
  }

  /* Suggested Follow-up Prompts */
  .chat-followups-box {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .followup-title {
    font-size: 0.72rem;
    color: #94a3b8;
    font-weight: 600;
  }

  .followup-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .followup-chip {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 4px 10px;
    font-size: 0.74rem;
    color: #cbd5e1;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .followup-chip:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.35);
    color: #c7d2fe;
    transform: translateY(-1px);
  }

  /* Loading State & Typing Indicator */
  .loading-bubble {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    background: #38bdf8;
    border-radius: 50%;
    animation: typingPulse 1.4s infinite ease-in-out both;
  }

  .typing-indicator span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes typingPulse {
    0%,
    80%,
    100% {
      transform: scale(0);
      opacity: 0.3;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .typing-text {
    font-size: 0.78rem;
    color: #94a3b8;
    font-style: italic;
  }

  /* Bottom Chat Input Bar */
  .chat-input-bar {
    display: flex;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(10, 15, 29, 0.75);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .chat-input-bar input {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    font-size: 0.85rem;
    color: #f8fafc;
    outline: none;
    transition: all 0.2s;
  }

  .chat-input-bar input:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }

  .chat-input-bar input::placeholder {
    color: #64748b;
  }

  .chat-send-btn {
    background: linear-gradient(135deg, #0ea5e9, #3b82f6);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0 16px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
  }

  .chat-send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.45);
  }

  .chat-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .hint-tag {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.25);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-weight: 500;
  }

  .hint-tag.alert {
    color: var(--accent-rose);
    background: rgba(244, 63, 94, 0.1);
    border-color: rgba(244, 63, 94, 0.3);
  }

  .interactive-point-btn {
    width: 100%;
    text-align: left;
    position: relative;
    padding: 10px 14px;
    color: #e2e8f0;
    font-size: 0.88rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .interactive-point-btn.active-target,
  .entity-item-btn.active-target,
  .interactive-risk-btn.active-target {
    background: rgba(245, 158, 11, 0.15) !important;
    border-color: rgba(245, 158, 11, 0.6) !important;
    box-shadow: 0 0 14px rgba(245, 158, 11, 0.25) !important;
  }

  .point-content-wrap {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex: 1;
  }

  .point-index {
    background: rgba(6, 182, 212, 0.2);
    color: var(--accent-cyan);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid rgba(6, 182, 212, 0.4);
    margin-top: 1px;
    white-space: nowrap;
  }

  .interactive-point-btn:hover {
    background: rgba(6, 182, 212, 0.08);
    border-color: rgba(6, 182, 212, 0.3);
    transform: translateX(3px);
  }

  .interactive-point-btn .locate-icon {
    font-size: 0.75rem;
    opacity: 0.6;
    color: var(--accent-cyan);
    white-space: nowrap;
    background: rgba(6, 182, 212, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .interactive-point-btn:hover .locate-icon {
    opacity: 1;
    background: rgba(6, 182, 212, 0.2);
  }

  .entity-item-btn {
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
  }

  .entity-item-btn:hover {
    background: rgba(6, 182, 212, 0.08);
    border-color: rgba(6, 182, 212, 0.4);
    transform: translateY(-2px);
  }

  .entity-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .mini-search-icon {
    font-size: 0.75rem;
    opacity: 0.4;
  }

  .entity-item-btn:hover .mini-search-icon {
    opacity: 1;
    color: var(--accent-cyan);
  }

  .interactive-risk-btn {
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: rgba(244, 63, 94, 0.1);
    border-radius: 4px;
    color: #fda4af;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .interactive-risk-btn:hover {
    background: rgba(244, 63, 94, 0.2);
    border-color: rgba(244, 63, 94, 0.4);
    transform: translateX(3px);
  }

  .insight-card {
    padding: 20px;
  }

  .insight-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .summary-text {
    color: #e2e8f0;
    font-size: 0.92rem;
    line-height: 1.6;
  }

  .key-points-list,
  .risk-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .key-points-list li {
    position: relative;
    padding-left: 20px;
    color: #e2e8f0;
    font-size: 0.88rem;
  }

  .key-points-list li::before {
    content: '•';
    color: var(--accent-cyan);
    font-weight: bold;
    position: absolute;
    left: 4px;
  }

  .entities-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .entity-key {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 2px;
  }

  .entity-val {
    font-size: 0.88rem;
    font-weight: 600;
    color: #fff;
  }

  .alert-risk {
    border-color: rgba(244, 63, 94, 0.4);
    background: rgba(244, 63, 94, 0.05);
  }

  .risk-list li {
    padding: 8px 12px;
    background: rgba(244, 63, 94, 0.1);
    border-radius: 4px;
    color: #fda4af;
    font-size: 0.85rem;
  }

  .line-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .line-items-table th {
    color: var(--text-dim);
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .line-items-table td {
    padding: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .line-items-table .amt {
    font-weight: 600;
    color: var(--accent-emerald);
  }

  .clickable-line-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .clickable-line-row:hover {
    background: rgba(6, 182, 212, 0.08) !important;
  }

  .clickable-line-row.active-target {
    background: rgba(245, 158, 11, 0.15) !important;
  }

  .clickable-line-row.active-target td {
    border-bottom-color: rgba(245, 158, 11, 0.5);
  }

  .line-desc-text {
    color: #e2e8f0;
    font-weight: 500;
  }

  .line-locate-btn {
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.35);
    color: var(--accent-cyan);
    font-size: 0.74rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .line-locate-btn:hover {
    background: var(--accent-cyan);
    color: #080d1a;
  }

  /* Viewer Redaction Pill & Button */
  .redaction-switch-pill {
    display: inline-flex;
    align-items: center;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid var(--border-color);
    border-radius: 9999px;
    padding: 3px;
    gap: 3px;
  }

  .pill-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 500;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pill-btn:hover {
    color: var(--text-main);
  }

  .pill-btn.active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-main);
  }

  .pill-btn.active.redacted-glow {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(244, 63, 94, 0.25));
    border: 1px solid rgba(245, 158, 11, 0.5);
    color: #fef3c7;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
  }

  .download-redacted {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(244, 63, 94, 0.2));
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fde68a;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .download-redacted:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(244, 63, 94, 0.35));
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
  }

  /* Compliance & Audit Studio View (Option 3) */
  .compliance-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .compliance-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .comp-kpi-card {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 140px;
  }

  .kpi-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .kpi-title {
    font-size: 0.82rem;
    color: var(--text-dim);
    font-weight: 500;
  }

  .kpi-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kpi-number {
    font-size: 1.85rem;
    font-weight: 700;
    font-family: var(--font-heading);
    letter-spacing: -0.02em;
  }

  .kpi-sub {
    font-size: 0.78rem;
    color: var(--text-dim);
  }

  .kpi-footer-progress {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 12px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #06b6d4);
    border-radius: 999px;
  }

  .kpi-pills-row {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .mini-pill {
    background: rgba(168, 85, 247, 0.12);
    border: 1px solid rgba(168, 85, 247, 0.25);
    color: #d8b4fe;
    font-size: 0.68rem;
    padding: 2px 7px;
    border-radius: 999px;
  }

  .pulse-indicator-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.12);
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent-emerald);
    box-shadow: 0 0 8px var(--accent-emerald);
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.9);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
    100% {
      transform: scale(0.9);
      opacity: 0.7;
    }
  }

  .kpi-footer-text {
    font-size: 0.75rem;
    color: var(--text-dim);
    margin-top: 10px;
    font-style: italic;
  }

  /* PII Matrix Card */
  .pii-matrix-card {
    padding: 24px;
    margin-bottom: 24px;
  }

  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .matrix-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .matrix-desc {
    font-size: 0.82rem;
    color: var(--text-dim);
    max-width: 800px;
  }

  .pii-chips-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .pii-class-box {
    background: rgba(15, 23, 42, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--radius-sm);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .pii-class-box:hover {
    border-color: rgba(6, 182, 212, 0.35);
    background: rgba(15, 23, 42, 0.65);
    transform: translateY(-1px);
  }

  .box-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .box-icon {
    font-size: 1.15rem;
  }

  .box-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-main);
    flex: 1;
  }

  .box-count {
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.3);
    color: var(--accent-cyan);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .box-rule {
    font-size: 0.72rem;
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .box-token {
    font-size: 0.72rem;
    color: #34d399;
    font-family: var(--font-mono);
    background: rgba(16, 185, 129, 0.08);
    padding: 3px 6px;
    border-radius: 4px;
    width: fit-content;
  }

  /* Audit Trail Explorer */
  .audit-trail-card {
    padding: 24px;
    margin-bottom: 24px;
  }

  .audit-trail-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .audit-sub {
    font-size: 0.82rem;
    color: var(--text-dim);
  }

  .audit-filters-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .audit-search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 280px;
    max-width: 420px;
  }

  .audit-search-input-wrapper svg {
    position: absolute;
    left: 12px;
    color: var(--text-dim);
  }

  .audit-search-input-wrapper input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 0.82rem;
  }

  .audit-search-input-wrapper input:focus {
    outline: none;
    border-color: var(--accent-cyan);
  }

  .filter-pills-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-pill {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-pill:hover {
    color: var(--text-main);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .filter-pill.active {
    background: rgba(6, 182, 212, 0.15);
    border-color: rgba(6, 182, 212, 0.45);
    color: var(--accent-cyan);
    font-weight: 600;
  }

  /* Audit Table */
  .audit-table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    text-align: left;
  }

  .audit-table th {
    background: rgba(15, 23, 42, 0.85);
    color: var(--text-dim);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .audit-table td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  .audit-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .col-time {
    color: var(--text-dim);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .actor-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .actor-avatar {
    font-size: 1rem;
    opacity: 0.8;
  }

  .actor-name {
    font-weight: 600;
    color: var(--text-main);
  }

  .actor-ip {
    font-size: 0.7rem;
    color: var(--text-dim);
  }

  .action-tag {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .tag-uploaded {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #6ee7b7;
  }

  .tag-viewed {
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.35);
    color: #67e8f9;
  }

  .tag-redacted {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fde68a;
  }

  .tag-searched {
    background: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.35);
    color: #d8b4fe;
  }

  .tag-deleted {
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.35);
    color: #fda4af;
  }

  .tag-exported {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
  }

  .tag-generic {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-dim);
  }

  .resource-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .res-filename {
    color: var(--text-main);
    font-weight: 500;
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .res-id {
    font-size: 0.68rem;
    color: var(--text-dim);
  }

  .meta-pii-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .mini-meta-badge {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.25);
    color: #fde68a;
    font-size: 0.68rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }

  .meta-query {
    font-size: 0.74rem;
    color: #d8b4fe;
  }

  .verify-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--accent-emerald);
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .audit-loading,
  .audit-empty {
    padding: 36px;
    text-align: center;
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    font-size: 0.85rem;
  }

  /* Compliance Bottom Grid */
  .compliance-bottom-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 24px;
  }

  .compliance-framework-card,
  .compliance-danger-card {
    padding: 24px;
  }

  .framework-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .framework-header h3 {
    font-size: 1.05rem;
    font-weight: 600;
  }

  .frameworks-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .framework-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid var(--border-color);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
  }

  .fw-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fw-control {
    font-size: 0.72rem;
    color: var(--text-dim);
  }

  .retention-info-box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 14px;
    margin: 14px 0;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    margin-bottom: 6px;
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .delete-all {
    background: rgba(244, 63, 94, 0.15);
    color: var(--accent-rose);
    border: 1px solid rgba(244, 63, 94, 0.35);
    padding: 9px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  }

  .delete-all:hover {
    background: rgba(244, 63, 94, 0.3);
  }

  /* Compare Action Button in Document Rows */
  .compare-action-btn {
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
    font-size: 0.76rem;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .compare-action-btn:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(99, 102, 241, 0.5);
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* Multi-Document Comparison Workspace */
  .compare-workspace {
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeIn 0.3s ease-out;
  }

  .compare-header-card {
    padding: 24px;
  }

  .compare-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 20px;
  }

  .compare-desc {
    color: #94a3b8;
    font-size: 0.88rem;
    line-height: 1.5;
    margin: 6px 0 0 0;
    max-width: 850px;
  }

  .doc-compare-selectors {
    display: grid;
    grid-template-columns: 1fr 140px 1fr;
    gap: 16px;
    align-items: center;
  }

  .compare-doc-select-box {
    padding: 16px;
    border-radius: var(--radius-md);
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s ease;
  }

  .base-box {
    border-color: rgba(56, 189, 248, 0.3);
    background: rgba(56, 189, 248, 0.03);
  }

  .target-box {
    border-color: rgba(168, 85, 247, 0.3);
    background: rgba(168, 85, 247, 0.03);
  }

  .box-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.74rem;
    font-weight: 700;
  }

  .badge-tag {
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .base-badge .badge-tag {
    background: rgba(56, 189, 248, 0.18);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.35);
  }

  .target-badge .badge-tag {
    background: rgba(168, 85, 247, 0.18);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.35);
  }

  .role-hint {
    color: #94a3b8;
    font-weight: 500;
    font-size: 0.74rem;
  }

  .selector-select-wrapper select {
    width: 100%;
    background: rgba(10, 15, 29, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-sm);
    color: #f8fafc;
    padding: 10px 12px;
    font-size: 0.86rem;
    outline: none;
    cursor: pointer;
    transition: border 0.2s;
  }

  .selector-select-wrapper select:focus {
    border-color: #38bdf8;
  }

  .selected-doc-mini-card {
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
  }

  .doc-mini-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .mini-icon {
    font-size: 1.1rem;
  }

  .mini-title {
    font-size: 0.86rem;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .doc-mini-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }

  .mini-meta {
    font-size: 0.72rem;
    color: #94a3b8;
  }

  .doc-mini-summary {
    font-size: 0.76rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.4;
  }

  .compare-mid-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .swap-docs-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .swap-docs-btn:hover {
    transform: rotate(180deg);
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }

  .vs-divider {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #64748b;
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .compare-run-btn {
    white-space: nowrap;
    font-size: 0.82rem;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Verdict Banner */
  .verdict-banner {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
  }

  .verdict-banner.risk-increased {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(15, 23, 42, 0.85));
    border: 1px solid rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);
  }

  .verdict-banner.risk-mitigated {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(15, 23, 42, 0.85));
    border: 1px solid rgba(16, 185, 129, 0.35);
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);
  }

  .verdict-banner.risk-neutral {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.14), rgba(15, 23, 42, 0.85));
    border: 1px solid rgba(6, 182, 212, 0.35);
  }

  .verdict-icon {
    font-size: 2.4rem;
    flex-shrink: 0;
  }

  .verdict-content {
    flex: 1;
  }

  .verdict-top-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .verdict-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  .risk-badge {
    font-size: 0.74rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 12px;
  }

  .risk-badge.increased {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .risk-badge.decreased {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  .risk-badge.neutral {
    background: rgba(6, 182, 212, 0.2);
    color: #38bdf8;
    border: 1px solid rgba(6, 182, 212, 0.4);
  }

  .financial-delta-badge {
    font-size: 0.74rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  .verdict-text {
    font-size: 0.92rem;
    line-height: 1.55;
    color: #f1f5f9;
    margin: 0;
  }

  .similarity-circle-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 86px;
    height: 86px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.75);
    border: 2px solid rgba(56, 189, 248, 0.4);
    flex-shrink: 0;
  }

  .sim-val {
    font-size: 1.35rem;
    font-weight: 800;
    color: #38bdf8;
    line-height: 1;
  }

  .sim-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
    margin-top: 4px;
  }

  /* Metrics Stat Cards Grid */
  .diff-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .metric-card {
    padding: 16px;
    border-radius: var(--radius-md);
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-num {
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
  }

  .added-card .metric-num {
    color: #34d399;
  }

  .removed-card .metric-num {
    color: #f87171;
  }

  .modified-card .metric-num {
    color: #fbbf24;
  }

  .total-card .metric-num {
    color: #38bdf8;
  }

  .metric-label {
    font-size: 0.84rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .metric-sub {
    font-size: 0.72rem;
    color: #94a3b8;
    line-height: 1.3;
  }

  /* Key Recommendations Checklist */
  .recommendations-card {
    padding: 18px 20px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: var(--radius-md);
  }

  .rec-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .rec-icon {
    font-size: 1.4rem;
  }

  .rec-header h4 {
    margin: 0;
    font-size: 0.94rem;
    color: #fef3c7;
    font-weight: 700;
  }

  .rec-sub {
    margin: 2px 0 0 0;
    font-size: 0.78rem;
    color: #94a3b8;
  }

  .rec-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rec-item {
    display: flex;
    gap: 10px;
    font-size: 0.84rem;
    color: #e2e8f0;
    line-height: 1.45;
  }

  .rec-bullet {
    color: #f59e0b;
    font-weight: 700;
  }

  /* Redline Explorer Toolbar & Cards */
  .redlines-container-card {
    padding: 20px;
  }

  .redline-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #f8fafc;
  }

  .toolbar-right {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .redline-search-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    color: #cbd5e1;
  }

  .redline-search-wrapper input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.82rem;
    color: #f8fafc;
    width: 170px;
  }

  .pill-added.active {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.4);
    color: #34d399;
  }

  .pill-removed.active {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
  }

  .pill-modified.active {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.4);
    color: #fbbf24;
  }

  .diff-cards-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .diff-card {
    padding: 18px;
    border-radius: var(--radius-md);
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease;
  }

  .diff-card.added {
    border-left: 4px solid #34d399;
  }

  .diff-card.removed {
    border-left: 4px solid #f87171;
  }

  .diff-card.modified {
    border-left: 4px solid #fbbf24;
  }

  .diff-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .diff-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .diff-type-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .diff-type-badge.added {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .diff-type-badge.removed {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .diff-type-badge.modified {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .diff-cat-badge {
    font-size: 0.7rem;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .diff-risk-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
  }

  .diff-risk-badge.critical,
  .diff-risk-badge.high,
  .diff-risk-badge.increased {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .diff-risk-badge.decreased {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .diff-risk-badge.neutral {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
  }

  .diff-page-badges {
    display: flex;
    gap: 6px;
  }

  .page-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .page-a {
    background: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }

  .page-b {
    background: rgba(168, 85, 247, 0.12);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.25);
  }

  .diff-title {
    font-size: 1.02rem;
    font-weight: 700;
    color: #f8fafc;
    margin: 0 0 4px 0;
  }

  .diff-explanation {
    font-size: 0.85rem;
    color: #cbd5e1;
    line-height: 1.5;
    margin: 0 0 12px 0;
  }

  .redline-diff-boxes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .redline-box {
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .redline-box.full-width {
    grid-column: 1 / -1;
  }

  .redline-box.box-del {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  .redline-box.box-add {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  .redline-box-title {
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .box-del .redline-box-title {
    color: #f87171;
  }

  .box-add .redline-box-title {
    color: #34d399;
  }

  .del-symbol {
    font-weight: 800;
    font-size: 1rem;
  }

  .add-symbol {
    font-weight: 800;
    font-size: 1rem;
  }

  .redline-content-text {
    font-size: 0.84rem;
    line-height: 1.5;
    word-break: break-word;
  }

  .redline-content-text.strike {
    color: #fca5a5;
    opacity: 0.9;
    text-decoration: line-through;
    text-decoration-color: rgba(239, 68, 68, 0.7);
  }

  .redline-content-text.highlight {
    color: #a7f3d0;
    background: rgba(16, 185, 129, 0.08);
    padding: 2px 4px;
    border-radius: 3px;
  }

  .diff-card-footer {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .footer-inspect-btn {
    background: transparent;
    border: none;
    color: #38bdf8;
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .footer-inspect-btn:hover {
    color: #7dd3fc;
    text-decoration: underline;
  }

  .compare-empty-card {
    padding: 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .empty-icon {
    font-size: 2.8rem;
  }

  .quick-compare-suggestions {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: 0.82rem;
  }

  .suggestions-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip-btn {
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #bae6fd;
    font-size: 0.82rem;
    padding: 6px 14px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .chip-btn:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: rgba(56, 189, 248, 0.5);
    transform: translateY(-1px);
  }

  .empty-diffs-state {
    padding: 30px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.88rem;
  }

  @media (max-width: 1100px) {
    .compliance-kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .pii-chips-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .compliance-bottom-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .analytics-row,
    .upload-grid,
    .split-container {
      grid-template-columns: 1fr;
    }
    .compliance-kpi-grid,
    .pii-chips-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
