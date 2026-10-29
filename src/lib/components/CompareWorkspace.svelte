<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import CButton from '../ui/CButton.svelte';

  export let documents = [];
  export let comparisonResult = null;
  export let compareBaseDocId = '';
  export let compareTargetDocId = '';
  export let isComparing = false;
  export let copiedReport = false;
  export let compareSearch = '';
  export let compareFilterType = 'all'; // 'all' | 'added' | 'removed' | 'modified'
  export let compareFilterCategory = 'all'; // 'all' | 'clause' | 'financial' | 'liability'

  const dispatch = createEventDispatcher();

  let diffPage = 1;
  const diffPageSize = 5;

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

  $: filteredDiffsList = getFilteredDiffs(comparisonResult?.diffs || []);
  $: diffTotalPages = Math.ceil(filteredDiffsList.length / diffPageSize) || 1;
  $: {
    if (diffPage > diffTotalPages) diffPage = diffTotalPages;
    if (diffPage < 1) diffPage = 1;
  }
  $: paginatedDiffs = filteredDiffsList.slice(
    (diffPage - 1) * diffPageSize,
    diffPage * diffPageSize,
  );
  $: if (
    compareFilterCategory !== undefined ||
    compareFilterType !== undefined ||
    compareSearch !== undefined
  ) {
    diffPage = 1;
  }

  function handleRunComparison() {
    dispatch('runComparison');
  }

  function handleSwapDocs() {
    dispatch('swapDocs');
  }

  function handleCopyReport() {
    dispatch('copyReport');
  }

  function handleInspectDoc(docId, page) {
    dispatch('inspectDoc', { docId, page });
  }

  function quickCompare(baseId, targetId) {
    compareBaseDocId = baseId;
    compareTargetDocId = targetId;
    dispatch('runComparison');
  }
</script>

