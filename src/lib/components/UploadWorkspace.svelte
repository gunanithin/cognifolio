<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import CButton from '../ui/CButton.svelte';

  export let retentionDays = 90;
  export let uploadStep = 0;
  export let isUploading = false;
  export let sampleDocuments = [];

  const dispatch = createEventDispatcher();
  let isDragOver = false;

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) {
      dispatch('upload', { file });
    }
  }

  function handleSampleClick(sample) {
    dispatch('uploadSample', { sample });
  }

  function openSecurityGuide() {
    dispatch('openSecurityGuide');
  }
</script>

<div class="upload-view">
  <div class="view-header">
    <div>
      <h2>Upload &amp; Document Processing</h2>
      <p class="subtitle">
        Extract intelligence from invoices, contracts, statements, or scanned reports
      </p>
    </div>
  </div>

  <!-- Privacy & Protection Reassurance Strip -->
  <div class="upload-security-strip">
    <div class="sec-strip-left">
      <CIcon name="shield" size={16} />
      <span>
        <strong>Your documents are 100% private &amp; secure:</strong> Pre-AI PII masking &bull; Zero
        AI model training &bull; 1-Click permanent shredding anytime.
      </span>
    </div>
    <button type="button" class="sec-guide-link" on:click={openSecurityGuide}>
      How our protection works &rarr;
    </button>
  </div>

  <div class="upload-grid">
    <!-- Drop Zone -->
    <div
      class="glass-card dropzone-card {isDragOver ? 'drag-over' : ''}"
      role="region"
      aria-label="Document drop zone"
      on:dragover|preventDefault={() => (isDragOver = true)}
      on:dragleave={() => (isDragOver = false)}
      on:drop|preventDefault={(e) => {
        isDragOver = false;
        const file = e.dataTransfer?.files?.[0];
        if (file) dispatch('upload', { file });
      }}
    >
      <div class="dropzone">
        <input
          type="file"
          id="file-input"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
          on:change={handleFileSelected}
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
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3>Drag &amp; Drop documents here</h3>
          <p>
            Supported formats: PDF, Images (PNG, JPG, WEBP), Office &amp; Data (DOCX, XLSX, CSV),
            &amp; Text (TXT, MD) up to 50MB
          </p>
          <div class="format-badge-row">
            <span class="fmt-pill fmt-pdf">PDF</span>
            <span class="fmt-pill fmt-excel">XLSX / CSV</span>
            <span class="fmt-pill fmt-word">DOCX</span>
            <span class="fmt-pill fmt-img">PNG / JPG</span>
            <span class="fmt-pill fmt-txt">TXT</span>
          </div>
          <span class="btn-primary browse-btn">Browse Files</span>
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
        Every document passes through our 4-tier security &amp; extraction flow:
      </p>

      <div class="pipeline-steps">
        <div
          class="step-item {uploadStep >= 1 ? 'active' : ''} {uploadStep > 1 ? 'completed' : ''}"
        >
          <div class="step-num">
            {#if uploadStep > 1}
              <CIcon name="check" size={14} />
            {:else}
              <CIcon name="document" size={14} />
            {/if}
          </div>
          <div class="step-info">
            <h4>Document Ingestion &amp; OCR</h4>
            <p>Extracts digital text, parses tables, rasterizes image pages</p>
          </div>
          {#if uploadStep === 1}<span class="spinner"></span>{/if}
        </div>

        <div
          class="step-item {uploadStep >= 2 ? 'active' : ''} {uploadStep > 2 ? 'completed' : ''}"
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
          class="step-item {uploadStep >= 3 ? 'active' : ''} {uploadStep > 3 ? 'completed' : ''}"
        >
          <div class="step-num">
            {#if uploadStep > 3}
              <CIcon name="check" size={14} />
            {:else}
              <CIcon name="lightning" size={14} />
            {/if}
          </div>
          <div class="step-info">
            <h4>Multimodal Intelligence Extraction</h4>
            <p>Executive summary, structured entities, risk clauses, line-item pricing</p>
          </div>
          {#if uploadStep === 3}<span class="spinner"></span>{/if}
        </div>

        <div
          class="step-item {uploadStep >= 4 ? 'active' : ''} {uploadStep > 4 ? 'completed' : ''}"
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
      {#if sampleDocuments && sampleDocuments.length >= 2}
        <div class="demo-samples">
          <h4>Don't have a document on hand? Try our sample presets:</h4>
          <div class="sample-btn-group">
            <CButton variant="secondary" on:click={() => handleSampleClick(sampleDocuments[0])}>
              <CIcon name="document" size={15} />
              <span>Test TCS Invoice (₹9.97L)</span>
            </CButton>
            <CButton variant="secondary" on:click={() => handleSampleClick(sampleDocuments[1])}>
              <CIcon name="document" size={15} />
              <span>Test Master Services Agreement ($120k)</span>
            </CButton>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .upload-view {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .view-header h2 {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .upload-security-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--theme-dark);
    border-radius: var(--radius-sm);
    padding: 10px 16px;
    margin-bottom: 18px;
    gap: 14px;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .sec-strip-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    color: var(--text-muted);
  }

  .sec-strip-left strong {
    color: var(--text-main);
  }

  .sec-guide-link {
    background: transparent;
    border: none;
    color: var(--theme-dark);
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0;
  }

  .sec-guide-link:hover {
    color: var(--theme-dark-hover);
  }

  .upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .dropzone-card {
    padding: 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .dropzone {
    border: 2px dashed var(--border-dark);
    border-radius: var(--radius-sm);
    padding: 44px 20px;
    text-align: center;
    background: var(--bg-subtle);
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dropzone:hover {
    background: var(--bg-card-hover);
    border-color: var(--theme-dark);
  }

  .dropzone input {
    display: none;
  }

  .dropzone-label {
    cursor: pointer;
    display: block;
  }

  .dropzone-label h3 {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: var(--text-main);
    margin-bottom: 6px;
  }

  .dropzone-label p {
    font-size: 0.82rem;
    color: var(--text-muted);
    max-width: 420px;
    margin: 0 auto 16px;
    line-height: 1.45;
  }

  .upload-icon-circle {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    color: var(--theme-dark);
  }

  .format-badge-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
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
    background: var(--status-rose-bg);
    color: var(--status-rose-text);
    border: 1px solid var(--status-rose-border);
  }

  .fmt-pill.fmt-word {
    background: var(--status-indigo-bg);
    color: var(--status-indigo-text);
    border: 1px solid var(--status-indigo-border);
  }

  .fmt-pill.fmt-excel {
    background: var(--status-emerald-bg);
    color: var(--status-emerald-text);
    border: 1px solid var(--status-emerald-border);
  }

  .fmt-pill.fmt-img {
    background: var(--status-amber-bg);
    color: var(--status-amber-text);
    border: 1px solid var(--status-amber-border);
  }

  .fmt-pill.fmt-txt {
    background: var(--status-slate-bg);
    color: var(--status-slate-text);
    border: 1px solid var(--status-slate-border);
  }

  .browse-btn {
    display: inline-block;
    padding: 8px 18px;
    background: #f2b84b;
    color: #08090b;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.85rem;
    margin-top: 10px;
    cursor: pointer;
  }

  .browse-btn:hover {
    background: #ffd073;
  }

  .retention-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .retention-selector select {
    background: var(--bg-card);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  .pipeline-card {
    padding: 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .pipeline-card h3 {
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: var(--text-main);
    margin-bottom: 4px;
  }

  .card-subtitle {
    color: var(--text-muted);
    font-size: 0.82rem;
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
    background: var(--bg-subtle);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .step-item.active {
    border-color: var(--theme-dark);
    background: var(--bg-card-hover);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .step-item.completed {
    border-color: var(--status-emerald-border);
    background: var(--status-emerald-bg);
  }

  .step-num {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.75rem;
  }

  .step-item.active .step-num {
    background: var(--theme-dark);
    color: #16120a;
  }

  .step-item.completed .step-num {
    background: var(--status-emerald-border);
    color: var(--status-emerald-text);
  }

  .step-info h4 {
    font-family: var(--font-sans);
    font-size: 0.92rem;
    font-weight: 600;
    margin-bottom: 3px;
    color: var(--text-main);
    letter-spacing: -0.005em;
  }

  .step-info p {
    font-family: var(--font-sans);
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f2b84b;
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

  .demo-samples h4 {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .sample-btn-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  @media (max-width: 900px) {
    .upload-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
