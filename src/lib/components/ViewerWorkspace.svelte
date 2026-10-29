<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let selectedDoc = null;
  export let PdfViewerComponent = null;
  export let isPdfViewerLoading = false;
  export let isRedactedView = false;
  export let isReanalyzing = false;
  export let activeHighlightTerm = '';
  export let activeHighlightKey = '';
  export let viewerRightTab = 'intel'; // 'intel' | 'chat'
  export let chatMessages = [];
  export let isChatLoading = false;
  export let chatInput = '';
  export let getDocumentFileUrl = (id) => `/api/documents/${id}/file`;
  export let getRedactedFileUrl = (id) => `/api/documents/${id}/redacted`;

  const dispatch = createEventDispatcher();
  let chatContainerRef = null;

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

  function formatChatReply(content) {
    if (!content) return '';
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\s*[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    formatted = formatted.replace(/^\s*>\s*(.*)$/gm, '<blockquote>$1</blockquote>');
    formatted = formatted.replace(/\n\n/g, '<p></p>').replace(/\n/g, '<br/>');
    return formatted;
  }

  function handleSendChat(question = null) {
    const q = question || chatInput;
    if (!q || !q.trim()) return;
    dispatch('sendChat', { question: q });
    if (!question) chatInput = '';
    setTimeout(() => {
      if (chatContainerRef) chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
    }, 50);
  }

  function handleClearChat() {
    dispatch('clearChat');
  }

  function handleLocateTakeaway(pt) {
    dispatch('locateTakeaway', { takeaway: pt });
  }

  function handleLocateEntity(key, val) {
    dispatch('locateEntity', { key, val });
  }

  function handleLocateRiskClause(clause) {
    dispatch('locateRiskClause', { clause });
  }

  function handleLocateLineItem(item) {
    dispatch('locateLineItem', { item });
  }

  function handleCitationClick(cit) {
    dispatch('citationClick', { citation: cit });
  }

  function handleSpatialEntitySelect(event) {
    dispatch('spatialEntitySelect', event.detail);
  }

  function handleReanalyze() {
    if (selectedDoc) {
      dispatch('reanalyze', { docId: selectedDoc.id });
    }
  }

  function handleDelete() {
    if (selectedDoc) {
      dispatch('deleteDocument', { doc: selectedDoc });
    }
  }

  function handleReturnToDashboard() {
    dispatch('returnToDashboard');
  }
</script>

<div class="viewer-view">
  {#if !selectedDoc}
    <div class="empty-state glass-card">
      <h4>No Document Selected</h4>
      <p>
        Please select a document from the Documents workspace or Search view to inspect its
        intelligence.
      </p>
      <button type="button" class="btn-primary" on:click={handleReturnToDashboard}>
        Return to Documents
      </button>
    </div>
  {:else}
    <div class="viewer-header">
      <div class="doc-title-row">
        <h2>
          {selectedDoc.insights ? selectedDoc.insights.title : selectedDoc.original_filename}
        </h2>
        <span class="badge badge-purple">
          {selectedDoc.insights ? selectedDoc.insights.document_type : selectedDoc.file_type}
        </span>
        <span class="fmt-inline-tag {getDocFormatInfo(selectedDoc.file_type).badgeClass}">
          {getDocFormatInfo(selectedDoc.file_type).label}
        </span>
        <span class="badge badge-emerald">
          Conf: {Math.round((selectedDoc.insights?.confidence_score || 0.95) * 100)}%
        </span>
      </div>

      <div class="header-actions">
        <!-- Mode Toggle: Original vs Redacted -->
        <div
          class="redaction-switch-pill"
          title="Toggle between original document and PII-redacted sanitized version"
        >
          <button
            type="button"
            class="pill-btn {!isRedactedView ? 'active' : ''}"
            on:click={() => (isRedactedView = false)}
          >
            📄 Original
          </button>
          <button
            type="button"
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
          <a
            href={getDocumentFileUrl(selectedDoc.id)}
            target="_blank"
            rel="noreferrer"
            class="btn-secondary"
          >
            View Raw File ↗
          </a>
        {/if}

        <button
          type="button"
          class="btn-secondary reanalyze-btn {selectedDoc.insights?.confidence_score === 0
            ? 'reanalyze-pulse'
            : ''}"
          on:click={handleReanalyze}
          disabled={isReanalyzing}
          title="Re-run deep multimodal AI intelligence on this document"
        >
          {#if isReanalyzing}
            <span>Analyzing...</span>
          {:else}
            <span>✨ Re-analyze AI</span>
          {/if}
        </button>

        <button type="button" class="btn-action delete" on:click={handleDelete}>
          Delete Document ✕
        </button>
      </div>
    </div>

    <!-- Split Screen: Left Viewer, Right AI Insights -->
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
            <span
              >{isPdfViewerLoading
                ? 'Loading Document Intelligence Canvas...'
                : 'Preparing Canvas...'}</span
            >
          </div>
        {/if}
      </div>

      <!-- Right Panel: AI Extracted Intel with 1-Click Interactive Locate Buttons -->
      <div class="panel-right">
        <!-- Right Panel Mode Switcher -->
        <div class="panel-tab-bar">
          <button
            type="button"
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
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Extracted Intelligence
          </button>
          <button
            type="button"
            class="panel-tab-btn {viewerRightTab === 'chat' ? 'active chat-active' : ''}"
            on:click={() => (viewerRightTab = 'chat')}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Conversational Document AI {chatMessages.length > 0 ? `(${chatMessages.length})` : ''}
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
                <h3>Key Takeaways &amp; Findings</h3>
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
                      on:click={() => handleLocateTakeaway(pt)}
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
                <h3>Extracted Entities &amp; Metadata</h3>
                <span class="hint-tag">Click entity to locate</span>
              </div>
              <div class="entities-grid">
                {#each Object.entries(selectedDoc.insights.entities) as [key, val]}
                  {#if val}
                    <button
                      type="button"
                      class="entity-item-btn {activeHighlightKey === key ? 'active-target' : ''}"
                      on:click={() => handleLocateEntity(key, val)}
                      title="Click to locate on document"
                    >
                      <div class="entity-top">
                        <span class="entity-key">{key.replace(/_/g, ' ')}</span>
                        {#if val && typeof val === 'object' && !Array.isArray(val) && val.box_2d}
                          <span class="spatial-pin-indicator" title="Visual box detected on scan"
                            >📍 Pin</span
                          >
                        {:else}
                          <span class="mini-search-icon">🔍</span>
                        {/if}
                      </div>
                      <span class="entity-val">
                        {val &&
                        typeof val === 'object' &&
                        !Array.isArray(val) &&
                        val.value !== undefined
                          ? val.value
                          : Array.isArray(val)
                            ? val.join(', ')
                            : val}
                      </span>
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
                <h3>Risk &amp; Penalty Clauses Detected</h3>
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
                      on:click={() => handleLocateRiskClause(clause)}
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
              <div class="line-items-scroll-wrap">
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
                        on:click={() => handleLocateLineItem(item)}
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
                            on:click|stopPropagation={() => handleLocateLineItem(item)}
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
                  <span class="chat-model-badge">Document Grounded Intelligence</span>
                </div>
              </div>
              <button
                type="button"
                class="chat-clear-btn"
                on:click={handleClearChat}
                title="Reset conversation"
              >
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
                  Answers are grounded in this document with clickable citations that navigate and
                  highlight the PDF canvas on the left.
                </p>

                <div class="starter-chips-container">
                  <span class="starter-label">Suggested Questions:</span>
                  <div class="starter-chips">
                    {#each getDocStarters(selectedDoc) as q}
                      <button type="button" class="starter-chip" on:click={() => handleSendChat(q)}>
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
                              type="button"
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
                            <button
                              type="button"
                              class="followup-chip"
                              on:click={() => handleSendChat(fq)}
                            >
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
                    <span class="typing-text">Analyzing document context...</span>
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
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span>Send</span>
              </button>
            </form>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer-view {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .empty-state h4 {
    font-size: 1.25rem;
    color: var(--text-main);
    margin-bottom: 8px;
  }

  .empty-state p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 20px;
  }

  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
  }

  .doc-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .doc-title-row h2 {
    font-family: var(--font-heading);
    font-size: 1.45rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.02em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .redaction-switch-pill {
    display: flex;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 4px;
  }

  .pill-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn.active {
    background: #20242e;
    color: var(--text-main);
  }

  .pill-btn.active.redacted-glow {
    background: #2a1215;
    color: #f87171;
    border: 1px solid #632025;
  }

  .btn-action.download-redacted {
    background: #2a1215;
    color: #f87171;
    border: 1px solid #632025;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
  }

  .btn-secondary {
    background: #14171d;
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .btn-secondary:hover {
    background: #1c202a;
    border-color: #3b3f49;
  }

  .btn-action.delete {
    background: transparent;
    color: #ef4444;
    border: 1px solid #ef4444;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-action.delete:hover {
    background: #ef4444;
    color: #ffffff;
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
    background: #121419;
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

  .panel-tab-bar {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
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
    color: #9da2ab;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .panel-tab-btn:hover {
    color: #f6f6f6;
  }

  .panel-tab-btn.active {
    color: #08090b;
    background: #f2b84b;
    border-color: #f2b84b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .insight-card {
    padding: 20px;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .insight-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .insight-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .summary-text {
    color: #b4b8c0;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .hint-tag {
    margin-left: auto;
    font-size: 0.72rem;
    color: #f2b84b;
    background: #261c0e;
    border: 1px solid #5a4524;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hint-tag.alert {
    color: #f87171;
    background: #2a1215;
    border-color: #632025;
  }

  .key-points-list,
  .risk-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    margin: 0;
  }

  .interactive-point-btn,
  .interactive-risk-btn {
    width: 100%;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    background: #161922;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .interactive-point-btn:hover {
    background: #1a1e28;
    border-color: #f2b84b;
  }

  .interactive-risk-btn {
    background: #2a1215;
    border-color: #632025;
    color: #f87171;
  }

  .interactive-risk-btn:hover {
    background: #381519;
    border-color: #f87171;
  }

  .entities-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .entity-item-btn {
    width: 100%;
    text-align: left;
    background: #161922;
    border: 1px solid var(--border-color);
    color: #f6f6f6;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .entity-item-btn:hover {
    background: #1a1e28;
    border-color: #f2b84b;
  }

  .entity-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .entity-key {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #9da2ab;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .entity-val {
    font-size: 0.85rem;
    font-weight: 600;
    color: #f6f6f6;
  }

  .doc-chat-container {
    display: flex;
    flex-direction: column;
    height: 680px;
    padding: 0;
    overflow: hidden;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color);
    background: #14171d;
  }

  .chat-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-header h4 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: #f6f6f6;
  }

  .chat-model-badge {
    font-size: 0.68rem;
    color: #f2b84b;
    background: #261c0e;
    border: 1px solid #5a4524;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .chat-messages-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #08090b;
  }

  .chat-welcome-box {
    padding: 16px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .starter-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  .starter-chip {
    text-align: left;
    background: #161922;
    border: 1px solid var(--border-color);
    color: #f6f6f6;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .starter-chip:hover {
    background: #f2b84b;
    color: #08090b;
  }

  .chat-bubble-row {
    display: flex;
    gap: 10px;
  }

  .chat-bubble-row.user {
    flex-direction: row-reverse;
  }

  .chat-bubble {
    max-width: 86%;
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 0.85rem;
    line-height: 1.55;
  }

  .chat-bubble.user {
    background: #f2b84b;
    color: #08090b;
    font-weight: 500;
  }

  .chat-bubble.assistant {
    background: #161922;
    border: 1px solid var(--border-color);
    color: #f6f6f6;
  }

  .chat-input-bar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: #14171d;
    border-top: 1px solid var(--border-color);
  }

  .chat-input-bar input {
    flex: 1;
    background: #121419;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    font-size: 0.85rem;
    color: #f6f6f6;
    outline: none;
  }

  .chat-send-btn {
    background: #f2b84b;
    color: #08090b;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0 16px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .fmt-inline-tag {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
  }

  @media (max-width: 900px) {
    .split-container {
      grid-template-columns: 1fr;
    }
  }
</style>
