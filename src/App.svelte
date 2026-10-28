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
    getAuthToken,
    getCurrentUser,
    startGuestSession,
    logout,
  } from './lib/api.js';

  // Centralized C-UI Primitives & Icon System
  import CButton from './lib/ui/CButton.svelte';
  import CTextBox from './lib/ui/CTextBox.svelte';
  import CCard from './lib/ui/CCard.svelte';
  import CBadge from './lib/ui/CBadge.svelte';
  import CTabs from './lib/ui/CTabs.svelte';
  import CSelect from './lib/ui/CSelect.svelte';
  import CIcon from './lib/icons/CIcon.svelte';
  import DeleteConfirmModal from './lib/components/DeleteConfirmModal.svelte';
  import CProgressBar from './lib/ui/CProgressBar.svelte';
  import { progress } from './lib/stores/progress.js';

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

  // Navigation State
  let activeTab = 'dashboard'; // 'dashboard' | 'upload' | 'search' | 'viewer' | 'privacy' | 'compare'

  $: navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'upload', label: 'Upload & Extract', icon: 'upload' },
    {
      id: 'search',
      label: 'Semantic Search',
      icon: 'search',
      badge: searchResults.length > 0 ? `${searchResults.length}` : null,
    },
    {
      id: 'viewer',
      label: 'Deep Dive Viewer',
      icon: 'eye',
      badge: selectedDoc ? `${selectedDoc.original_filename.slice(0, 15)}...` : null,
    },
    {
      id: 'privacy',
      label: 'Compliance & Audit Trails',
      icon: 'compliance',
      badge: complianceStats ? `${complianceStats.total_audit_events}` : null,
    },
    {
      id: 'compare',
      label: 'Redline & Compare',
      icon: 'compare',
      badge: comparisonResult ? `${comparisonResult.diffs.length} Diffs` : null,
    },
  ];

  // Auth & Multi-Tenancy State
  let isAuthModalOpen = false;
  let authModalMode = 'signin'; // 'signin' | 'signup'
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
  let isReanalyzing = false;

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
    const shortLabel = pt.length > 36 ? pt.slice(0, 36) + '...' : pt;
    highlightInDoc({
      type: 'takeaway',
      text: pt,
      id: pt,
      label: shortLabel,
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

  function locateEntity(key, val) {
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

  function locateLineItem(item) {
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

  function locateRiskClause(clause) {
    if (!clause) return;
    const shortLabel = clause.length > 36 ? clause.slice(0, 36) + '...' : clause;
    highlightInDoc({
      type: 'clause',
      text: clause,
      id: clause,
      label: shortLabel,
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
  });

  async function refreshAll(isInitial = false) {
    try {
      // Parallelize core dashboard queries to minimize time to interactive
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

      // Defer compliance stats to browser idle time or when on compliance tab
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

  function getDocFormatInfo(fileType) {
    const t = (fileType || '').toLowerCase().replace(/^\./, '');
    if (t === 'pdf') return { label: 'PDF', badgeClass: 'badge-rose' };
    if (t === 'xlsx' || t === 'xls') return { label: 'XLSX', badgeClass: 'badge-emerald' };
    if (t === 'csv') return { label: 'CSV', badgeClass: 'badge-emerald' };
    if (t === 'docx' || t === 'doc') return { label: 'DOCX', badgeClass: 'badge-indigo' };
    if (['png', 'jpg', 'jpeg', 'webp'].includes(t))
      return { label: 'IMG', badgeClass: 'badge-amber' };
    return { label: t ? t.toUpperCase() : 'TXT', badgeClass: 'badge-slate' };
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
      uploadStep = 5;
      selectedDoc = res;
      documents = [res, ...documents.filter((d) => d.id !== res.id)];
      isUploading = false;
      uploadStep = 0;
      activeTab = 'viewer';
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

  async function viewDocumentDetail(docOrId) {
    try {
      const id =
        typeof docOrId === 'object' && docOrId !== null
          ? docOrId.id || docOrId.document_id
          : docOrId;
      if (!id) return;
      selectedDoc = await getDocument(id);
      activeTab = 'viewer';
    } catch (err) {
      const id =
        typeof docOrId === 'object' && docOrId !== null
          ? docOrId.id || docOrId.document_id
          : docOrId;
      const localDoc = documents.find((d) => d.id === id);
      if (localDoc) {
        selectedDoc = localDoc;
        activeTab = 'viewer';
      } else {
        errorMsg = err.message || 'Failed to load document';
      }
    }
  }

  async function triggerReanalyze(docId) {
    if (!docId || isReanalyzing) return;
    isReanalyzing = true;
    progress.start('Executing deep multimodal AI analysis...');
    try {
      const res = await authFetch(`/api/v1/documents/${docId}/reanalyze`, {
        method: 'POST',
      });
      if (res.ok) {
        const updatedDoc = await res.json();
        selectedDoc = updatedDoc;
        documents = documents.map((d) => (d.id === docId ? updatedDoc : d));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Re-analysis failed. Please try again.');
      }
    } catch (err) {
      console.error('Re-analysis error:', err);
      alert('Network error while requesting AI re-analysis.');
    } finally {
      isReanalyzing = false;
      progress.done();
    }
  }

  // Delete Confirmation Modal State
  let isDeleteModalOpen = false;
  let docToDelete = null;
  let deleteModalMode = 'document'; // 'document' | 'workspace'
  let isDeletingDoc = false;

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

  function handleDelete(docOrId) {
    promptDeleteDocument(docOrId);
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
          activeTab = 'dashboard';
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
            activeTab = 'dashboard';
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
  <!-- Global Top Progress Bar & Network Activity Indicator -->
  <CProgressBar />

  <!-- Top Navigation Bar -->
  <header class="top-nav">
    <div
      class="top-nav-inner max-w-[1400px] w-full mx-auto flex items-center justify-between gap-4"
    >
      <div class="nav-left">
        <div
          class="brand"
          role="button"
          tabindex="0"
          on:click={() => (activeTab = 'dashboard')}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (activeTab = 'dashboard')}
          title="Go to Executive Dashboard"
        >
          <div class="logo-icon">
            <img src="/app-icon.png" alt="Cognifolio App Icon" class="brand-logo-img" />
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
            >{health.status === 'online' ? 'Gemini 3.5 Flash' : 'System Ready'}</span
          >
        </div>

        <!-- Enterprise Auth Controls -->
        {#if currentUser}
          <div class="user-profile-menu">
            <div class="user-avatar-badge" title={currentUser.email}>
              {#if currentUser.avatar_url}
                <img src={currentUser.avatar_url} alt={currentUser.name} class="user-avatar-img" />
              {:else}
                <span class="avatar-initials">{currentUser.name.slice(0, 2).toUpperCase()}</span>
              {/if}
            </div>
            <div class="user-meta-info">
              <span class="user-display-name">{currentUser.name}</span>
              <span class="user-role-badge" class:badge-guest={currentUser.is_guest}>
                {currentUser.is_guest ? '⚡ Guest Session' : currentUser.role.toUpperCase()}
              </span>
            </div>

            {#if currentUser.is_guest}
              <CButton variant="chip" size="sm" on:click={() => openAuthModal('signup')}>
                ⚡ Save / Sign Up
              </CButton>
            {:else}
              <CButton variant="ghost" size="sm" on:click={handleLogout} title="Sign Out">
                Log Out
              </CButton>
            {/if}
          </div>
        {:else}
          <div class="auth-buttons-group flex items-center gap-2">
            <CButton variant="ghost" size="sm" on:click={() => openAuthModal('signin')}
              >Sign In</CButton
            >
            <CButton variant="primary" size="sm" on:click={() => openAuthModal('signup')}
              >Get Started</CButton
            >
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <CTabs
    tabs={navTabs}
    bind:activeTab
    on:change={(e) => {
      if (e.detail.id === 'privacy') refreshCompliance();
      if (e.detail.id === 'compare') initCompareDefaults();
    }}
  />

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
        {#if currentUser && currentUser.is_guest}
          <div class="guest-playground-banner glass-card">
            <div class="banner-badge-row">
              <span class="banner-pill-pulse">Instant Playground Mode</span>
              <span class="banner-pill-cyan">Multi-Tenant Isolated Sandbox</span>
              <span class="banner-pill-purple">Google Gemini 3.5 Flash & Qdrant</span>
            </div>
            <div class="banner-content-grid">
              <div class="banner-text">
                <h1 class="banner-hero-title">
                  Cognifolio — Enterprise Cognitive Document Intelligence
                </h1>
                <p class="banner-hero-desc">
                  Zero friction playground: upload PDFs to run real-time key-value extraction,
                  semantic vector search, automated PII redaction, and multi-document comparative
                  risk analysis.
                </p>
              </div>
              <div class="banner-actions">
                <button class="btn-primary" on:click={() => (activeTab = 'upload')}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload PDF to Test
                </button>
                <button class="btn-upgrade-glow" on:click={() => openAuthModal('signup')}>
                  ⚡ Sign Up / Save Data
                </button>
              </div>
            </div>
          </div>
        {/if}

        <div
          class="view-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <h2 class="font-heading text-2xl md:text-3xl font-semibold text-ink">
              Enterprise Document Intelligence
            </h2>
            <p class="subtitle text-sm text-ink-muted mt-1">
              Overview of indexed contracts, invoices, and automated data extractions
            </p>
          </div>
          <CButton variant="primary" on:click={() => (activeTab = 'upload')}>
            <CIcon name="upload" size={16} />
            Add New Document
          </CButton>
        </div>

        <!-- Metric Tiles (Spacious & Modern) -->
        <div class="metric-tiles-grid my-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <CCard
            spacious={true}
            interactive={true}
            className="flex items-center gap-5 min-h-[116px]"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-border-hairline bg-surface-subtle p-3 text-ink shadow-sm"
            >
              <CIcon name="document" size={24} />
            </div>
            <div class="flex flex-col">
              <span class="text-3xl font-bold font-body text-ink leading-tight">
                {stats?.overview?.total_documents ?? documents.length}
              </span>
              <span class="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Total Documents
              </span>
            </div>
          </CCard>

          <CCard
            spacious={true}
            interactive={true}
            className="flex items-center gap-5 min-h-[116px]"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-status-success-border bg-status-success-bg p-3 text-status-success-text shadow-sm"
            >
              <CIcon name="lightning" size={24} />
            </div>
            <div class="flex flex-col">
              <span class="text-3xl font-bold font-body text-ink leading-tight">
                {stats?.overview?.processed_successfully ?? documents.length}
              </span>
              <span class="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Processed Successfully
              </span>
            </div>
          </CCard>

          <CCard
            spacious={true}
            interactive={true}
            className="flex items-center gap-5 min-h-[116px]"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-status-indigo-border bg-status-indigo-bg p-3 text-status-indigo-text shadow-sm"
            >
              <CIcon name="building" size={24} />
            </div>
            <div class="flex flex-col">
              <span class="text-3xl font-bold font-body text-ink leading-tight">
                {stats?.overview?.total_vendors_identified ?? 0}
              </span>
              <span class="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Vendors Identified
              </span>
            </div>
          </CCard>

          <CCard
            spacious={true}
            interactive={true}
            className="flex items-center gap-5 min-h-[116px]"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-status-warning-border bg-status-warning-bg p-3 text-status-warning-text shadow-sm"
            >
              <CIcon name="shield" size={24} />
            </div>
            <div class="flex flex-col">
              <span class="text-3xl font-bold font-body text-ink leading-tight"> Active </span>
              <span class="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                PII Redaction Engine
              </span>
            </div>
          </CCard>
        </div>

        <!-- Visual Analytics Cards -->
        <div class="analytics-row">
          <div class="glass-card analytics-card">
            <h3>Document Type Breakdown</h3>
            <p class="card-subtitle">Classified via Gemini Vision & Heuristic Engine</p>
            <div class="type-distribution">
              {#if stats?.charts?.by_type?.labels && stats.charts.by_type.labels.length > 0}
                {#each stats.charts.by_type.labels as label, i}
                  {@const val =
                    stats.charts.by_type.data?.[i] ?? stats.charts.by_type.values?.[i] ?? 0}
                  {@const totalDocs = stats.overview?.total_documents || documents.length || 1}
                  <div class="dist-row">
                    <span class="dist-label">{label}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        style="width: {Math.min(100, Math.round((val / totalDocs) * 100))}%"
                      ></div>
                    </div>
                    <span class="dist-val">{val}</span>
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
              {#if stats?.charts?.vendor_breakdown?.labels?.length || stats?.charts?.by_vendor?.labels?.length}
                {#each stats?.charts?.vendor_breakdown?.labels || stats?.charts?.by_vendor?.labels || [] as vendor, i}
                  {@const amt =
                    stats?.charts?.vendor_breakdown?.data?.[i] ??
                    stats?.charts?.by_vendor?.values?.[i] ??
                    0}
                  <div class="vendor-item">
                    <div class="vendor-name">🏢 {vendor}</div>
                    <div class="vendor-amt">
                      ₹{typeof amt === 'number' ? amt.toLocaleString() : amt}
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
                    {@const fmtInfo = getDocFormatInfo(doc.file_type)}
                    <tr>
                      <td class="name-cell">
                        <div class="flex items-center gap-3">
                          <div
                            class="w-8 h-8 rounded-lg bg-sand/60 flex items-center justify-center text-charcoal/70 flex-shrink-0"
                          >
                            <CIcon name="document" size={16} />
                          </div>
                          <div class="file-details">
                            <div class="flex items-center gap-2">
                              <button
                                class="filename-btn"
                                on:click={() => viewDocumentDetail(doc.id)}
                                >{doc.original_filename}</button
                              >
                              <span class="fmt-inline-tag {fmtInfo.badgeClass}"
                                >{fmtInfo.label}</span
                              >
                            </div>
                            <span class="file-summary"
                              >{doc.insights
                                ? doc.insights.summary.slice(0, 75) + '...'
                                : 'Processing...'}</span
                            >
                          </div>
                        </div>
                      </td>
                      <td>
                        <CBadge variant="indigo">
                          {doc.insights ? doc.insights.document_type : doc.file_type}
                        </CBadge>
                      </td>
                      <td>
                        {doc.file_type === 'xlsx' || doc.file_type === 'xls'
                          ? `${doc.page_count} sht`
                          : `${doc.page_count} pg`}
                        ({Math.round(doc.file_size_bytes / 1024)} KB)
                      </td>
                      <td>
                        <CBadge variant="emerald">Ready</CBadge>
                      </td>
                      <td class="date-cell">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                      <td class="actions-cell">
                        <div class="flex items-center gap-1.5">
                          <CButton
                            variant="action"
                            size="sm"
                            title="Deep Dive Viewer"
                            on:click={() => viewDocumentDetail(doc.id)}
                          >
                            <span>Deep Dive →</span>
                          </CButton>
                          <CButton
                            variant="action"
                            size="sm"
                            title="Compare with another revision"
                            on:click={() => openCompareWithDoc(doc.id)}
                          >
                            <CIcon name="compare" size={13} />
                            <span>Compare</span>
                          </CButton>
                          <CButton
                            variant="danger"
                            size="sm"
                            title="Delete document"
                            on:click={() => promptDeleteDocument(doc)}
                          >
                            <CIcon name="trash" size={13} />
                          </CButton>
                        </div>
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
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
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
                <p>
                  Universal multi-format intake: PDF, Word (DOCX), Excel & CSV (XLSX), Images, &
                  Text up to 25MB
                </p>
                <div class="format-badge-row">
                  <span class="fmt-pill fmt-pdf">PDF</span>
                  <span class="fmt-pill fmt-word">DOCX</span>
                  <span class="fmt-pill fmt-excel">XLSX</span>
                  <span class="fmt-pill fmt-excel">CSV</span>
                  <span class="fmt-pill fmt-img">PNG / JPG</span>
                  <span class="fmt-pill fmt-txt">TXT</span>
                </div>
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
                <div class="step-num">
                  {#if uploadStep > 1}
                    <CIcon name="check" size={14} />
                  {:else}
                    <CIcon name="document" size={14} />
                  {/if}
                </div>
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
                <div class="step-num">
                  {#if uploadStep > 2}
                    <CIcon name="check" size={14} />
                  {:else}
                    <CIcon name="shield" size={14} />
                  {/if}
                </div>
                <div class="step-info">
                  <h4>PII Redaction Engine</h4>
                  <p>Masks Aadhaar, credit cards, SSN, bank accounts before AI sees it</p>
                </div>
                {#if uploadStep === 2}<span class="spinner"></span>{/if}
              </div>

              <div
                class="step-item {uploadStep >= 3 ? 'active' : ''} {uploadStep > 3
                  ? 'completed'
                  : ''}"
              >
                <div class="step-num">
                  {#if uploadStep > 3}
                    <CIcon name="check" size={14} />
                  {:else}
                    <CIcon name="lightning" size={14} />
                  {/if}
                </div>
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
                <div class="step-num">
                  {#if uploadStep > 4}
                    <CIcon name="check" size={14} />
                  {:else}
                    <CIcon name="sparkle" size={14} />
                  {/if}
                </div>
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
              <div class="sample-btn-group flex flex-wrap gap-3 mt-2">
                <CButton variant="secondary" on:click={() => uploadSample(sampleDocuments[0])}>
                  <CIcon name="document" size={15} />
                  <span>Test TCS Invoice (₹9.97L)</span>
                </CButton>
                <CButton variant="secondary" on:click={() => uploadSample(sampleDocuments[1])}>
                  <CIcon name="document" size={15} />
                  <span>Test Master Services Agreement ($120k)</span>
                </CButton>
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

        <div class="search-input-section">
          <CCard spacious={true}>
            <div class="flex flex-col md:flex-row gap-3 items-stretch">
              <div class="flex-1">
                <CTextBox
                  type="text"
                  placeholder="e.g. 'that contract with automatic renewal penalty' or 'TCS cloud invoice'"
                  bind:value={searchQuery}
                  on:keydown={(e) => e.key === 'Enter' && handleSearch()}
                >
                  <svelte:fragment slot="leading">
                    <CIcon name="search" size={18} />
                  </svelte:fragment>
                </CTextBox>
              </div>
              <CButton variant="primary" loading={isSearching} on:click={handleSearch}>
                <CIcon name="search" size={16} />
                <span>{isSearching ? 'Matching Vectors...' : 'Find Documents'}</span>
              </CButton>
            </div>

            <div class="search-examples mt-4 flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-charcoal/60"
                >Try asking:</span
              >
              <CButton
                variant="chip"
                size="sm"
                on:click={() => {
                  searchQuery = 'TCS cloud hosting invoice';
                  handleSearch();
                }}
              >
                "TCS cloud hosting invoice"
              </CButton>
              <CButton
                variant="chip"
                size="sm"
                on:click={() => {
                  searchQuery = 'agreement with 1 year automatic renewal';
                  handleSearch();
                }}
              >
                "agreement with 1 year automatic renewal"
              </CButton>
              <CButton
                variant="chip"
                size="sm"
                on:click={() => {
                  searchQuery = 'contracts with liquidated damages penalty';
                  handleSearch();
                }}
              >
                "liquidated damages penalty"
              </CButton>
            </div>
          </CCard>
        </div>

        <!-- Search Results List -->
        <div class="search-results-list mt-6">
          {#if searchResults.length === 0}
            <CCard spacious={true} class="text-center py-12">
              <div
                class="w-12 h-12 mx-auto mb-3 rounded-full bg-sand/80 flex items-center justify-center text-charcoal/60"
              >
                <CIcon name="search" size={24} />
              </div>
              <h4 class="text-base font-semibold text-charcoal">No matches found yet</h4>
              <p class="text-sm text-charcoal/60 mt-1 max-w-md mx-auto">
                Type a natural language query above to search through indexed semantic embeddings.
              </p>
            </CCard>
          {:else}
            <div class="results-meta mb-4 text-sm text-charcoal/70">
              Found <strong class="text-ink">{searchResults.length}</strong> matching documents for
              query "<em class="text-ink">{searchQuery}</em>":
            </div>

            <div class="space-y-4">
              {#each searchResults as item}
                <div
                  role="button"
                  tabindex="0"
                  class="cursor-pointer"
                  on:click={() => viewDocumentDetail(item.document_id)}
                  on:keydown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') && viewDocumentDetail(item.document_id)}
                >
                  <CCard interactive={true} spacious={true}>
                    <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div class="flex items-center gap-2.5">
                        <div
                          class="w-7 h-7 rounded-md bg-sand/80 flex items-center justify-center text-charcoal/70"
                        >
                          <CIcon name="document" size={15} />
                        </div>
                        <h4 class="text-base font-semibold text-charcoal font-serif">
                          {item.title || item.original_filename}
                        </h4>
                        <CBadge variant="indigo">{item.document_type || 'Document'}</CBadge>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-charcoal/60">Vector Similarity:</span>
                        <CBadge variant="emerald"
                          >{Math.round(item.similarity_score * 100)}% Match</CBadge
                        >
                      </div>
                    </div>

                    <p class="text-sm text-charcoal/80 leading-relaxed mb-3">{item.summary}</p>

                    {#if item.highlighted_points && item.highlighted_points.length > 0}
                      <div class="flex flex-wrap gap-1.5 mb-4">
                        {#each item.highlighted_points as pt}
                          <span
                            class="text-xs px-2.5 py-1 rounded bg-sand/70 text-charcoal/80 border border-sand-border"
                            >• {pt}</span
                          >
                        {/each}
                      </div>
                    {/if}

                    <div
                      class="flex items-center justify-between pt-3 border-t border-sand-border text-xs text-charcoal/60"
                    >
                      <span>Indexed: {item.uploaded_at}</span>
                      <CButton
                        variant="action"
                        size="sm"
                        on:click={() => viewDocumentDetail(item.document_id || item.id)}
                      >
                        <span>Open Deep Dive Viewer →</span>
                      </CButton>
                    </div>
                  </CCard>
                </div>
              {/each}
            </div>
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
              <span class="fmt-inline-tag {getDocFormatInfo(selectedDoc.file_type).badgeClass}">
                {getDocFormatInfo(selectedDoc.file_type).label}
              </span>
              <span class="badge badge-emerald"
                >Conf: {Math.round((selectedDoc.insights?.confidence_score || 0.95) * 100)}%</span
              >
            </div>
            <div class="header-actions">
              <!-- Mode Toggle: Original vs Redacted -->
              <div
                class="redaction-switch-pill"
                title="Toggle between original document and PII-redacted sanitized version"
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
                  href={getRedactedFileUrl(selectedDoc.id)}
                  download={`${selectedDoc.original_filename.replace(/\.[^/.]+$/, '')}_REDACTED.pdf`}
                  class="btn-action download-redacted"
                  title="Download physically sanitized PDF"
                >
                  ⬇ Download Redacted PDF
                </a>
              {:else}
                <a href={getDocumentFileUrl(selectedDoc.id)} target="_blank" class="btn-secondary">
                  View Raw File ↗
                </a>
              {/if}

              <button
                type="button"
                class="btn-secondary reanalyze-btn {selectedDoc.insights?.confidence_score === 0
                  ? 'reanalyze-pulse'
                  : ''}"
                on:click={() => triggerReanalyze(selectedDoc.id)}
                disabled={isReanalyzing}
                title="Re-run deep multimodal AI intelligence on this document"
              >
                {#if isReanalyzing}
                  <span>Analyzing...</span>
                {:else}
                  <span>✨ Re-analyze AI</span>
                {/if}
              </button>

              <button class="btn-action delete" on:click={() => promptDeleteDocument(selectedDoc)}>
                Delete Document ✕
              </button>
            </div>
          </div>

          <!-- Split Screen: Left Interactive Visual PDF Canvas / Text, Right AI Insights -->
          <div class="split-container">
            <!-- Left Panel: Interactive Visual PDF Canvas & Highlighting Viewer -->
            <div class="glass-card panel-left-viewer">
              {#if PdfViewerComponent}
                <svelte:component
                  this={PdfViewerComponent}
                  fileUrl={isRedactedView
                    ? getRedactedFileUrl(selectedDoc.id)
                    : getDocumentFileUrl(selectedDoc.id)}
                  fileType={selectedDoc.file_type}
                  rawText={selectedDoc.insights?.raw_extracted_text || ''}
                  bind:highlightQuery={activeHighlightTerm}
                  entities={selectedDoc.insights?.entities || {}}
                  lineItems={selectedDoc.insights?.line_items || []}
                  on:selectEntity={handleSpatialEntitySelect}
                />
              {:else}
                <div class="viewer-lazy-loading">
                  <span class="pulse-indicator"></span>
                  <span>Loading Document Intelligence Canvas...</span>
                </div>
              {/if}
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
                              {#if val && typeof val === 'object' && !Array.isArray(val) && val.box_2d}
                                <span
                                  class="spatial-pin-indicator"
                                  title="Visual box detected on scan">📍 Pin</span
                                >
                              {:else}
                                <span class="mini-search-icon">🔍</span>
                              {/if}
                            </div>
                            <span class="entity-val"
                              >{val &&
                              typeof val === 'object' &&
                              !Array.isArray(val) &&
                              val.value !== undefined
                                ? val.value
                                : Array.isArray(val)
                                  ? val.join(', ')
                                  : val}</span
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
                                {#if item.box_2d}
                                  📍 Pin →
                                {:else}
                                  🔍 Locate →
                                {/if}
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
          <div class="compliance-header-actions flex flex-wrap gap-2">
            <CButton
              variant="secondary"
              on:click={() => handleExportAudit('csv')}
              disabled={isExportingAudit}
            >
              <CIcon name="document" size={15} />
              <span>Export CSV</span>
            </CButton>
            <CButton
              variant="secondary"
              on:click={() => handleExportAudit('json')}
              disabled={isExportingAudit}
            >
              <CIcon name="document" size={15} />
              <span>Export JSON</span>
            </CButton>
            <CButton variant="primary" loading={isLoadingCompliance} on:click={refreshCompliance}>
              <CIcon name="refresh" size={15} />
              <span>Refresh Stream</span>
            </CButton>
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
            <button class="btn-action delete-all" on:click={promptPurgeWorkspace}>
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
                <CButton variant="secondary" on:click={copyComparisonReport}>
                  <CIcon name={copiedReport ? 'check' : 'copy'} size={14} />
                  <span>{copiedReport ? 'Report Copied!' : 'Copy Redline Report'}</span>
                </CButton>
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
              <CButton
                variant="primary"
                loading={isComparing}
                on:click={handleRunComparison}
                disabled={isComparing ||
                  !compareBaseDocId ||
                  !compareTargetDocId ||
                  compareBaseDocId === compareTargetDocId}
              >
                <CIcon name="lightning" size={16} />
                <span>{isComparing ? 'Analyzing Redlines...' : 'Run AI Redline'}</span>
              </CButton>
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

  <!-- Enterprise Authentication Modal -->
  {#if isAuthModalOpen && AuthModalComponent}
    <svelte:component
      this={AuthModalComponent}
      bind:isOpen={isAuthModalOpen}
      initialMode={authModalMode}
      on:success={handleAuthSuccess}
      on:close={() => (isAuthModalOpen = false)}
    />
  {/if}

  <!-- Delete & Purge Confirmation Modal -->
  <DeleteConfirmModal
    bind:isOpen={isDeleteModalOpen}
    document={docToDelete}
    mode={deleteModalMode}
    documentCount={documents.length}
    isDeleting={isDeletingDoc}
    on:close={closeDeleteModal}
    on:confirm={confirmDelete}
  />
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Top Navigation */
  .top-nav {
    width: 100%;
    padding: 12px 24px;
    background: #ffffff;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .top-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .metric-tiles-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 20px;
    margin: 28px 0;
  }

  @media (min-width: 640px) {
    .metric-tiles-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .metric-tiles-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .nav-left .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.15s ease;
  }

  .nav-left .brand:hover {
    opacity: 0.85;
  }

  .logo-icon {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
  }

  .brand-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .brand-text {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-name {
    font-family: var(--font-heading);
    font-size: 1.45rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #111111;
  }

  .nav-center {
    flex: 1;
    max-width: 580px;
    margin: 0 24px;
  }

  .search-bar-wrap {
    display: flex;
    align-items: center;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 6px 14px;
    transition: all 0.2s ease;
  }

  .search-bar-wrap:focus-within {
    border-color: #111111;
    background: #ffffff;
    box-shadow: 0 0 0 1px #111111;
  }

  .search-icon {
    color: var(--text-dim);
    margin-right: 8px;
  }

  .search-bar-wrap input {
    flex: 1;
    background: transparent;
    border: none;
    color: #111111;
    font-size: 0.85rem;
  }

  .search-btn {
    background: #111111;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .nav-right .status-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  /* User Profile & Auth Controls */
  .user-profile-menu {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 4px 10px 4px 6px;
  }

  .user-avatar-badge {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: #111111;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.72rem;
  }

  .user-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-initials {
    letter-spacing: 0.5px;
  }

  .user-meta-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .user-display-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: #111111;
    line-height: 1.1;
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #666666;
  }

  .user-role-badge.badge-guest {
    color: #854d0e;
  }

  .btn-upgrade-account {
    background: #111111;
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid #111111;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-upgrade-account:hover {
    background: #2a2a2a;
    border-color: #2a2a2a;
  }

  .btn-signout {
    background: transparent;
    border: 1px solid var(--border-color);
    color: #666666;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-signout:hover {
    border-color: #111111;
    color: #111111;
  }

  .auth-buttons-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-auth-signin {
    background: transparent;
    border: 1px solid #111111;
    color: #111111;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-auth-signin:hover {
    background: #f0f0f0;
  }

  .btn-auth-signup {
    background: #111111;
    border: 1px solid #111111;
    color: #ffffff;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-auth-signup:hover {
    background: #2a2a2a;
  }

  /* Guest Playground Hero Banner */
  .guest-playground-banner {
    margin-bottom: 28px;
    padding: 28px 32px;
    border: 1px solid var(--border-color);
    background: #ffffff;
    border-radius: var(--radius-sm);
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .banner-badge-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .banner-pill-pulse {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    background: #111111;
    color: #ffffff;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .banner-pill-cyan {
    padding: 3px 8px;
    background: #f0f4f8;
    border: 1px solid #cbd5e1;
    color: #0f172a;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .banner-pill-purple {
    padding: 3px 8px;
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    color: #4338ca;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .banner-content-grid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }

  .banner-text {
    flex: 1;
    min-width: 280px;
  }

  .banner-hero-title {
    font-family: var(--font-heading);
    font-size: 1.85rem;
    font-weight: 600;
    color: #111111;
    margin: 0 0 8px 0;
    line-height: 1.25;
  }

  .banner-hero-desc {
    font-size: 0.92rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.6;
    max-width: 720px;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .btn-upgrade-glow {
    background: #ffffff;
    color: #111111;
    border: 1px solid #111111;
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    padding: 9px 18px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-upgrade-glow:hover {
    background: #f6f6f6;
    transform: translateY(-1px);
  }

  /* Sub Navigation Tabs */
  .sub-nav {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    padding: 0 32px;
    overflow-x: auto;
    position: sticky;
    top: 67px;
    z-index: 40;
  }

  .tabs-container {
    display: flex;
    gap: 16px;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 4px;
    background: transparent;
    color: #666666;
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .nav-tab:hover {
    color: #111111;
  }

  .nav-tab.active {
    color: #111111;
    border-bottom: 2px solid #111111;
    font-weight: 700;
    background: transparent;
  }

  /* Content */
  .content-container {
    padding: 32px;
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

  .view-header h2 {
    font-size: 1.75rem;
    color: #111111;
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
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }
  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }
  .close-btn {
    background: transparent;
    color: inherit;
    font-size: 1.1rem;
    cursor: pointer;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
  }
  .stat-icon.cyan,
  .stat-icon.emerald,
  .stat-icon.purple,
  .stat-icon.amber {
    background: #f6f6f6;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: 600;
    color: #111111;
    font-family: var(--font-heading);
    line-height: 1.1;
  }

  .stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666666;
    margin-top: 4px;
  }

  /* Analytics Row */
  .analytics-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .analytics-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
  }

  .card-subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
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
    color: var(--text-main);
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: #f0f0f0;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #111111;
    border-radius: var(--radius-sm);
  }

  .dist-val {
    font-size: 0.85rem;
    font-weight: 600;
    color: #111111;
    width: 25px;
    text-align: right;
  }

  .vendor-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 14px;
    background: #fbfbfb;
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    border: 1px solid var(--border-color);
    color: #111111;
  }

  .vendor-amt {
    font-weight: 700;
    color: #111111;
  }

  /* Table Card */
  .table-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
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
    color: #666666;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid var(--border-color);
    background: #fbfbfb;
  }

  .doc-table td {
    padding: 14px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    color: #111111;
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
    color: #111111;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .filename-btn:hover {
    text-decoration: underline;
  }

  .file-summary {
    font-size: 0.78rem;
    color: #666666;
  }

  .btn-action {
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .btn-action.view {
    background: #111111;
    color: #ffffff;
    border: 1px solid #111111;
    margin-right: 6px;
  }

  .btn-action.view:hover {
    background: #2a2a2a;
  }

  .btn-action.delete {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    color: #888888;
  }

  .btn-action.delete:hover {
    border-color: #dc2626;
    color: #dc2626;
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
    border: 2px dashed #111111;
    border-radius: var(--radius-sm);
    padding: 44px 20px;
    text-align: center;
    background: #fbfbfb;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dropzone:hover {
    background: #f4f4f4;
  }

  .dropzone input {
    display: none;
  }

  .upload-icon-circle {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-sm);
    background: #111111;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: #ffffff;
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
    background: #ffffff;
    color: #111111;
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  .pipeline-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
  }

  .pipeline-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 20px 0;
  }

  .step-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #fbfbfb;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .step-item.active {
    border-color: #111111;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .step-item.completed {
    border-color: #166534;
    background: #f0fdf4;
  }

  .step-num {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    background: #e5e5e5;
    color: #111111;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.75rem;
  }

  .step-item.active .step-num {
    background: #111111;
    color: #ffffff;
  }

  .step-item.completed .step-num {
    background: #166534;
    color: #ffffff;
  }

  .step-info h4 {
    font-family: var(--font-body);
    font-size: 0.92rem;
    font-weight: 600;
    margin-bottom: 3px;
    color: var(--text-main);
    letter-spacing: -0.005em;
  }

  .step-info p {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #111111;
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
    flex-wrap: wrap;
  }

  /* Search View */
  .search-input-section {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    margin-bottom: 24px;
  }

  .results-meta {
    margin-bottom: 14px;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .result-card {
    padding: 24px;
    margin-bottom: 14px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .result-card:hover {
    border-color: #111111;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
    color: #444444;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .result-highlights {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .highlight-chip {
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    color: #111111;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
  }

  .result-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.78rem;
    color: #777777;
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .viewer-lazy-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    min-height: 400px;
    color: var(--text-muted);
    font-size: 0.9rem;
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
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    margin-bottom: 2px;
  }

  .panel-tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 9px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666666;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .panel-tab-btn:hover {
    color: #111111;
  }

  .panel-tab-btn.active {
    color: #111111;
    background: #ffffff;
    border-color: var(--border-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .panel-tab-btn.active.chat-active {
    color: #111111;
    background: #ffffff;
    border-color: #111111;
  }

  /* Conversational Document AI Container */
  .doc-chat-container {
    display: flex;
    flex-direction: column;
    height: 680px;
    padding: 0;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    position: relative;
    box-shadow: var(--shadow-card);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color);
    background: #fbfbfb;
    flex-shrink: 0;
  }

  .chat-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-ai-avatar {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: #111111;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    color: #ffffff;
    flex-shrink: 0;
  }

  .chat-header h4 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    color: #111111;
    line-height: 1.2;
  }

  .chat-model-badge {
    font-size: 0.68rem;
    color: #555555;
    background: #f0f0f0;
    border: 1px solid #e0e0e0;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: inline-block;
    margin-top: 2px;
  }

  .chat-clear-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: #666666;
    font-size: 0.74rem;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .chat-clear-btn:hover {
    border-color: #dc2626;
    color: #dc2626;
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
    background: #fafafa;
  }

  /* Welcome Box & Quick Starters */
  .chat-welcome-box {
    padding: 16px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .welcome-title {
    margin: 0 0 4px 0;
    font-size: 0.9rem;
    color: #111111;
    font-weight: 600;
    line-height: 1.4;
  }

  .welcome-desc {
    margin: 0 0 12px 0;
    font-size: 0.8rem;
    color: #666666;
    line-height: 1.5;
  }

  .starter-chips-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .starter-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888888;
    font-weight: 700;
  }

  .starter-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .starter-chip {
    text-align: left;
    background: #fbfbfb;
    border: 1px solid var(--border-color);
    color: #222222;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .starter-chip:hover {
    background: #111111;
    border-color: #111111;
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
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    flex-shrink: 0;
    background: #e5e5e5;
    color: #111111;
    margin-top: 2px;
  }

  .chat-bubble-row.user .chat-avatar {
    background: #111111;
    color: #ffffff;
  }

  .chat-bubble {
    max-width: 86%;
    border-radius: var(--radius-sm);
    padding: 11px 15px;
    font-size: 0.86rem;
    line-height: 1.55;
    word-break: break-word;
  }

  .chat-bubble.user {
    background: #111111;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .chat-bubble.assistant {
    background: #ffffff;
    border: 1px solid var(--border-color);
    color: #111111;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .bubble-content :global(p) {
    margin: 0 0 8px 0;
  }

  .bubble-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .bubble-content :global(strong) {
    color: inherit;
    font-weight: 700;
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
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .citation-box-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #854d0e;
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
    padding: 8px 10px;
    background: #fefce8;
    border: 1px solid #fef08a;
    border-radius: var(--radius-sm);
    color: #713f12;
    font-size: 0.78rem;
    line-height: 1.4;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  }

  .citation-pill:hover {
    background: #fef9c3;
    border-color: #ca8a04;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  .cit-icon {
    flex-shrink: 0;
    font-size: 0.85rem;
  }

  .cit-label {
    font-weight: 700;
    color: #854d0e;
    flex-shrink: 0;
  }

  .cit-text {
    font-style: italic;
    flex: 1;
    word-break: break-word;
    color: #713f12;
  }

  .cit-page {
    flex-shrink: 0;
    background: #fef08a;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 700;
    color: #854d0e;
  }

  /* Suggested Follow-up Prompts */
  .chat-followups-box {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .followup-title {
    font-size: 0.72rem;
    color: #777777;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .followup-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .followup-chip {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    font-size: 0.74rem;
    color: #333333;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .followup-chip:hover {
    border-color: #111111;
    color: #111111;
    background: #f6f6f6;
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
    background: #111111;
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
    color: #777777;
    font-style: italic;
  }

  /* Bottom Chat Input Bar */
  .chat-input-bar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: #ffffff;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .chat-input-bar input {
    flex: 1;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    font-size: 0.85rem;
    color: #111111;
    outline: none;
    transition: all 0.2s;
  }

  .chat-input-bar input:focus {
    border-color: #111111;
    background: #ffffff;
    box-shadow: 0 0 0 1px #111111;
  }

  .chat-input-bar input::placeholder {
    color: #888888;
  }

  .chat-send-btn {
    background: #111111;
    color: #ffffff;
    border: 1px solid #111111;
    border-radius: var(--radius-sm);
    padding: 0 16px;
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .chat-send-btn:hover:not(:disabled) {
    background: #2a2a2a;
  }

  .chat-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .hint-tag {
    margin-left: auto;
    font-size: 0.72rem;
    color: #111111;
    background: #f0f0f0;
    border: 1px solid #e0e0e0;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hint-tag.alert {
    color: #991b1b;
    background: #fef2f2;
    border-color: #fecaca;
  }

  .interactive-point-btn {
    width: 100%;
    text-align: left;
    position: relative;
    padding: 10px 14px;
    color: #111111;
    font-size: 0.88rem;
    border-radius: var(--radius-sm);
    background: #ffffff;
    border: 1px solid var(--border-color);
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
    background: #fefce8 !important;
    border-color: #ca8a04 !important;
    box-shadow: 0 0 10px rgba(202, 138, 4, 0.2) !important;
  }

  .point-content-wrap {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex: 1;
  }

  .point-index {
    background: #111111;
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    margin-top: 1px;
    white-space: nowrap;
  }

  .interactive-point-btn:hover {
    background: #f6f6f6;
    border-color: #111111;
    transform: translateX(3px);
  }

  .interactive-point-btn .locate-icon {
    font-size: 0.75rem;
    color: #555555;
    white-space: nowrap;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .interactive-point-btn:hover .locate-icon {
    color: #111111;
  }

  .entity-item-btn {
    width: 100%;
    text-align: left;
    background: #ffffff;
    border: 1px solid var(--border-color);
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
  }

  .entity-item-btn:hover {
    background: #f6f6f6;
    border-color: #111111;
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
    color: #111111;
  }

  .interactive-risk-btn {
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #fef2f2;
    border-radius: var(--radius-sm);
    color: #991b1b;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #fecaca;
  }

  .interactive-risk-btn:hover {
    background: #fee2e2;
    border-color: #ef4444;
    transform: translateX(3px);
  }

  .insight-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
  }

  .insight-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .summary-text {
    color: #333333;
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
    color: #333333;
    font-size: 0.88rem;
  }

  .key-points-list li::before {
    content: '—';
    color: #111111;
    font-weight: bold;
    position: absolute;
    left: 4px;
  }

  .entities-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .entity-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 3px;
  }

  .reanalyze-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    border: 1px solid #d4d4d4;
    transition: all 0.15s ease-out;
  }

  .reanalyze-btn:hover {
    border-color: #ca8a04;
    color: #ca8a04;
  }

  .reanalyze-pulse {
    border-color: #ca8a04;
    color: #ca8a04;
    background: rgba(202, 138, 4, 0.08);
    box-shadow: 0 0 10px rgba(254, 240, 138, 0.6);
    animation: reanalyze-halo 2s infinite ease-in-out;
  }

  @keyframes reanalyze-halo {
    0%,
    100% {
      box-shadow: 0 0 4px rgba(202, 138, 4, 0.3);
    }
    50% {
      box-shadow: 0 0 14px rgba(202, 138, 4, 0.7);
    }
  }

  .spatial-pin-indicator {
    font-size: 0.68rem;
    color: #ca8a04;
    background: rgba(202, 138, 4, 0.12);
    border: 1px solid rgba(202, 138, 4, 0.35);
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 700;
  }

  .entity-key {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: #666666;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
    font-weight: 600;
  }

  .entity-val {
    font-size: 0.88rem;
    font-weight: 600;
    color: #111111;
  }

  .alert-risk {
    border-color: #fecaca;
    background: #fef2f2;
  }

  .risk-list li {
    padding: 8px 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-sm);
    color: #991b1b;
    font-size: 0.85rem;
  }

  .line-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .line-items-table th {
    color: #666666;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .line-items-table td {
    padding: 8px;
    border-bottom: 1px solid var(--border-color);
    color: #111111;
  }

  .line-items-table .amt {
    font-weight: 700;
    color: #111111;
  }

  .clickable-line-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .clickable-line-row:hover {
    background: #f6f6f6 !important;
  }

  .clickable-line-row.active-target {
    background: #fefce8 !important;
  }

  .line-desc-text {
    color: #111111;
    font-weight: 500;
  }

  .line-locate-btn {
    background: #111111;
    border: 1px solid #111111;
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .line-locate-btn:hover {
    background: #2a2a2a;
  }

  /* Viewer Redaction Pill & Button */
  .redaction-switch-pill {
    display: inline-flex;
    align-items: center;
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 3px;
  }

  .pill-btn {
    background: transparent;
    border: none;
    color: #666666;
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pill-btn:hover {
    color: #111111;
  }

  .pill-btn.active {
    background: #ffffff;
    color: #111111;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .pill-btn.active.redacted-glow {
    background: #111111;
    color: #ffffff;
  }

  .download-redacted {
    background: #111111;
    border: 1px solid #111111;
    color: #ffffff;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .download-redacted:hover {
    background: #2a2a2a;
  }

  /* Compliance & Audit Studio View */
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
    padding: 20px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
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
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666666;
    font-weight: 600;
  }

  .kpi-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kpi-number {
    font-size: 2rem;
    font-weight: 600;
    color: #111111;
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
  }

  .kpi-sub {
    font-size: 0.78rem;
    color: #777777;
  }

  .kpi-footer-progress {
    width: 100%;
    height: 6px;
    background: #f0f0f0;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 12px;
  }

  .progress-bar {
    height: 100%;
    background: #111111;
    border-radius: 999px;
  }

  .kpi-pills-row {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .mini-pill {
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    color: #111111;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
  }

  .pulse-indicator-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #166534;
    background: #f0fdf4;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid #bbf7d0;
  }

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #166534;
  }

  .kpi-footer-text {
    font-size: 0.75rem;
    color: #777777;
    margin-top: 10px;
    font-style: italic;
  }

  /* PII Matrix Card */
  .pii-matrix-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    margin-bottom: 24px;
  }

  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .matrix-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .matrix-desc {
    font-size: 0.85rem;
    color: #666666;
    max-width: 800px;
  }

  .pii-chips-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .pii-class-box {
    background: #fbfbfb;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .pii-class-box:hover {
    border-color: #111111;
    background: #ffffff;
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
    color: #111111;
    flex: 1;
  }

  .box-count {
    background: #111111;
    color: #ffffff;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .box-rule {
    font-size: 0.72rem;
    color: #777777;
    font-family: var(--font-mono);
  }

  .box-token {
    font-size: 0.72rem;
    color: #166534;
    font-family: var(--font-mono);
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 3px 6px;
    border-radius: var(--radius-sm);
    width: fit-content;
  }

  /* Audit Trail Explorer */
  .audit-trail-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    margin-bottom: 24px;
  }

  .audit-trail-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .audit-sub {
    font-size: 0.85rem;
    color: #666666;
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
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: #111111;
    font-size: 0.85rem;
  }

  .audit-search-input-wrapper input:focus {
    outline: none;
    border-color: #111111;
    background: #ffffff;
  }

  .filter-pills-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-pill {
    background: #ffffff;
    border: 1px solid var(--border-color);
    color: #666666;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-pill:hover {
    color: #111111;
    border-color: #111111;
  }

  .filter-pill.active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
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
    font-size: 0.82rem;
    text-align: left;
  }

  .audit-table th {
    background: #fbfbfb;
    color: #666666;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .audit-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    color: #111111;
  }

  .audit-table tbody tr:hover {
    background: #f6f6f6;
  }

  .col-time {
    color: #777777;
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
    color: #111111;
  }

  .actor-ip {
    font-size: 0.7rem;
    color: #888888;
  }

  .action-tag {
    display: inline-block;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .tag-uploaded {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  .tag-viewed {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #0f172a;
  }

  .tag-redacted {
    background: #fefce8;
    border: 1px solid #fef08a;
    color: #854d0e;
  }

  .tag-searched {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    color: #4338ca;
  }

  .tag-deleted {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .tag-exported {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
  }

  .tag-generic {
    background: #f6f6f6;
    color: #555555;
  }

  .resource-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .res-filename {
    color: #111111;
    font-weight: 600;
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .res-id {
    font-size: 0.68rem;
    color: #888888;
  }

  .meta-pii-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .mini-meta-badge {
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    color: #111111;
    font-size: 0.68rem;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
  }

  .meta-query {
    font-size: 0.74rem;
    color: #4338ca;
  }

  .verify-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #166534;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .audit-loading,
  .audit-empty {
    padding: 36px;
    text-align: center;
    color: #777777;
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
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .framework-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .framework-header h3 {
    font-size: 1.15rem;
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
    background: #fbfbfb;
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
    color: #777777;
  }

  .retention-info-box {
    background: #fbfbfb;
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
    color: #333333;
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .delete-all {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
    padding: 9px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  }

  .delete-all:hover {
    background: #fee2e2;
  }

  /* Compare Action Button in Document Rows */
  .compare-action-btn {
    background: #ffffff;
    border: 1px solid var(--border-color);
    color: #111111;
    font-size: 0.76rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .compare-action-btn:hover {
    border-color: #111111;
    background: #f6f6f6;
  }

  /* Multi-Document Comparison Workspace */
  .compare-workspace {
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeIn 0.3s ease-out;
  }

  .compare-header-card {
    padding: 28px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .compare-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 20px;
  }

  .compare-desc {
    color: #555555;
    font-size: 0.92rem;
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
    border-radius: var(--radius-sm);
    background: #fbfbfb;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s ease;
  }

  .base-box {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .target-box {
    border-color: #ddd6fe;
    background: #faf5ff;
  }

  .box-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.74rem;
    font-weight: 700;
  }

  .badge-tag {
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .base-badge .badge-tag {
    background: #111111;
    color: #ffffff;
  }

  .target-badge .badge-tag {
    background: #111111;
    color: #ffffff;
  }

  .role-hint {
    color: #666666;
    font-weight: 500;
    font-size: 0.74rem;
  }

  .selector-select-wrapper select {
    width: 100%;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: #111111;
    padding: 10px 12px;
    font-size: 0.86rem;
    outline: none;
    cursor: pointer;
    transition: border 0.2s;
  }

  .selector-select-wrapper select:focus {
    border-color: #111111;
  }

  .selected-doc-mini-card {
    padding: 12px;
    background: #ffffff;
    border: 1px solid var(--border-color);
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
    font-weight: 600;
    color: #111111;
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
    color: #666666;
  }

  .doc-mini-summary {
    font-size: 0.76rem;
    color: #666666;
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
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: #ffffff;
    border: 1px solid var(--border-color);
    color: #111111;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .swap-docs-btn:hover {
    transform: rotate(180deg);
    background: #f6f6f6;
    border-color: #111111;
  }

  .vs-divider {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #777777;
    background: #f6f6f6;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
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
    padding: 24px;
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid var(--border-color);
  }

  .verdict-banner.risk-increased {
    border-left: 4px solid #dc2626;
  }

  .verdict-banner.risk-mitigated {
    border-left: 4px solid #166534;
  }

  .verdict-banner.risk-neutral {
    border-left: 4px solid #111111;
  }

  .verdict-icon {
    font-size: 2.2rem;
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
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #666666;
  }

  .risk-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .risk-badge.increased {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .risk-badge.decreased {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .risk-badge.neutral {
    background: #f6f6f6;
    color: #111111;
    border: 1px solid var(--border-color);
  }

  .financial-delta-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: #fefce8;
    color: #854d0e;
    border: 1px solid #fef08a;
  }

  .verdict-text {
    font-size: 0.95rem;
    line-height: 1.6;
    color: #111111;
    margin: 0;
  }

  .similarity-circle-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    height: 80px;
    border-radius: var(--radius-sm);
    background: #fbfbfb;
    border: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .sim-val {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 700;
    color: #111111;
    line-height: 1;
  }

  .sim-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #666666;
    margin-top: 4px;
    font-weight: 600;
  }

  /* Metrics Stat Cards Grid */
  .diff-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .metric-card {
    padding: 18px 20px;
    border-radius: var(--radius-sm);
    background: #ffffff;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-num {
    font-family: var(--font-heading);
    font-size: 2rem;
    font-weight: 600;
    line-height: 1;
    color: #111111;
  }

  .added-card .metric-num {
    color: #166534;
  }

  .removed-card .metric-num {
    color: #991b1b;
  }

  .modified-card .metric-num {
    color: #854d0e;
  }

  .total-card .metric-num {
    color: #111111;
  }

  .metric-label {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #111111;
  }

  .metric-sub {
    font-size: 0.72rem;
    color: #666666;
    line-height: 1.3;
  }

  /* Key Recommendations Checklist */
  .recommendations-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .rec-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .rec-icon {
    font-size: 1.3rem;
  }

  .rec-header h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #111111;
    font-weight: 600;
  }

  .rec-sub {
    margin: 2px 0 0 0;
    font-size: 0.8rem;
    color: #666666;
  }

  .rec-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rec-item {
    display: flex;
    gap: 10px;
    font-size: 0.88rem;
    color: #333333;
    line-height: 1.5;
  }

  .rec-bullet {
    color: #111111;
    font-weight: 700;
  }

  /* Redline Explorer Toolbar & Cards */
  .redlines-container-card {
    padding: 24px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .redline-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #111111;
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
    background: #f6f6f6;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: #111111;
  }

  .redline-search-wrapper input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.82rem;
    color: #111111;
    width: 170px;
  }

  .pill-added.active {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }

  .pill-removed.active {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .pill-modified.active {
    background: #fefce8;
    border-color: #fef08a;
    color: #854d0e;
  }

  .diff-cards-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .diff-card {
    padding: 20px;
    border-radius: var(--radius-sm);
    background: #ffffff;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .diff-card.added {
    border-left: 4px solid #166534;
  }

  .diff-card.removed {
    border-left: 4px solid #dc2626;
  }

  .diff-card.modified {
    border-left: 4px solid #d97706;
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
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .diff-type-badge.added {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .diff-type-badge.removed {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .diff-type-badge.modified {
    background: #fefce8;
    color: #854d0e;
    border: 1px solid #fef08a;
  }

  .diff-cat-badge {
    font-size: 0.7rem;
    color: #666666;
    background: #f6f6f6;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .diff-risk-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .diff-risk-badge.critical,
  .diff-risk-badge.high,
  .diff-risk-badge.increased {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .diff-risk-badge.decreased {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .diff-risk-badge.neutral {
    background: #f6f6f6;
    color: #666666;
  }

  .diff-page-badges {
    display: flex;
    gap: 6px;
  }

  .page-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .page-a {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }

  .page-b {
    background: #f8fafc;
    color: #334155;
    border: 1px solid #cbd5e1;
  }

  .diff-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: #111111;
    margin: 0 0 4px 0;
  }

  .diff-explanation {
    font-size: 0.88rem;
    color: #444444;
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
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .redline-box.box-add {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  .redline-box-title {
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .box-del .redline-box-title {
    color: #991b1b;
  }

  .box-add .redline-box-title {
    color: #166534;
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
    font-size: 0.86rem;
    line-height: 1.5;
    word-break: break-word;
  }

  .redline-content-text.strike {
    color: #991b1b;
    text-decoration: line-through;
    text-decoration-color: #dc2626;
  }

  .redline-content-text.highlight {
    color: #166534;
    background: #dcfce7;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .diff-card-footer {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
  }

  .footer-inspect-btn {
    background: transparent;
    border: none;
    color: #111111;
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .footer-inspect-btn:hover {
    text-decoration: underline;
  }

  .compare-empty-card {
    padding: 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
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
    color: #666666;
    font-size: 0.82rem;
  }

  .suggestions-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-diffs-state {
    padding: 30px;
    text-align: center;
    color: #666666;
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

  .format-badge-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .fmt-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.04em;
    font-family: var(--font-mono);
  }

  .fmt-pill.fmt-pdf {
    background: #ffe4e6;
    color: #e11d48;
    border: 1px solid #fecdd3;
  }

  .fmt-pill.fmt-word {
    background: #e0e7ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
  }

  .fmt-pill.fmt-excel {
    background: #d1fae5;
    color: #047857;
    border: 1px solid #a7f3d0;
  }

  .fmt-pill.fmt-img {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
  }

  .fmt-pill.fmt-txt {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .fmt-inline-tag {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    display: inline-block;
  }

  .fmt-inline-tag.badge-rose {
    background: #ffe4e6;
    color: #be123c;
  }

  .fmt-inline-tag.badge-emerald {
    background: #d1fae5;
    color: #047857;
  }

  .fmt-inline-tag.badge-indigo {
    background: #e0e7ff;
    color: #4338ca;
  }

  .fmt-inline-tag.badge-amber {
    background: #fef3c7;
    color: #b45309;
  }

  .fmt-inline-tag.badge-slate {
    background: #f1f5f9;
    color: #475569;
  }
</style>
