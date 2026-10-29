<script>
  import { onMount, onDestroy } from 'svelte';
  import { router, currentTab, currentParams } from './lib/router.js';
  import {
    fetchHealth,
    listDocuments,
    uploadDocument,
    deleteDocument,
    getDocument,
    reanalyzeDocument,
    semanticSearch,
    getDashboardStats,
    getComplianceStats,
    getAuditLogs,
    downloadAuditExport,
    getDocumentFileUrl,
    getRedactedFileUrl,
    chatWithDocument,
    compareDocuments,
    getAuthToken,
    getCurrentUser,
    startGuestSession,
    logout,
  } from './lib/api.js';

  // Centralized UI Primitives, Shell Components & Workspace Modules
  import CTabs from './lib/ui/CTabs.svelte';
  import CProgressBar from './lib/ui/CProgressBar.svelte';
  import { progress } from './lib/stores/progress.js';

  import AppHeader from './lib/components/AppHeader.svelte';
  import AppFooter from './lib/components/AppFooter.svelte';
  import CognifolioPortal from './lib/components/CognifolioPortal.svelte';
  import DocumentsWorkspace from './lib/components/DocumentsWorkspace.svelte';
  import UploadWorkspace from './lib/components/UploadWorkspace.svelte';
  import ViewerWorkspace from './lib/components/ViewerWorkspace.svelte';
  import SearchWorkspace from './lib/components/SearchWorkspace.svelte';
  import CompareWorkspace from './lib/components/CompareWorkspace.svelte';
  import ComplianceWorkspace from './lib/components/ComplianceWorkspace.svelte';

  // Modals
  import DeleteConfirmModal from './lib/components/DeleteConfirmModal.svelte';
  import MorrowlessModal from './lib/components/MorrowlessModal.svelte';
  import SecurityGuideModal from './lib/components/SecurityGuideModal.svelte';
  import PricingModal from './lib/components/PricingModal.svelte';

  // Dynamic Lazy-Loaded PDF Viewer Component
  let PdfViewerComponent = null;
  let isPdfViewerLoading = false;

  async function loadPdfViewer() {
    if (!PdfViewerComponent && !isPdfViewerLoading) {
      isPdfViewerLoading = true;
      try {
        const mod = await import('./lib/components/PdfViewer.svelte');
        PdfViewerComponent = mod.default;
      } catch (err) {
        console.error('Failed to load PdfViewer:', err);
      } finally {
        isPdfViewerLoading = false;
      }
    }
  }

  $: if (activeTab === 'viewer') {
    loadPdfViewer();
    if (!selectedDoc && documents && documents.length > 0) {
      selectedDoc = documents[0];
    }
  }

  // Dynamic Lazy-Loaded Auth Modal
  let AuthModalComponent = null;
  let isAuthModalLoading = false;

  async function loadAuthModal() {
    if (!AuthModalComponent && !isAuthModalLoading) {
      isAuthModalLoading = true;
      try {
        const mod = await import('./lib/components/AuthModal.svelte');
        AuthModalComponent = mod.default;
      } catch (err) {
        console.error('Failed to load AuthModal:', err);
      } finally {
        isAuthModalLoading = false;
      }
    }
  }

  // Navigation State & URL Hash Synchronization
  let activeTab = 'portal'; // 'portal' | 'dashboard' | 'upload' | 'search' | 'viewer' | 'privacy' | 'compare'
  let lastRouterTab = activeTab;

  function switchTab(tabId, options = {}) {
    if (!tabId) return;
    activeTab = tabId;
    lastRouterTab = tabId;
    router.navigate(tabId, options);
    if (tabId === 'privacy') refreshCompliance();
    if (tabId === 'compare') initCompareDefaults();
  }

  // React to URL routing changes (e.g. browser Back / Forward buttons)
  $: if ($currentTab && $currentTab !== lastRouterTab) {
    lastRouterTab = $currentTab;
    activeTab = $currentTab;
    if ($currentTab === 'privacy') refreshCompliance();
    if ($currentTab === 'compare') initCompareDefaults();
  }

  // Deep-link document selection from URL query e.g. #/viewer?docId=...
  $: if ($currentTab === 'viewer' && ($currentParams?.docId || $currentParams?.id)) {
    const targetId = $currentParams.docId || $currentParams.id;
    if (!selectedDoc || String(selectedDoc.id) !== String(targetId)) {
      const found = documents.find((d) => String(d.id) === String(targetId));
      if (found) {
        selectedDoc = found;
      }
    }
  }

  // Deep-link search query from URL e.g. #/search?q=...
  $: if ($currentTab === 'search' && $currentParams?.q && $currentParams.q !== searchQuery) {
    searchQuery = $currentParams.q;
    handleSearch();
  }

  $: navTabs = [
    {
      id: 'dashboard',
      label: 'Workspace',
      icon: 'document',
      badge: documents.length > 0 ? `${documents.length}` : null,
    },
    { id: 'upload', label: 'Upload', icon: 'upload' },
    {
      id: 'viewer',
      label: 'Studio Viewer',
      icon: 'eye',
      badge: selectedDoc ? `${selectedDoc.original_filename.slice(0, 15)}...` : null,
    },
    {
      id: 'search',
      label: 'Semantic Search',
      icon: 'search',
      badge: searchResults.length > 0 ? `${searchResults.length}` : null,
    },
    {
      id: 'compare',
      label: 'Redline Compare',
      icon: 'compare',
      badge: comparisonResult ? `${comparisonResult.diffs.length} Diffs` : null,
    },
    {
      id: 'privacy',
      label: 'Audit & Compliance',
      icon: 'compliance',
      badge: complianceStats ? `${complianceStats.total_audit_events}` : null,
    },
  ];

  // Auth & Multi-Tenancy State
  let isAuthModalOpen = false;
  let isMorrowlessModalOpen = false;
  let isSecurityGuideOpen = false;
  let isPricingModalOpen = false;
  let authModalMode = 'signin';
  let currentUser = getCurrentUser();

  async function openAuthModal(mode = 'signin') {
    authModalMode = mode;
    await loadAuthModal();
    isAuthModalOpen = true;
  }

  async function handleAuthSuccess(event) {
    currentUser = event.detail.user;
    selectedDoc = null;
    successMsg = currentUser.is_guest
      ? 'Welcome to the Cognifolio Guest Playground!'
      : `Welcome back, ${currentUser.name}!`;
    await refreshAll();
    setTimeout(() => {
      successMsg = '';
    }, 3500);
  }

  async function handleLogout() {
    logout();
    currentUser = null;
    selectedDoc = null;
    try {
      const g = await startGuestSession();
      currentUser = g.user;
    } catch {}
    await refreshAll();
    successMsg = 'Signed out. Switched to an isolated guest session.';
    setTimeout(() => {
      successMsg = '';
    }, 3000);
  }

  // Global Data State
  let health = { status: 'checking...', gemini_model: '', qdrant_location: '' };
  let stats = null;
  let documents = [];
  let selectedDoc = null;
  let errorMsg = '';
  let successMsg = '';

  $: totalPages = documents.reduce((acc, d) => acc + (d.page_count || 1), 0);

  function triggerFileInput() {
    const el =
      document.getElementById('global-file-input') || document.getElementById('file-input');
    if (el) el.click();
  }

  // Upload State
  let isUploading = false;
  let uploadStep = 0;
  let retentionDays = 90;

  // Search State
  let searchQuery = '';
  let searchResults = [];
  let isSearching = false;

  // Viewer State
  let isRedactedView = false;
  let isReanalyzing = false;
  let activeHighlightTerm = '';
  let activeHighlightKey = '';
  let viewerRightTab = 'intel';
  let chatMessages = [];
  let isChatLoading = false;
  let chatInput = '';
  let currentChatDocId = null;

  // Comparison State
  let compareBaseDocId = '';
  let compareTargetDocId = '';
  let isComparing = false;
  let comparisonResult = null;
  let compareFilterCategory = 'all';
  let compareFilterType = 'all';
  let compareSearch = '';
  let copiedReport = false;

  // Compliance State
  let complianceStats = null;
  let auditLogs = [];
  let auditFilter = 'valid';
  let auditSearchQuery = '';
  let isLoadingCompliance = false;
  let isExportingAudit = false;

  // Delete Confirmation Modal State
  let isDeleteModalOpen = false;
  let docToDelete = null;
  let deleteModalMode = 'document';
  let isDeletingDoc = false;

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

  let cleanupRouter = null;

  onDestroy(() => {
    if (cleanupRouter) cleanupRouter();
  });

  onMount(async () => {
    cleanupRouter = router.init();
    progress.start('Initializing document workspace...');
    try {
      currentUser = getCurrentUser();
      if (!getAuthToken()) {
        try {
          const guestData = await startGuestSession();
          currentUser = guestData.user;
        } catch (err) {
          console.warn('Could not auto-start guest session:', err);
        }
      }
      await refreshAll(true);
    } finally {
      progress.done();
    }

    if (typeof window !== 'undefined') {
      const hasDismissed = localStorage.getItem('cognifolio_security_guide_dismissed');
      if (!hasDismissed) {
        setTimeout(() => {
          isSecurityGuideOpen = true;
        }, 350);
      }
    }
  });

  async function refreshAll(isInitial = false) {
    try {
      const [healthRes, statsRes, docRes] = await Promise.allSettled([
        fetchHealth(),
        getDashboardStats(),
        listDocuments(),
      ]);

      if (healthRes.status === 'fulfilled') health = healthRes.value;
      if (statsRes.status === 'fulfilled') stats = statsRes.value;
      if (docRes.status === 'fulfilled') {
        documents = docRes.value?.items || [];
        if (documents.length > 0 && !selectedDoc) {
          selectedDoc = documents[0];
        }
      }

      if (activeTab === 'privacy') {
        await refreshCompliance();
      } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          getComplianceStats()
            .then((cs) => {
              complianceStats = cs;
            })
            .catch(() => {});
        });
      } else {
        setTimeout(() => {
          getComplianceStats()
            .then((cs) => {
              complianceStats = cs;
            })
            .catch(() => {});
        }, 1500);
      }
    } catch (err) {
      if (!isInitial) {
        errorMsg = err.message;
      } else {
        console.warn('Backend warm-up in progress:', err.message);
      }
    }
  }

  async function refreshCompliance() {
    try {
      isLoadingCompliance = true;
      complianceStats = await getComplianceStats();
      const res = await getAuditLogs({ action: auditFilter, search: auditSearchQuery, limit: 25 });
      auditLogs = res.items || [];
    } catch (err) {
      console.error('Compliance fetch error:', err);
    } finally {
      isLoadingCompliance = false;
    }
  }

  async function handleFileUpload(fileToUpload) {
    if (!fileToUpload) return;
    if (fileToUpload.size > 50 * 1024 * 1024) {
      errorMsg = 'File size exceeds maximum limit of 50MB. Please select a document under 50MB.';
      return;
    }
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
      uploadStep = 5;
      selectedDoc = res;
      documents = [res, ...documents.filter((d) => d.id !== res.id)];
      isUploading = false;
      uploadStep = 0;
      switchTab('viewer', { params: { docId: res.id } });
      successMsg = `Document "${res.original_filename}" processed & ready in Studio Viewer.`;
      refreshAll().catch(() => {});
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

  async function handleSearch(queryToSearch = null) {
    const q = queryToSearch !== null ? queryToSearch : searchQuery;
    if (!q || !q.trim()) return;
    searchQuery = q;
    isSearching = true;
    errorMsg = '';
    try {
      const res = await semanticSearch(q);
      searchResults = res.results || [];
      switchTab('search', { params: { q } });
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isSearching = false;
    }
  }

  async function viewDocumentDetail(docOrId) {
    try {
      const id =
        typeof docOrId === 'object' && docOrId !== null
          ? docOrId.id || docOrId.document_id
          : docOrId;
      if (!id) return;
      selectedDoc = await getDocument(id);
      switchTab('viewer', { params: { docId: id } });
    } catch (err) {
      const id =
        typeof docOrId === 'object' && docOrId !== null
          ? docOrId.id || docOrId.document_id
          : docOrId;
      const localDoc = documents.find((d) => d.id === id);
      if (localDoc) {
        selectedDoc = localDoc;
        switchTab('viewer', { params: { docId: id } });
      } else {
        errorMsg = err.message || 'Failed to load document';
      }
    }
  }

  async function triggerReanalyze(docId) {
    if (!docId || isReanalyzing) return;
    isReanalyzing = true;
    try {
      const updatedDoc = await reanalyzeDocument(docId);
      selectedDoc = updatedDoc;
      documents = documents.map((d) => (d.id === docId ? updatedDoc : d));
      successMsg = 'Document re-analysis completed successfully.';
      setTimeout(() => {
        successMsg = '';
      }, 3500);
    } catch (err) {
      console.error('Re-analysis error:', err);
      errorMsg = err.message || 'Network error while requesting AI re-analysis.';
      setTimeout(() => {
        errorMsg = '';
      }, 4000);
    } finally {
      isReanalyzing = false;
    }
  }

  function promptDeleteDocument(docOrId) {
    if (!docOrId) return;
    if (typeof docOrId === 'string') {
      const found = documents.find((d) => d.id === docOrId);
      docToDelete =
        found || (selectedDoc && selectedDoc.id === docOrId ? selectedDoc : { id: docOrId });
    } else {
      docToDelete = docOrId;
    }
    deleteModalMode = 'document';
    isDeleteModalOpen = true;
  }

  function promptPurgeWorkspace() {
    docToDelete = null;
    deleteModalMode = 'workspace';
    isDeleteModalOpen = true;
  }

  function closeDeleteModal() {
    if (!isDeletingDoc) {
      isDeleteModalOpen = false;
      docToDelete = null;
    }
  }

  async function confirmDelete() {
    if (isDeletingDoc) return;
    isDeletingDoc = true;
    try {
      if (deleteModalMode === 'workspace') {
        const deletePromises = documents.map((d) => deleteDocument(d.id));
        await Promise.all(deletePromises);
        documents = [];
        if (selectedDoc) {
          selectedDoc = null;
        }
        if (activeTab === 'viewer') {
          switchTab('dashboard');
        }
        await refreshAll();
        isDeleteModalOpen = false;
        successMsg = 'All workspace documents and vector embeddings have been securely purged.';
        setTimeout(() => {
          successMsg = '';
        }, 4000);
      } else if (docToDelete) {
        const id = docToDelete.id;
        documents = documents.filter((d) => d.id !== id);
        if (selectedDoc && selectedDoc.id === id) {
          selectedDoc = null;
          if (activeTab === 'viewer') {
            switchTab('dashboard');
          }
        }
        await deleteDocument(id);
        await refreshAll();
        isDeleteModalOpen = false;
        docToDelete = null;
        successMsg = 'Document and vector embeddings permanently deleted.';
        setTimeout(() => {
          successMsg = '';
        }, 3500);
      }
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isDeletingDoc = false;
    }
  }

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
    switchTab('compare');
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(report);
    }
    copiedReport = true;
    setTimeout(() => (copiedReport = false), 2500);
  }

  // Conversational Document AI Handlers
  $: if (selectedDoc && selectedDoc.id !== currentChatDocId) {
    currentChatDocId = selectedDoc.id;
    chatMessages = [];
  }

  async function handleSendChat(question = null) {
    const textToSend = (question || chatInput).trim();
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
    }
  }

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

  function handleLocateTakeaway(pt) {
    if (!pt) return;
    const shortLabel = pt.length > 36 ? pt.slice(0, 36) + '...' : pt;
    highlightInDoc({
      type: 'takeaway',
      text: pt,
      id: pt,
      label: shortLabel,
    });
  }

  function handleLocateEntity(key, val) {
    if (!val) return;
    const rawVal =
      val && typeof val === 'object' && !Array.isArray(val) && val.value !== undefined
        ? val.value
        : val;
    const box2d =
      val && typeof val === 'object' && !Array.isArray(val) && val.box_2d ? val.box_2d : null;
    const valStr = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
    const formattedKey = key.replace(/_/g, ' ');
    highlightInDoc({
      type: 'entity',
      key: key,
      val: valStr,
      box_2d: box2d,
      text: `${formattedKey}: ${valStr}`,
      id: key,
      label: formattedKey,
    });
  }

  function handleLocateRiskClause(clause) {
    if (!clause) return;
    const shortLabel = clause.length > 36 ? clause.slice(0, 36) + '...' : clause;
    highlightInDoc({
      type: 'clause',
      text: clause,
      id: clause,
      label: shortLabel,
    });
  }

  function handleLocateLineItem(item) {
    if (!item || !item.description) return;
    const amountVal = item.amount ? Math.round(item.amount).toString() : '';
    const query = amountVal ? `${item.description} ${amountVal}` : item.description;
    highlightInDoc({
      type: 'line_item',
      text: query,
      amount: item.amount,
      box_2d: item.box_2d || null,
      id: item.description,
      label: 'Line Item',
    });
  }

  function handleSpatialEntitySelect(event) {
    const detail = event.detail;
    if (!detail) return;
    if (detail.type === 'entity') {
      activeHighlightKey = detail.key;
      activeHighlightTerm = {
        type: 'entity',
        key: detail.key,
        val: detail.value,
        id: detail.id,
        label: detail.label,
        box_2d: detail.rawVal && detail.rawVal.box_2d ? detail.rawVal.box_2d : null,
      };
    } else if (detail.type === 'line_item') {
      activeHighlightKey = detail.id;
      activeHighlightTerm = {
        type: 'line_item',
        text: detail.value,
        id: detail.id,
        label: 'Line Item',
        box_2d: detail.rawVal && detail.rawVal.box_2d ? detail.rawVal.box_2d : null,
      };
    }
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

  function handleHeaderNavigation(e) {
    if (e.detail.tab === 'portal') {
      activeTab = 'portal';
      lastRouterTab = 'portal';
      router.navigate('portal', { anchor: e.detail.anchor });
      if (e.detail.anchor && typeof window !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById(e.detail.anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    } else {
      switchTab(e.detail.tab || 'dashboard');
    }
  }
</script>

<div class="app-layout">
  <!-- Global Top Progress Bar & Network Activity Indicator -->
  <CProgressBar />

  <!-- Global File Intake Input (Always Accessible) -->
  <input
    type="file"
    id="global-file-input"
    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
    on:change={(e) => handleFileUpload(e.target.files[0])}
    class="hidden"
  />

  <!-- Top Navigation Bar (Single Persistent Unified Cognifolio Header) -->
  <AppHeader
    {currentUser}
    {activeTab}
    on:navigate={handleHeaderNavigation}
    on:openSecurityGuide={() => (isSecurityGuideOpen = true)}
    on:openPricing={() => (isPricingModalOpen = true)}
    on:openMorrowless={() => (isMorrowlessModalOpen = true)}
    on:triggerUpload={triggerFileInput}
    on:openAuthModal={(e) => openAuthModal(e.detail?.mode || 'signin')}
    on:logout={handleLogout}
  />

  <!-- Navigation Ribbon for Operational Workspace Mode -->
  {#if activeTab !== 'portal'}
    <div class="workspace-navigation-ribbon">
      <CTabs tabs={navTabs} {activeTab} on:change={(e) => switchTab(e.detail.id)} />
    </div>
  {/if}

  <!-- Notifications & Global Alerts -->
  {#if errorMsg}
    <div class="alert alert-error">
      <span>⚠️ {errorMsg}</span>
      <button type="button" class="close-btn" on:click={() => (errorMsg = '')}>✕</button>
    </div>
  {/if}

  {#if successMsg}
    <div class="alert alert-success">
      <span>✅ {successMsg}</span>
      <button type="button" class="close-btn" on:click={() => (successMsg = '')}>✕</button>
    </div>
  {/if}

  <!-- Main Single Page Application Content Container -->
  <main class="content-container {activeTab === 'portal' ? 'portal-mode' : ''}">
    {#if activeTab === 'portal'}
      <!-- Flagship Commercial Platform Showcase (Enterprise Layout & Cognifolio Branding) -->
      <CognifolioPortal
        showHeader={false}
        showFooter={false}
        {documents}
        {currentUser}
        on:launchStudio={(e) => {
          switchTab(e.detail?.tab || 'dashboard');
        }}
        on:upload={triggerFileInput}
        on:openPricing={() => (isPricingModalOpen = true)}
        on:openSecurityGuide={() => (isSecurityGuideOpen = true)}
        on:openMorrowless={() => (isMorrowlessModalOpen = true)}
        on:openDoc={(e) => {
          selectedDoc = e.detail.doc;
          switchTab('viewer', { params: { docId: selectedDoc?.id } });
        }}
        on:openAuthModal={(e) => openAuthModal(e.detail?.mode || 'signin')}
        on:logout={handleLogout}
      />
    {:else if activeTab === 'dashboard'}
      <!-- TAB 1: DOCUMENTS WORKSPACE -->
      <DocumentsWorkspace
        {documents}
        {totalPages}
        {sampleDocuments}
        on:upload={triggerFileInput}
        on:uploadSample={(e) => uploadSample(e.detail.sample)}
        on:viewDocument={(e) => viewDocumentDetail(e.detail.docId)}
        on:compareDocument={(e) => openCompareWithDoc(e.detail.docId)}
        on:deleteDocument={(e) => promptDeleteDocument(e.detail.doc)}
        on:openSecurityGuide={() => (isSecurityGuideOpen = true)}
      />
    {:else if activeTab === 'upload'}
      <!-- TAB 2: UPLOAD & PROCESSING WORKSPACE -->
      <UploadWorkspace
        bind:retentionDays
        {uploadStep}
        {isUploading}
        {sampleDocuments}
        on:upload={(e) => handleFileUpload(e.detail.file)}
        on:uploadSample={(e) => uploadSample(e.detail.sample)}
        on:openSecurityGuide={() => (isSecurityGuideOpen = true)}
      />
    {:else if activeTab === 'viewer'}
      <!-- TAB 3: UNIVERSAL STUDIO VIEWER WORKSPACE -->
      <ViewerWorkspace
        {selectedDoc}
        {PdfViewerComponent}
        {isPdfViewerLoading}
        bind:isRedactedView
        {isReanalyzing}
        bind:activeHighlightTerm
        {activeHighlightKey}
        bind:viewerRightTab
        {chatMessages}
        {isChatLoading}
        bind:chatInput
        {getDocumentFileUrl}
        {getRedactedFileUrl}
        on:reanalyze={(e) => triggerReanalyze(e.detail.docId)}
        on:deleteDocument={(e) => promptDeleteDocument(e.detail.doc)}
        on:sendChat={(e) => handleSendChat(e.detail.question)}
        on:clearChat={() => (chatMessages = [])}
        on:locateTakeaway={(e) => handleLocateTakeaway(e.detail.takeaway)}
        on:locateEntity={(e) => handleLocateEntity(e.detail.key, e.detail.val)}
        on:locateRiskClause={(e) => handleLocateRiskClause(e.detail.clause)}
        on:locateLineItem={(e) => handleLocateLineItem(e.detail.item)}
        on:citationClick={(e) => {
          if (e.detail?.citation?.text) {
            highlightInDoc({
              type: e.detail.citation.type || 'clause',
              text: e.detail.citation.text,
              id: e.detail.citation.text,
              label: e.detail.citation.label || 'Citation',
            });
          }
        }}
        on:spatialEntitySelect={handleSpatialEntitySelect}
        on:returnToDashboard={() => {
          switchTab('dashboard');
        }}
      />
    {:else if activeTab === 'search'}
      <!-- TAB 4: LAZY SEMANTIC SEARCH WORKSPACE -->
      <SearchWorkspace
        bind:searchQuery
        {searchResults}
        {isSearching}
        on:search={(e) => handleSearch(e.detail.query)}
        on:viewDocument={(e) => viewDocumentDetail(e.detail.docId)}
      />
    {:else if activeTab === 'compare'}
      <!-- TAB 5: MULTI-DOCUMENT REDLINE COMPARE WORKSPACE -->
      <CompareWorkspace
        {documents}
        {comparisonResult}
        bind:compareBaseDocId
        bind:compareTargetDocId
        {isComparing}
        {copiedReport}
        bind:compareSearch
        bind:compareFilterType
        bind:compareFilterCategory
        on:runComparison={handleRunComparison}
        on:swapDocs={swapCompareDocs}
        on:copyReport={copyComparisonReport}
        on:inspectDoc={(e) => {
          viewDocumentDetail(e.detail.docId);
        }}
      />
    {:else if activeTab === 'privacy'}
      <!-- TAB 6: AUDIT & COMPLIANCE WORKSPACE -->
      <ComplianceWorkspace
        {complianceStats}
        {auditLogs}
        bind:auditFilter
        bind:auditSearchQuery
        {isLoadingCompliance}
        {isExportingAudit}
        on:refresh={refreshCompliance}
        on:export={(e) => handleExportAudit(e.detail.format)}
        on:purgeWorkspace={promptPurgeWorkspace}
        on:filterChange={() => refreshCompliance()}
      />
    {/if}
  </main>

  <!-- Bottom Navigation Bar (Single Persistent Unified Cognifolio Footer) -->
  <AppFooter
    on:openPricing={() => (isPricingModalOpen = true)}
    on:openSecurityGuide={() => (isSecurityGuideOpen = true)}
    on:openMorrowless={() => (isMorrowlessModalOpen = true)}
  />

  <!-- Global Modals (Mounted once at the SPA root) -->
  <PricingModal bind:isOpen={isPricingModalOpen} />
  <MorrowlessModal bind:isOpen={isMorrowlessModalOpen} />
  <SecurityGuideModal bind:isOpen={isSecurityGuideOpen} />

  <DeleteConfirmModal
    isOpen={isDeleteModalOpen}
    doc={docToDelete}
    mode={deleteModalMode}
    isLoading={isDeletingDoc}
    on:confirm={confirmDelete}
    on:cancel={closeDeleteModal}
  />

  {#if isAuthModalOpen && AuthModalComponent}
    <svelte:component
      this={AuthModalComponent}
      bind:isOpen={isAuthModalOpen}
      initialMode={authModalMode}
      on:success={handleAuthSuccess}
      on:close={() => (isAuthModalOpen = false)}
    />
  {/if}
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--bg-primary, #08090b);
    color: var(--text-main, #f6f6f6);
    position: relative;
    padding-bottom: 60px; /* Offset for fixed unified footer */
  }

  .hidden {
    display: none !important;
  }

  .workspace-navigation-ribbon {
    width: min(1380px, calc(100% - 40px));
    margin: 16px auto 0;
  }

  .content-container {
    width: min(1380px, calc(100% - 40px));
    margin: 0 auto;
    padding: 24px 0 40px;
    flex: 1;
  }

  .content-container.portal-mode {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0 0 40px;
  }

  /* Global Alert Banners */
  .alert {
    width: min(1380px, calc(100% - 40px));
    margin: 16px auto 0;
    padding: 12px 18px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.88rem;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: slideDown 0.2s ease-out;
  }

  .alert-error {
    background: #2a1215;
    border: 1px solid #632025;
    color: #f87171;
  }

  .alert-success {
    background: #12281e;
    border: 1px solid #1e5a40;
    color: #67d8a2;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1rem;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.8;
  }

  .close-btn:hover {
    opacity: 1;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .workspace-navigation-ribbon,
    .content-container,
    .alert {
      width: calc(100% - 24px);
    }
  }
</style>
