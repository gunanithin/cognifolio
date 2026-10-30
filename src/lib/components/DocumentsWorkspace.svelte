<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import CButton from '../ui/CButton.svelte';

  export let documents = [];
  export let totalPages = 0;
  export let sampleDocuments = [];

  const dispatch = createEventDispatcher();

  let docFilter = 'all'; // 'all' | 'pdf' | 'spreadsheet' | 'word' | 'image'
  let docSearch = '';
  let docPage = 1;
  const docPageSize = 5;

  $: pdfCount = documents.filter(
    (d) => (d.file_type || '').toLowerCase().replace(/^\./, '') === 'pdf',
  ).length;

  $: sheetCount = documents.filter((d) =>
    ['xlsx', 'xls', 'csv'].includes((d.file_type || '').toLowerCase().replace(/^\./, '')),
  ).length;

  $: docxCount = documents.filter((d) =>
    ['docx', 'doc'].includes((d.file_type || '').toLowerCase().replace(/^\./, '')),
  ).length;

  $: imgCount = documents.filter((d) =>
    ['png', 'jpg', 'jpeg', 'webp'].includes((d.file_type || '').toLowerCase().replace(/^\./, '')),
  ).length;

  $: filteredDocuments = documents.filter((doc) => {
    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      const matchName = (doc.original_filename || '').toLowerCase().includes(q);
      const matchType = (doc.insights?.document_type || doc.file_type || '')
        .toLowerCase()
        .includes(q);
      if (!matchName && !matchType) return false;
    }
    if (docFilter === 'all') return true;
    const t = (doc.file_type || '').toLowerCase().replace(/^\./, '');
    if (docFilter === 'pdf') return t === 'pdf';
    if (docFilter === 'spreadsheet') return ['xlsx', 'xls', 'csv'].includes(t);
    if (docFilter === 'word') return ['docx', 'doc'].includes(t);
    if (docFilter === 'image') return ['png', 'jpg', 'jpeg', 'webp'].includes(t);
    return true;
  });

  $: docTotalPages = Math.ceil(filteredDocuments.length / docPageSize) || 1;

  $: {
    if (docPage > docTotalPages) docPage = docTotalPages;
    if (docPage < 1) docPage = 1;
  }

  $: paginatedDocuments = filteredDocuments.slice(
    (docPage - 1) * docPageSize,
    docPage * docPageSize,
  );

  $: if (docSearch !== undefined || docFilter !== undefined) {
    docPage = 1;
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

  function handleUploadClick() {
    dispatch('upload');
  }

  function handleSampleClick(sample) {
    dispatch('uploadSample', { sample });
  }

  function handleViewDoc(docId) {
    dispatch('viewDocument', { docId });
  }

  function handleCompareDoc(docId) {
    dispatch('compareDocument', { docId });
  }

  function handleDeleteDoc(doc) {
    dispatch('deleteDocument', { doc });
  }

  function handleOpenSecurity() {
    dispatch('openSecurityGuide');
  }
</script>

<div class="dashboard-view">
  <!-- Workspace Header -->
  <div class="workspace-header">
    <div class="workspace-title-group">
      <h2 class="workspace-title">Documents Workspace</h2>
      <p class="workspace-subtitle">
        Secure AI-indexed vault for PDFs, spreadsheets, contracts, and visual scans
      </p>
    </div>
    <div class="workspace-header-actions">
      <CButton variant="primary" on:click={handleUploadClick}>
        <CIcon name="upload" size={15} />
        <span>Upload Document</span>
      </CButton>
    </div>
  </div>

  <!-- Sleek KPI Summary Strip -->
  <div class="minimal-kpi-bar">
    <div class="kpi-item">
      <div class="kpi-icon-wrap">
        <CIcon name="document" size={18} />
      </div>
      <div class="kpi-data">
        <span class="kpi-val">{documents.length}</span>
        <span class="kpi-lbl">Total Documents</span>
      </div>
    </div>

    <div class="kpi-divider"></div>

    <div class="kpi-item">
      <div class="kpi-icon-wrap kpi-success">
        <CIcon name="lightning" size={18} />
      </div>
      <div class="kpi-data">
        <span class="kpi-val">{totalPages}</span>
        <span class="kpi-lbl">Pages Analyzed</span>
      </div>
    </div>

    <div class="kpi-divider"></div>

    <div
      class="kpi-item kpi-interactive"
      role="button"
      tabindex="0"
      on:click={handleOpenSecurity}
      on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenSecurity()}
      title="Click to view Document Security & Protection Policy"
    >
      <div class="kpi-icon-wrap kpi-shield">
        <CIcon name="shield" size={18} />
      </div>
      <div class="kpi-data">
        <span class="kpi-val">Zero-Trust Active</span>
        <span class="kpi-lbl">PII &amp; Data Redaction</span>
      </div>
    </div>
  </div>

  <!-- Drag & Drop Intake Card -->
  <div class="minimal-intake-card">
    <div
      class="minimal-dropzone"
      role="button"
      tabindex="0"
      on:click={handleUploadClick}
      on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleUploadClick()}
    >
      <div class="dropzone-inner">
        <div class="dropzone-left-group">
          <div class="dropzone-icon-box">
            <CIcon name="upload" size={20} />
          </div>
          <div class="dropzone-text-group">
            <div class="dropzone-main-text">
              <strong>Drag &amp; drop documents here</strong>, or
              <span class="browse-link">Browse files</span>
            </div>
            <div class="dropzone-hint">
              Direct intake: PDF, Images (PNG, JPG, WEBP), Office &amp; Data (DOCX, XLSX, CSV), Text
              (TXT, MD) up to 50MB
            </div>
          </div>
        </div>
        <div class="dropzone-format-pills">
          <span class="fmt-tag fmt-pdf">PDF</span>
          <span class="fmt-tag fmt-excel">EXCEL / CSV</span>
          <span class="fmt-tag fmt-word">DOCX</span>
          <span class="fmt-tag fmt-img">IMAGES</span>
          <span class="fmt-tag fmt-txt">TXT</span>
        </div>
      </div>
    </div>

    {#if documents.length === 0 && sampleDocuments.length > 0}
      <div class="demo-samples-row">
        <span class="demo-label">Quick Start Demo:</span>
        <button class="demo-chip-btn" on:click={() => handleSampleClick(sampleDocuments[0])}>
          + Load Demo TCS Invoice
        </button>
        {#if sampleDocuments.length > 1}
          <button class="demo-chip-btn" on:click={() => handleSampleClick(sampleDocuments[1])}>
            + Load Demo MSA Contract
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Document Vault Repository (Executive Clean Table) -->
  <div class="vault-container">
    <div class="vault-toolbar">
      <div class="vault-filter-tabs">
        <button
          class="vault-tab-btn"
          class:active={docFilter === 'all'}
          on:click={() => (docFilter = 'all')}
        >
          All <span class="tab-count">{documents.length}</span>
        </button>
        <button
          class="vault-tab-btn"
          class:active={docFilter === 'pdf'}
          on:click={() => (docFilter = 'pdf')}
        >
          PDFs <span class="tab-count">{pdfCount}</span>
        </button>
        <button
          class="vault-tab-btn"
          class:active={docFilter === 'spreadsheet'}
          on:click={() => (docFilter = 'spreadsheet')}
        >
          Spreadsheets <span class="tab-count">{sheetCount}</span>
        </button>
        <button
          class="vault-tab-btn"
          class:active={docFilter === 'word'}
          on:click={() => (docFilter = 'word')}
        >
          Word <span class="tab-count">{docxCount}</span>
        </button>
        <button
          class="vault-tab-btn"
          class:active={docFilter === 'image'}
          on:click={() => (docFilter = 'image')}
        >
          Images <span class="tab-count">{imgCount}</span>
        </button>
      </div>

      <div class="vault-search-box">
        <CIcon name="search" size={14} className="text-gray-400" />
        <input type="text" placeholder="Filter files..." bind:value={docSearch} />
        {#if docSearch}
          <button class="clear-search-btn" on:click={() => (docSearch = '')}>✕</button>
        {/if}
      </div>
    </div>

    {#if filteredDocuments.length === 0}
      <div class="vault-empty-state">
        {#if docSearch || docFilter !== 'all'}
          <div class="empty-icon">🔍</div>
          <h4>No matching documents found</h4>
          <p>Try adjusting your search query or file type filter</p>
          <div class="mt-3">
            <CButton
              variant="chip"
              size="sm"
              on:click={() => {
                docSearch = '';
                docFilter = 'all';
              }}
            >
              Reset Filter
            </CButton>
          </div>
        {:else}
          <div class="empty-icon">📂</div>
          <h4>Your workspace is empty</h4>
          <p>Upload a PDF, contract, spreadsheet, or scan to begin extracting intelligence</p>
          <div class="sample-actions mt-4 flex items-center justify-center gap-3">
            <CButton variant="primary" on:click={handleUploadClick}>
              <CIcon name="upload" size={14} />
              Upload First Document
            </CButton>
            {#if sampleDocuments.length > 0}
              <CButton variant="secondary" on:click={() => handleSampleClick(sampleDocuments[0])}>
                Load Demo Invoice
              </CButton>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="vault-table-wrap">
        <table class="vault-table">
          <thead>
            <tr>
              <th class="th-doc">Document Name</th>
              <th class="th-type">Type</th>
              <th class="th-size">Size &amp; Pages</th>
              <th class="th-date">Uploaded</th>
              <th class="th-status">Status</th>
              <th class="th-actions text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedDocuments as doc}
              {@const fmtInfo = getDocFormatInfo(doc.file_type)}
              <tr class="vault-row">
                <td class="td-doc">
                  <div class="doc-title-cell">
                    <span class="doc-fmt-badge {fmtInfo.badgeClass}">{fmtInfo.label}</span>
                    <button
                      class="doc-title-link"
                      on:click={() => handleViewDoc(doc.id)}
                      title={doc.original_filename}
                    >
                      {doc.original_filename}
                    </button>
                  </div>
                </td>
                <td class="td-type">
                  <span class="type-pill">
                    {doc.insights
                      ? doc.insights.document_type
                      : (doc.file_type || 'Unknown').toUpperCase()}
                  </span>
                </td>
                <td class="td-size font-mono">
                  {doc.file_type === 'xlsx' || doc.file_type === 'xls'
                    ? `${doc.page_count} sheets`
                    : `${doc.page_count} pgs`} • {Math.round(doc.file_size_bytes / 1024)} KB
                </td>
                <td class="td-date text-muted font-mono">
                  {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td class="td-status">
                  <span class="status-ready-pill">
                    <span class="status-dot"></span> Ready
                  </span>
                </td>
                <td class="td-actions">
                  <div class="action-btn-row">
                    <button
                      class="row-action-btn primary"
                      title="Open in Document Viewer"
                      on:click={() => handleViewDoc(doc.id)}
                    >
                      Open
                    </button>
                    <button
                      class="row-action-btn secondary"
                      title="Compare revision diff"
                      on:click={() => handleCompareDoc(doc.id)}
                    >
                      <CIcon name="compare" size={13} />
                    </button>
                    <button
                      class="row-action-btn delete"
                      title="Delete document"
                      on:click={() => handleDeleteDoc(doc)}
                    >
                      <CIcon name="trash" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar">
        <span class="pagination-info">
          Showing <strong
            >{(docPage - 1) * docPageSize + 1}–{Math.min(
              docPage * docPageSize,
              filteredDocuments.length,
            )}</strong
          >
          of <strong>{filteredDocuments.length}</strong> documents
        </span>
        <div class="pagination-controls">
          <button
            type="button"
            class="pagination-btn"
            disabled={docPage <= 1}
            on:click={() => docPage--}
            aria-label="Previous Page"
          >
            &larr; Prev
          </button>
          <span class="pagination-page-indicator">
            Page <strong>{docPage}</strong> of <strong>{docTotalPages}</strong>
          </span>
          <button
            type="button"
            class="pagination-btn"
            disabled={docPage >= docTotalPages}
            on:click={() => docPage++}
            aria-label="Next Page"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard-view {
    width: 100%;
  }

  .workspace-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .workspace-title-group {
    flex: 1;
    min-width: 260px;
  }

  .workspace-title {
    font-family: var(--font-heading);
    font-size: 1.75rem;
    font-weight: 600;
    color: #f6f6f6;
    margin: 0;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .workspace-subtitle {
    font-size: 0.88rem;
    color: var(--text-muted, #9da2ab);
    margin: 4px 0 0 0;
  }

  .workspace-header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Sleek KPI Bar */
  .minimal-kpi-bar {
    display: flex;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 8px);
    padding: 14px 22px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-card);
    gap: 24px;
  }

  .kpi-item {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .kpi-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm, 8px);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-main);
    flex-shrink: 0;
  }

  .kpi-icon-wrap.kpi-success {
    background: var(--status-emerald-bg);
    border-color: var(--status-emerald-border);
    color: var(--status-emerald-text);
  }

  .kpi-icon-wrap.kpi-shield {
    background: var(--status-amber-bg);
    border-color: var(--status-amber-border);
    color: var(--status-amber-text);
  }

  .kpi-data {
    display: flex;
    flex-direction: column;
  }

  .kpi-val {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: var(--font-heading);
    color: var(--text-main);
    line-height: 1.1;
  }

  .kpi-lbl {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted, #9da2ab);
    margin-top: 2px;
  }

  .kpi-divider {
    width: 1px;
    height: 32px;
    background: var(--border-color, #272a30);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .minimal-kpi-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    .kpi-divider {
      display: none;
    }
  }

  .kpi-item.kpi-interactive {
    cursor: pointer;
    border-radius: var(--radius-sm, 8px);
    padding: 4px 8px;
    margin: -4px -8px;
    transition: all 0.15s ease-out;
  }

  .kpi-item.kpi-interactive:hover {
    background: var(--bg-card-hover);
  }

  /* Compact Drag & Drop Intake Card */
  .minimal-intake-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 8px);
    padding: 14px 18px;
    margin-bottom: 22px;
    box-shadow: var(--shadow-card);
  }

  .minimal-dropzone {
    border: 1.5px dashed var(--border-dark);
    border-radius: var(--radius-sm, 8px);
    padding: 16px 20px;
    background: var(--bg-subtle);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .minimal-dropzone:hover {
    border-color: var(--theme-dark);
    background: var(--bg-card-hover);
  }

  .dropzone-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .dropzone-left-group {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 260px;
  }

  .dropzone-icon-box {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm, 8px);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--theme-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dropzone-text-group {
    display: flex;
    flex-direction: column;
  }

  .dropzone-main-text {
    font-size: 0.9rem;
    color: var(--text-main);
  }

  .dropzone-main-text .browse-link {
    color: var(--theme-dark);
    font-weight: 700;
    text-decoration: underline;
  }

  .dropzone-hint {
    font-size: 0.76rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .dropzone-format-pills {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .fmt-tag {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .fmt-tag.fmt-pdf {
    background: var(--status-rose-bg);
    color: var(--status-rose-text);
    border: 1px solid var(--status-rose-border);
  }
  .fmt-tag.fmt-word {
    background: var(--status-indigo-bg);
    color: var(--status-indigo-text);
    border: 1px solid var(--status-indigo-border);
  }
  .fmt-tag.fmt-excel {
    background: var(--status-emerald-bg);
    color: var(--status-emerald-text);
    border: 1px solid var(--status-emerald-border);
  }
  .fmt-tag.fmt-img {
    background: var(--status-amber-bg);
    color: var(--status-amber-text);
    border: 1px solid var(--status-amber-border);
  }
  .fmt-tag.fmt-txt {
    background: var(--status-slate-bg);
    color: var(--status-slate-text);
    border: 1px solid var(--status-slate-border);
  }

  .demo-samples-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
  }

  .demo-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .demo-chip-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: var(--radius-sm, 8px);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .demo-chip-btn:hover {
    background: var(--theme-dark);
    color: #16120a;
    border-color: var(--theme-dark);
  }

  /* Document Vault Container & Toolbar */
  .vault-container {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 8px);
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  .vault-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-color);
    gap: 14px;
    flex-wrap: wrap;
  }

  .vault-filter-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
  }

  .vault-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm, 8px);
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .vault-tab-btn:hover {
    color: var(--text-main);
    background: var(--bg-card-hover);
    border-color: var(--border-color);
  }

  .vault-tab-btn.active {
    background: var(--theme-dark);
    color: #16120a;
    border-color: var(--theme-dark);
    font-weight: 700;
  }

  .tab-count {
    font-size: 0.68rem;
    font-family: var(--font-mono, monospace);
    opacity: 0.85;
    background: rgba(0, 0, 0, 0.15);
    padding: 1px 5px;
    border-radius: 9999px;
  }

  .vault-tab-btn.active .tab-count {
    background: rgba(0, 0, 0, 0.25);
    color: #08090b;
  }

  .vault-search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 8px);
    padding: 5px 10px;
    min-width: 200px;
    transition: all 0.2s;
  }

  .vault-search-box:focus-within {
    background: var(--bg-subtle);
    border-color: var(--theme-dark);
    box-shadow: 0 0 0 1px var(--theme-dark);
  }

  .vault-search-box input {
    background: transparent;
    border: none;
    font-size: 0.8rem;
    color: var(--text-main);
    width: 100%;
    outline: none;
  }

  .clear-search-btn {
    background: transparent;
    border: none;
    font-size: 0.75rem;
    color: var(--text-muted, #9da2ab);
    cursor: pointer;
    padding: 0 2px;
  }

  /* Vault Table */
  .vault-table-wrap {
    max-height: 320px;
    overflow-y: auto;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #3c424e transparent;
  }

  .vault-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
    font-size: 0.84rem;
  }

  .vault-table th {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 10px 16px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-color);
  }

  .vault-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
    color: var(--text-main);
  }

  .vault-row:hover td {
    background: var(--bg-card-hover);
  }

  .doc-title-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .doc-fmt-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .badge-rose {
    background: var(--status-rose-bg);
    color: var(--status-rose-text);
    border: 1px solid var(--status-rose-border);
  }
  .badge-emerald {
    background: var(--status-emerald-bg);
    color: var(--status-emerald-text);
    border: 1px solid var(--status-emerald-border);
  }
  .badge-indigo {
    background: var(--status-indigo-bg);
    color: var(--status-indigo-text);
    border: 1px solid var(--status-indigo-border);
  }
  .badge-amber {
    background: var(--status-amber-bg);
    color: var(--status-amber-text);
    border: 1px solid var(--status-amber-border);
  }
  .badge-slate {
    background: var(--status-slate-bg);
    color: var(--status-slate-text);
    border: 1px solid var(--status-slate-border);
  }

  .doc-title-link {
    background: transparent;
    border: none;
    padding: 0;
    color: var(--text-main);
    font-weight: 600;
    font-size: 0.86rem;
    text-align: left;
    cursor: pointer;
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .doc-title-link:hover {
    text-decoration: underline;
    color: var(--theme-dark);
  }

  .type-pill {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-subtle);
    border: 1px solid var(--border-color);
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .status-ready-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--status-emerald-text);
    background: var(--status-emerald-bg);
    border: 1px solid var(--status-emerald-border);
    border-radius: 9999px;
    padding: 2px 8px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-emerald-text);
  }

  .action-btn-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
  }

  .row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 8px);
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .row-action-btn.primary {
    background: var(--theme-dark);
    color: #16120a;
    border: 1px solid var(--theme-dark);
    padding: 4px 12px;
    letter-spacing: 0.03em;
    font-weight: 700;
  }

  .row-action-btn.primary:hover {
    background: var(--theme-dark-hover);
    border-color: var(--theme-dark-hover);
  }

  .row-action-btn.secondary {
    background: var(--bg-card);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 4px 8px;
  }

  .row-action-btn.secondary:hover {
    background: var(--bg-card-hover);
    color: var(--theme-dark);
    border-color: var(--theme-dark);
  }

  .row-action-btn.delete {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid transparent;
    padding: 4px 7px;
  }

  .row-action-btn.delete:hover {
    background: var(--status-rose-bg);
    color: var(--status-rose-text);
    border-color: var(--status-rose-border);
  }

  .vault-empty-state {
    text-align: center;
    padding: 44px 20px;
  }

  .empty-icon {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .vault-empty-state h4 {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 10px 0 4px 0;
  }

  .vault-empty-state p {
    font-size: 0.84rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Pagination Bar */
  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 16px;
    background: var(--bg-subtle);
    border-top: 1px solid var(--border-color);
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .pagination-info {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .pagination-info strong {
    color: var(--text-main);
    font-weight: 600;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-main);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 8px);
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    line-height: 1.2;
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--bg-card-hover);
    border-color: var(--theme-dark);
    color: var(--theme-dark);
  }

  .pagination-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .pagination-page-indicator {
    color: var(--text-muted);
  }

  .pagination-page-indicator strong {
    color: var(--text-main);
  }
</style>