<div class="compare-workspace">
  <!-- Top Workspace Bar & Document Selectors -->
  <div class="glass-card compare-header-card">
    <div class="compare-title-row">
      <div>
        <h2>AI Redline Diff &amp; Multi-Document Comparison</h2>
        <p class="compare-desc">
          Select any two contract revisions, policies, or invoices. Automated AI redlining detects
          clause additions and deletions, identifies fee shifts, and evaluates liability risk
          deltas.
        </p>
      </div>
      <div class="compare-header-actions">
        {#if comparisonResult}
          <CButton variant="secondary" on:click={handleCopyReport}>
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
              <strong class="mini-title">{docA.insights?.title || docA.original_filename}</strong>
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
          type="button"
          class="swap-docs-btn"
          on:click={handleSwapDocs}
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
              <strong class="mini-title">{docB.insights?.title || docB.original_filename}</strong>
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
        <div class="metric-sub">Audited by Document AI</div>
      </div>
    </div>

    <!-- Key Recommendations Checklist -->
    {#if comparisonResult.key_recommendations && comparisonResult.key_recommendations.length > 0}
      <div class="glass-card recommendations-card">
        <div class="rec-header">
          <span class="rec-icon">💡</span>
          <div>
            <h4>Negotiation &amp; Counsel Action Items</h4>
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
            >{filteredDiffsList.length} of {comparisonResult.diffs.length}</span
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
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter redlines by keyword..."
              bind:value={compareSearch}
            />
          </div>

          <!-- Filter by Type -->
          <div class="filter-pills-row">
            <button
              type="button"
              class="filter-pill {compareFilterType === 'all' ? 'active' : ''}"
              on:click={() => (compareFilterType = 'all')}>All Types</button
            >
            <button
              type="button"
              class="filter-pill pill-added {compareFilterType === 'added' ? 'active' : ''}"
              on:click={() => (compareFilterType = 'added')}
            >
              + Added ({comparisonResult.metrics.added_count})
            </button>
            <button
              type="button"
              class="filter-pill pill-removed {compareFilterType === 'removed' ? 'active' : ''}"
              on:click={() => (compareFilterType = 'removed')}
            >
              - Removed ({comparisonResult.metrics.removed_count})
            </button>
            <button
              type="button"
              class="filter-pill pill-modified {compareFilterType === 'modified' ? 'active' : ''}"
              on:click={() => (compareFilterType = 'modified')}
            >
              ~ Modified ({comparisonResult.metrics.modified_count})
            </button>
          </div>

          <!-- Filter by Category -->
          <div class="filter-pills-row">
            <button
              type="button"
              class="filter-pill {compareFilterCategory === 'all' ? 'active' : ''}"
              on:click={() => (compareFilterCategory = 'all')}>All Categories</button
            >
            <button
              type="button"
              class="filter-pill {compareFilterCategory === 'clause' ? 'active' : ''}"
              on:click={() => (compareFilterCategory = 'clause')}>Clauses</button
            >
            <button
              type="button"
              class="filter-pill {compareFilterCategory === 'financial' ? 'active' : ''}"
              on:click={() => (compareFilterCategory = 'financial')}>Financial</button
            >
            <button
              type="button"
              class="filter-pill {compareFilterCategory === 'liability' ? 'active' : ''}"
              on:click={() => (compareFilterCategory = 'liability')}>Liability</button
            >
          </div>
        </div>
      </div>

      <!-- List of Diff Cards -->
      <div class="diff-cards-list">
        {#if filteredDiffsList.length === 0}
          <div class="empty-diffs-state">
            <p>No redlines match the selected filters.</p>
          </div>
        {:else}
          {#each paginatedDiffs as diff}
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
                  <span class="diff-cat-badge">{diff.category?.toUpperCase() || 'CLAUSE'}</span>
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
                      <span class="del-symbol">-</span> Omitted Provision Deleted from Document A
                    </div>
                    <div class="redline-content-text strike">{diff.doc_a_text}</div>
                  </div>
                {/if}
              </div>

              <!-- Quick Action Links -->
              <div class="diff-card-footer">
                {#if diff.doc_a_page}
                  <button
                    type="button"
                    class="footer-inspect-btn"
                    on:click={() => handleInspectDoc(compareBaseDocId, diff.doc_a_page)}
                  >
                    Inspect in Doc A (Page {diff.doc_a_page}) →
                  </button>
                {/if}
                {#if diff.doc_b_page}
                  <button
                    type="button"
                    class="footer-inspect-btn"
                    on:click={() => handleInspectDoc(compareTargetDocId, diff.doc_b_page)}
                  >
                    Inspect in Doc B (Page {diff.doc_b_page}) →
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      {#if filteredDiffsList.length > 0}
        <!-- Pagination Bar -->
        <div class="pagination-bar standalone mt-4">
          <span class="pagination-info">
            Showing <strong
              >{(diffPage - 1) * diffPageSize + 1}–{Math.min(
                diffPage * diffPageSize,
                filteredDiffsList.length,
              )}</strong
            >
            of <strong>{filteredDiffsList.length}</strong> diffs
          </span>
          <div class="pagination-controls">
            <button
              type="button"
              class="pagination-btn"
              disabled={diffPage <= 1}
              on:click={() => diffPage--}
              aria-label="Previous Page"
            >
              &larr; Prev
            </button>
            <span class="pagination-page-indicator">
              Page <strong>{diffPage}</strong> of <strong>{diffTotalPages}</strong>
            </span>
            <button
              type="button"
              class="pagination-btn"
              disabled={diffPage >= diffTotalPages}
              on:click={() => diffPage++}
              aria-label="Next Page"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else if !isComparing}
    <!-- Pre-comparison empty/guidance prompt -->
    <div class="glass-card compare-empty-card">
      <div class="empty-icon">⚖️</div>
      <h3>Select Two Documents to Initiate Automated Redlining</h3>
      <p>
        Compare contracts, policy revisions, purchase orders, or invoices side-by-side. Automated AI
        analyzes clause modifications, fee differentials, and risk exposure changes in real-time.
      </p>
      {#if documents.length >= 2}
        <div class="quick-compare-suggestions">
          <span>Quick Compare Suggestions:</span>
          <div class="suggestions-chips">
            <button
              type="button"
              class="chip-btn"
              on:click={() => quickCompare(documents[0].id, documents[1].id)}
            >
              Compare {documents[0].original_filename} vs {documents[1].original_filename} ⚡
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .compare-workspace {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .compare-header-card {
    padding: 24px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 24px;
  }

  .compare-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }

  .compare-title-row h2 {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .compare-desc {
    color: var(--text-muted);
    font-size: 0.88rem;
    max-width: 800px;
  }

  .doc-compare-selectors {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 16px;
    align-items: center;
  }

  .compare-doc-select-box {
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 16px;
  }

  .base-box {
    border-top: 3px solid #f2b84b;
  }

  .target-box {
    border-top: 3px solid #818cf8;
  }

  .box-badge {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .badge-tag {
    font-size: 0.72rem;
    font-weight: 700;
    font-family: var(--font-mono);
    padding: 2px 8px;
    border-radius: 3px;
    background: #20242e;
    color: #f6f6f6;
  }

  .role-hint {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .selector-select-wrapper select {
    width: 100%;
    background: #121419;
    color: var(--text-main);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    font-size: 0.85rem;
    outline: none;
  }

  .selected-doc-mini-card {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .doc-mini-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .mini-title {
    font-size: 0.85rem;
    color: var(--text-main);
  }

  .doc-mini-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }

  .mini-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .doc-mini-summary {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .compare-mid-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .swap-docs-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #161922;
    border: 1px solid var(--border-color);
    color: var(--text-main);
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .swap-docs-btn:hover {
    background: #f2b84b;
    color: #08090b;
    border-color: #f2b84b;
  }

  .vs-divider {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .verdict-banner {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
  }

  .verdict-banner.risk-increased {
    border-left: 4px solid #f87171;
  }

  .verdict-banner.risk-mitigated {
    border-left: 4px solid #67d8a2;
  }

  .verdict-banner.risk-neutral {
    border-left: 4px solid #f2b84b;
  }

  .verdict-icon {
    font-size: 1.8rem;
  }

  .verdict-content {
    flex: 1;
  }

  .verdict-top-tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
  }

  .verdict-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .risk-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
  }

  .risk-badge.increased {
    background: #2a1215;
    color: #f87171;
    border: 1px solid #632025;
  }

  .risk-badge.decreased {
    background: #12281e;
    color: #67d8a2;
    border: 1px solid #1e5a40;
  }

  .risk-badge.neutral {
    background: #261c0e;
    color: #f2b84b;
    border: 1px solid #5a4524;
  }

  .financial-delta-badge {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: #67d8a2;
    background: #12281e;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid #1e5a40;
  }

  .verdict-text {
    font-size: 0.88rem;
    color: var(--text-main);
    line-height: 1.5;
  }

  .similarity-circle-box {
    text-align: center;
    padding: 10px 16px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .sim-val {
    font-size: 1.6rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: #f2b84b;
  }

  .sim-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .diff-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  .metric-card {
    padding: 16px 20px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .metric-num {
    font-size: 1.6rem;
    font-weight: 700;
    font-family: var(--font-mono);
    margin-bottom: 4px;
  }

  .added-card .metric-num {
    color: #67d8a2;
  }

  .removed-card .metric-num {
    color: #f87171;
  }

  .modified-card .metric-num {
    color: #f2b84b;
  }

  .total-card .metric-num {
    color: #f6f6f6;
  }

  .metric-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .metric-sub {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .recommendations-card {
    padding: 20px 24px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
  }

  .rec-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .rec-header h4 {
    font-size: 0.95rem;
    color: var(--text-main);
    font-weight: 600;
  }

  .rec-sub {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .rec-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rec-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--text-main);
    line-height: 1.45;
  }

  .rec-bullet {
    color: #f2b84b;
    font-weight: bold;
  }

  .redlines-container-card {
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px 24px;
  }

  .redline-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .toolbar-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .count-badge {
    font-size: 0.72rem;
    padding: 2px 7px;
    background: #161922;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    margin-left: 8px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .redline-search-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
  }

  .redline-search-wrapper input {
    background: transparent;
    border: none;
    color: var(--text-main);
    font-size: 0.8rem;
    outline: none;
  }

  .filter-pills-row {
    display: flex;
    gap: 4px;
  }

  .filter-pill {
    background: #14171d;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    font-size: 0.72rem;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-pill.active {
    background: #f2b84b;
    border-color: #f2b84b;
    color: #08090b;
    font-weight: 600;
  }

  .diff-cards-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .diff-card {
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 16px 20px;
  }

  .diff-card.added {
    border-left: 4px solid #67d8a2;
  }

  .diff-card.removed {
    border-left: 4px solid #f87171;
  }

  .diff-card.modified {
    border-left: 4px solid #f2b84b;
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
  }

  .diff-type-badge {
    font-size: 0.68rem;
    font-weight: 700;
    font-family: var(--font-mono);
    padding: 2px 7px;
    border-radius: 3px;
  }

  .diff-type-badge.added {
    background: #12281e;
    color: #67d8a2;
    border: 1px solid #1e5a40;
  }

  .diff-type-badge.removed {
    background: #2a1215;
    color: #f87171;
    border: 1px solid #632025;
  }

  .diff-type-badge.modified {
    background: #261c0e;
    color: #f2b84b;
    border: 1px solid #5a4524;
  }

  .diff-cat-badge {
    font-size: 0.68rem;
    padding: 2px 6px;
    background: #18192c;
    color: #a5b4fc;
    border-radius: 3px;
  }

  .diff-risk-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--text-muted);
  }

  .page-tag {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: 3px;
    background: #161922;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
  }

  .diff-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 4px 0 6px 0;
  }

  .diff-explanation {
    font-size: 0.84rem;
    color: var(--text-muted);
    line-height: 1.45;
    margin-bottom: 12px;
  }

  .redline-diff-boxes {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .redline-box {
    flex: 1;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
  }

  .redline-box.full-width {
    flex: none;
    width: 100%;
  }

  .box-del {
    background: #2a1215;
    border: 1px solid #632025;
    color: #f87171;
  }

  .box-add {
    background: #12281e;
    border: 1px solid #1e5a40;
    color: #67d8a2;
  }

  .redline-box-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .redline-content-text.strike {
    text-decoration: line-through;
    opacity: 0.9;
  }

  .footer-inspect-btn {
    background: transparent;
    border: none;
    color: #f2b84b;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .compare-empty-card {
    text-align: center;
    padding: 60px 20px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }

  .compare-empty-card h3 {
    font-size: 1.2rem;
    color: var(--text-main);
    margin-bottom: 8px;
  }

  .compare-empty-card p {
    color: var(--text-muted);
    font-size: 0.88rem;
    max-width: 500px;
    margin: 0 auto 20px;
    line-height: 1.5;
  }

  .quick-compare-suggestions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .chip-btn {
    background: #161922;
    border: 1px solid var(--border-color);
    color: #f6f6f6;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.15s ease;
  }

  .chip-btn:hover {
    background: #f2b84b;
    color: #08090b;
    border-color: #f2b84b;
  }

  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 16px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    color: #9da2ab;
  }

  .pagination-info {
    font-size: 0.8rem;
    color: var(--text-muted);
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
    color: #f6f6f6;
    background: #161922;
    border: 1px solid #2b2e35;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #20242e;
    color: #f2b84b;
    border-color: #f2b84b;
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .doc-compare-selectors {
      grid-template-columns: 1fr;
    }
    .diff-metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .redline-diff-boxes {
      flex-direction: column;
    }
  }
</style>
