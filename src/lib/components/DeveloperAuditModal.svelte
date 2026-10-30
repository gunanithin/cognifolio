<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import CIcon from '../icons/CIcon.svelte';
  import CBadge from '../ui/CBadge.svelte';
  import CButton from '../ui/CButton.svelte';
  import {
    fetchDeveloperTelemetryLogs,
    fetchDeveloperTelemetryStats,
    fetchTelemetryLogDetail,
    getCurrentUser,
    getAuthToken,
  } from '../api.js';

  export let isOpen = false;
  export let prefillCorrelationId = '';

  const dispatch = createEventDispatcher();

  // In-Memory Authentication State
  let developerToken = null;
  let developerUser = null;
  let activeSessionUser = null;

  // Filter & Search State
  let searchQuery = '';
  let userTypeFilter = '';
  let subsystemFilter = '';
  let severityFilter = '';
  let statusCodeFilter = '';
  let currentPage = 1;
  const pageSize = 25;

  // Data State
  let logs = [];
  let totalLogs = 0;
  let totalPages = 1;
  let stats = null;
  let isLoadingLogs = false;
  let fetchError = '';
  let selectedLog = null;
  let isInspectingDetail = false;
  let copiedCorrelationId = null;
  let copiedStackTrace = false;

  function close() {
    isOpen = false;
    selectedLog = null;
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      if (selectedLog) {
        selectedLog = null;
      } else {
        close();
      }
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });

  $: if (isOpen) {
    const user = getCurrentUser();
    const token = getAuthToken();
    activeSessionUser = user;
    if (user && token && (user.role === 'developer' || user.role === 'admin')) {
      developerToken = token;
      developerUser = user;
    } else {
      developerToken = null;
      developerUser = null;
    }
  }

  $: if (isOpen && prefillCorrelationId) {
    searchQuery = prefillCorrelationId;
  }

  $: if (isOpen && developerToken) {
    loadLogsAndStats();
  }

  function handleDisconnect() {
    developerToken = null;
    developerUser = null;
    logs = [];
    totalLogs = 0;
    stats = null;
    selectedLog = null;
  }

  async function loadLogsAndStats() {
    if (!developerToken) return;
    isLoadingLogs = true;
    fetchError = '';

    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchDeveloperTelemetryLogs(
          {
            page: currentPage,
            limit: pageSize,
            user_type: userTypeFilter || undefined,
            subsystem: subsystemFilter || undefined,
            severity: severityFilter || undefined,
            status_code: statusCodeFilter ? parseInt(statusCodeFilter, 10) : undefined,
            search: searchQuery.trim() || undefined,
          },
          developerToken,
        ),
        fetchDeveloperTelemetryStats(developerToken).catch(() => null),
      ]);

      logs = logsRes.items || [];
      totalLogs = logsRes.total || 0;
      totalPages = Math.ceil(totalLogs / pageSize) || 1;
      if (statsRes) stats = statsRes;
    } catch (err) {
      fetchError = err.message || 'Failed to query Supabase error telemetry table.';
      if (err.message && err.message.includes('401')) {
        handleDisconnect();
        authError = 'Developer session expired. Please re-authenticate.';
      }
    } finally {
      isLoadingLogs = false;
    }
  }

  async function inspectLog(log) {
    selectedLog = log;
    isInspectingDetail = true;
    try {
      const full = await fetchTelemetryLogDetail(log.correlation_id, developerToken);
      if (full) selectedLog = full;
    } catch {
      // Retain existing log summary
    } finally {
      isInspectingDetail = false;
    }
  }

  function copyCorrelationId(cid) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cid);
      copiedCorrelationId = cid;
      setTimeout(() => {
        if (copiedCorrelationId === cid) copiedCorrelationId = null;
      }, 2500);
    }
  }

  function copyStackTrace(trace) {
    if (!trace) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(trace);
      copiedStackTrace = true;
      setTimeout(() => {
        copiedStackTrace = false;
      }, 2500);
    }
  }

  function handleFilterChange() {
    currentPage = 1;
    loadLogsAndStats();
  }

  function exportFilteredLogsAsJson() {
    if (!logs || logs.length === 0) return;
    if (typeof window === 'undefined') return;

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `cognifolio_telemetry_audit_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function formatTime(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' · ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return isoStr;
    }
  }

  function getSeverityVariant(severity) {
    const s = (severity || '').toUpperCase();
    if (s === 'CRITICAL') return 'danger';
    if (s === 'ERROR') return 'rose';
    if (s === 'WARNING') return 'warning';
    return 'neutral';
  }

  function getPersonaVariant(userType) {
    const t = (userType || '').toLowerCase();
    if (t === 'guest') return 'amber';
    if (t === 'authenticated') return 'indigo';
    return 'neutral';
  }
</script>

{#if isOpen}
  <div
    class="telemetry-backdrop"
    transition:fade={{ duration: 150 }}
    on:click={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
    role="button"
    tabindex="0"
    aria-label="Close Developer Audit Console"
  >
    <div
      class="telemetry-modal-card"
      transition:scale={{ start: 0.98, duration: 180 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Developer Centralized Observability & Error Audit Console"
    >
      <!-- Top Modal Header -->
      <div class="console-header">
        <div class="console-header-left">
          <div class="console-kicker-badge">
            <span class="live-dot"></span>
            <span>DEVELOPER OBSERVABILITY &amp; AUDIT ENGINE</span>
          </div>
          <h2 class="console-title">Supabase Centralized Error Telemetry</h2>
          <p class="console-subtitle">
            Enterprise database query engine for error auditing, stack trace inspection, and persona
            diagnostics.
          </p>
        </div>

        <div class="console-header-right">
          {#if developerToken}
            <div class="dev-session-pill">
              <span class="dev-email-text">{developerUser?.email || devEmail}</span>
              <span class="dev-role-badge">DEVELOPER</span>
              <button
                type="button"
                class="dev-disconnect-btn"
                on:click={handleDisconnect}
                title="Disconnect Developer Session"
              >
                Disconnect
              </button>
            </div>
          {/if}

          <button
            class="modal-close-btn"
            on:click={close}
            aria-label="Close Developer Audit Console"
          >
            <CIcon name="close" size={16} />
          </button>
        </div>
      </div>

      <!-- Main Body: State 1 (Login) or State 2 (Audit Console) -->
      <div class="console-body">
        {#if !developerToken}
          <!-- Access Restriction View -->
          <div class="auth-gateway-wrapper">
            <div class="auth-gateway-card">
              <div class="auth-icon-badge">
                <CIcon name="shield" size={24} color="#ca8a04" />
              </div>
              <h3 class="auth-title">Elevated Role Required</h3>
              <p class="auth-desc">
                Access to operational error telemetry, unhandled stack traces, and system
                diagnostics is strictly restricted to authorized accounts with the <strong
                  class="text-ink">developer</strong
                >
                or <strong class="text-ink">admin</strong> role in Supabase.
              </p>

              {#if activeSessionUser}
                <div
                  class="mb-6 rounded-[6px] border border-border-hairline bg-surface p-3.5 text-xs flex items-center justify-between shadow-sm"
                >
                  <div class="flex items-center gap-2.5">
                    <CIcon name="user" size={16} />
                    <div>
                      <div class="font-medium text-ink">{activeSessionUser.email}</div>
                      <div class="text-[11px] text-ink-muted">Active Session Identity</div>
                    </div>
                  </div>
                  <CBadge
                    variant={activeSessionUser.role === 'developer' ||
                    activeSessionUser.role === 'admin'
                      ? 'emerald'
                      : 'neutral'}
                  >
                    {activeSessionUser.role ? activeSessionUser.role.toUpperCase() : 'GUEST'}
                  </CBadge>
                </div>
              {/if}

              <div class="flex flex-col gap-3">
                <CButton
                  variant="primary"
                  className="w-full"
                  on:click={() => {
                    close();
                    dispatch('openAuthModal');
                  }}
                >
                  <CIcon name="lightning" size={14} />
                  <span>Sign In with Authorized Developer Account</span>
                </CButton>
              </div>

              <div class="security-disclaimer mt-6">
                <CIcon name="shield" size={12} color="var(--text-dim, #78716c)" />
                <span>
                  Role-Based Security: Telemetry query access is validated per-request using
                  verified JWT claims against Supabase PostgreSQL. There are zero backdoors or
                  shared secret keys in the codebase.
                </span>
              </div>
            </div>
          </div>
        {:else}
          <!-- Authenticated Developer Audit Workspace -->
          <!-- KPI Metrics Ribbon -->
          {#if stats}
            <div class="metrics-ribbon">
              <div class="metric-card">
                <span class="metric-label">Total Errors Logged</span>
                <span class="metric-value font-mono">{stats.total_errors ?? 0}</span>
                <span class="metric-sub">Across all subsystems</span>
              </div>

              <div class="metric-card">
                <span class="metric-label">Critical Incidents</span>
                <span class="metric-value font-mono text-rose-600">{stats.critical_count ?? 0}</span
                >
                <span class="metric-sub"
                  >{stats.error_count ?? 0} Standard / {stats.warning_count ?? 0} Warnings</span
                >
              </div>

              <div class="metric-card">
                <span class="metric-label">Actor Persona Split</span>
                <div class="metric-persona-split">
                  <div class="persona-chip guest">
                    <span class="persona-dot guest-dot"></span>
                    <span>Guest: {stats.by_user_type?.guest ?? 0}</span>
                  </div>
                  <div class="persona-chip auth">
                    <span class="persona-dot auth-dot"></span>
                    <span>Auth: {stats.by_user_type?.authenticated ?? 0}</span>
                  </div>
                </div>
                <span class="metric-sub">Conversion blocker diagnostics</span>
              </div>

              <div class="metric-card">
                <span class="metric-label">Subsystem Heatmap</span>
                <div class="subsystem-tags-row">
                  {#each Object.entries(stats.by_subsystem || {}) as [sub, count]}
                    <span class="subsystem-mini-tag font-mono">
                      {sub}: <strong>{count}</strong>
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

          <!-- Search & Filter Controls -->
          <div class="controls-toolbar">
            <div class="search-box">
              <CIcon name="search" size={14} color="var(--text-dim, #78716c)" />
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search Reference ID (ERR-XXXX-XXXX), error code, or keyword..."
                on:keydown={(e) => e.key === 'Enter' && handleFilterChange()}
                class="search-input font-mono"
              />
              {#if searchQuery}
                <button
                  type="button"
                  class="clear-search-btn"
                  on:click={() => {
                    searchQuery = '';
                    handleFilterChange();
                  }}
                >
                  <CIcon name="close" size={12} />
                </button>
              {/if}
            </div>

            <div class="filter-dropdowns">
              <!-- Persona Filter -->
              <select
                bind:value={userTypeFilter}
                on:change={handleFilterChange}
                class="filter-select"
                aria-label="Filter by Persona"
              >
                <option value="">All Personas</option>
                <option value="guest">Guest Users Only</option>
                <option value="authenticated">Authenticated Users</option>
                <option value="system">System Workflows</option>
              </select>

              <!-- Subsystem Filter -->
              <select
                bind:value={subsystemFilter}
                on:change={handleFilterChange}
                class="filter-select"
                aria-label="Filter by Subsystem"
              >
                <option value="">All Subsystems</option>
                <option value="ingestion">Ingestion / Upload</option>
                <option value="extraction">Extraction / OCR</option>
                <option value="ai_analysis">AI Analysis / Gemini</option>
                <option value="storage">Storage &amp; Vault</option>
                <option value="auth">Authentication &amp; Session</option>
                <option value="client_runtime">Client Browser Runtime</option>
                <option value="server">Server / Infrastructure</option>
              </select>

              <!-- Severity Filter -->
              <select
                bind:value={severityFilter}
                on:change={handleFilterChange}
                class="filter-select"
                aria-label="Filter by Severity"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARNING">WARNING</option>
              </select>

              <!-- Status Code Filter -->
              <select
                bind:value={statusCodeFilter}
                on:change={handleFilterChange}
                class="filter-select"
                aria-label="Filter by HTTP Status Code"
              >
                <option value="">All Status Codes</option>
                <option value="400">400 Bad Request</option>
                <option value="401">401 Unauthorized</option>
                <option value="403">403 Forbidden</option>
                <option value="404">404 Not Found</option>
                <option value="413">413 Payload Too Large</option>
                <option value="422">422 Unprocessable</option>
                <option value="500">500 Internal Error</option>
                <option value="503">503 Unavailable</option>
              </select>

              <!-- Refresh Button -->
              <button
                type="button"
                class="toolbar-action-btn"
                on:click={loadLogsAndStats}
                disabled={isLoadingLogs}
                title="Refresh logs from Supabase"
              >
                <CIcon name="refresh" size={13} className={isLoadingLogs ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <!-- Export JSON Button -->
              <button
                type="button"
                class="toolbar-action-btn"
                on:click={exportFilteredLogsAsJson}
                disabled={logs.length === 0}
                title="Export current page as JSON"
              >
                <CIcon name="copy" size={13} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <!-- Error Alert Banner -->
          {#if fetchError}
            <div class="fetch-error-banner">
              <CIcon name="warning" size={14} color="#dc2626" />
              <span>{fetchError}</span>
            </div>
          {/if}

          <!-- Telemetry Logs Table -->
          <div class="table-container">
            {#if isLoadingLogs && logs.length === 0}
              <div class="table-loading-state">
                <div class="spinner-dot"></div>
                <span>Querying Supabase error telemetry table...</span>
              </div>
            {:else if logs.length === 0}
              <div class="table-empty-state">
                <CIcon name="check" size={28} color="#16a34a" />
                <h4>No Telemetry Errors Encountered</h4>
                <p>
                  No exceptions or client runtime errors match your active filter criteria in
                  Supabase PostgreSQL.
                </p>
              </div>
            {:else}
              <table class="audit-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Reference ID</th>
                    <th>Persona</th>
                    <th>Subsystem</th>
                    <th>Endpoint / Method</th>
                    <th>User Notice vs Technical Error</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {#each logs as log (log.id)}
                    <tr
                      class="audit-row"
                      class:selected={selectedLog && selectedLog.id === log.id}
                      on:click={() => inspectLog(log)}
                    >
                      <!-- Severity -->
                      <td>
                        <CBadge variant={getSeverityVariant(log.severity)}>
                          {log.severity}
                        </CBadge>
                      </td>

                      <!-- Reference ID with 1-click copy -->
                      <td>
                        <div class="cid-cell">
                          <code class="cid-code font-mono">{log.correlation_id}</code>
                          <button
                            type="button"
                            class="cid-copy-btn"
                            on:click|stopPropagation={() => copyCorrelationId(log.correlation_id)}
                            title="Copy Reference ID"
                          >
                            {#if copiedCorrelationId === log.correlation_id}
                              <CIcon name="check" size={12} color="#16a34a" />
                            {:else}
                              <CIcon name="copy" size={12} />
                            {/if}
                          </button>
                        </div>
                      </td>

                      <!-- Persona -->
                      <td>
                        <CBadge variant={getPersonaVariant(log.user_type)}>
                          {log.user_type}
                        </CBadge>
                      </td>

                      <!-- Subsystem -->
                      <td>
                        <span class="subsystem-pill font-mono">{log.subsystem}</span>
                      </td>

                      <!-- Endpoint / Method -->
                      <td>
                        <div class="endpoint-cell">
                          {#if log.http_method}
                            <span class="method-tag font-mono">{log.http_method}</span>
                          {/if}
                          <span class="endpoint-text font-mono" title={log.endpoint || '—'}>
                            {log.endpoint || 'client-runtime'}
                          </span>
                          {#if log.status_code}
                            <span class="status-code-tag font-mono">{log.status_code}</span>
                          {/if}
                        </div>
                      </td>

                      <!-- Messages -->
                      <td class="messages-cell">
                        <div class="user-msg-preview" title={log.user_friendly_message}>
                          {log.user_friendly_message}
                        </div>
                        {#if log.technical_message && log.technical_message !== log.user_friendly_message}
                          <div class="tech-msg-preview font-mono" title={log.technical_message}>
                            {log.technical_message}
                          </div>
                        {/if}
                      </td>

                      <!-- Timestamp -->
                      <td class="time-cell font-mono">
                        {formatTime(log.timestamp)}
                      </td>

                      <!-- Inspect Button -->
                      <td>
                        <button
                          type="button"
                          class="row-inspect-btn"
                          on:click|stopPropagation={() => inspectLog(log)}
                        >
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <!-- Table Footer Pagination Bar -->
          <div class="pagination-bar">
            <span class="pagination-info font-mono">
              Showing {logs.length} of {totalLogs} total events (Page {currentPage} of {totalPages})
            </span>
            <div class="pagination-controls">
              <button
                type="button"
                class="page-nav-btn"
                disabled={currentPage <= 1 || isLoadingLogs}
                on:click={() => {
                  currentPage--;
                  loadLogsAndStats();
                }}
              >
                &larr; Previous
              </button>
              <button
                type="button"
                class="page-nav-btn"
                disabled={currentPage >= totalPages || isLoadingLogs}
                on:click={() => {
                  currentPage++;
                  loadLogsAndStats();
                }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Detail Inspection Drawer / Submodal -->
      {#if selectedLog}
        <div
          class="detail-drawer-backdrop"
          transition:fade={{ duration: 120 }}
          on:click={() => (selectedLog = null)}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedLog = null)}
          role="button"
          tabindex="0"
          aria-label="Close Error Detail Drawer"
        >
          <div
            class="detail-drawer-card"
            transition:scale={{ start: 0.98, duration: 150 }}
            role="dialog"
            aria-modal="true"
            aria-label="Error Telemetry Record Inspection"
            tabindex="-1"
            on:click|stopPropagation
            on:keydown|stopPropagation
          >
            <!-- Drawer Header -->
            <div class="drawer-header">
              <div class="drawer-header-left">
                <div class="drawer-kicker">
                  <CBadge variant={getSeverityVariant(selectedLog.severity)}>
                    {selectedLog.severity}
                  </CBadge>
                  <span class="drawer-kicker-dot">•</span>
                  <span class="font-mono text-xs">{selectedLog.error_code || 'EXCEPTION'}</span>
                </div>
                <div class="drawer-title-row">
                  <h3 class="drawer-title font-mono">{selectedLog.correlation_id}</h3>
                  <button
                    type="button"
                    class="drawer-copy-cid-btn"
                    on:click={() => copyCorrelationId(selectedLog.correlation_id)}
                  >
                    {#if copiedCorrelationId === selectedLog.correlation_id}
                      <CIcon name="check" size={13} color="#16a34a" />
                      <span>Copied!</span>
                    {:else}
                      <CIcon name="copy" size={13} />
                      <span>Copy Ref ID</span>
                    {/if}
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="drawer-close-btn"
                on:click={() => (selectedLog = null)}
                aria-label="Close detail drawer"
              >
                <CIcon name="close" size={15} />
              </button>
            </div>

            <!-- Drawer Body -->
            <div class="drawer-body">
              <!-- Grid Attributes -->
              <div class="detail-attrs-grid">
                <div class="attr-box">
                  <span class="attr-label">Timestamp</span>
                  <span class="attr-val font-mono">{formatTime(selectedLog.timestamp)}</span>
                </div>

                <div class="attr-box">
                  <span class="attr-label">Actor Persona</span>
                  <div class="attr-val">
                    <CBadge variant={getPersonaVariant(selectedLog.user_type)}>
                      {selectedLog.user_type}
                    </CBadge>
                    {#if selectedLog.user_email}
                      <span class="text-xs text-stone-500 font-mono ml-2">
                        ({selectedLog.user_email})
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="attr-box">
                  <span class="attr-label">Subsystem</span>
                  <span class="attr-val font-mono font-bold text-amber-700">
                    {selectedLog.subsystem}
                  </span>
                </div>

                <div class="attr-box">
                  <span class="attr-label">HTTP Status &amp; Endpoint</span>
                  <span class="attr-val font-mono">
                    {#if selectedLog.http_method}
                      <strong>{selectedLog.http_method}</strong>
                    {/if}
                    {selectedLog.endpoint || 'client-runtime'}
                    {#if selectedLog.status_code}
                      (Status: {selectedLog.status_code})
                    {/if}
                  </span>
                </div>
              </div>

              <!-- User Experience Section (What the end user saw) -->
              <div class="detail-section">
                <h4 class="section-heading">User-Facing Explanation (Empathy Presentation)</h4>
                <div class="user-explanation-box">
                  <p class="user-explanation-text">{selectedLog.user_friendly_message}</p>
                </div>
              </div>

              <!-- Technical Exception (What actually failed) -->
              <div class="detail-section">
                <h4 class="section-heading">Technical Exception &amp; Developer Details</h4>
                <div class="tech-exception-box font-mono">
                  {selectedLog.technical_message}
                </div>
              </div>

              <!-- Full Stack Trace -->
              {#if selectedLog.stack_trace}
                <div class="detail-section">
                  <div class="stack-trace-header">
                    <h4 class="section-heading">Unhandled Stack Trace</h4>
                    <button
                      type="button"
                      class="copy-stack-btn"
                      on:click={() => copyStackTrace(selectedLog.stack_trace)}
                    >
                      {#if copiedStackTrace}
                        <CIcon name="check" size={13} color="#16a34a" />
                        <span>Stack Trace Copied!</span>
                      {:else}
                        <CIcon name="copy" size={13} />
                        <span>Copy Stack Trace</span>
                      {/if}
                    </button>
                  </div>
                  <pre class="stack-trace-code font-mono">{selectedLog.stack_trace}</pre>
                </div>
              {/if}

              <!-- Client Context & Environment -->
              {#if selectedLog.client_context && Object.keys(selectedLog.client_context).length > 0}
                <div class="detail-section">
                  <h4 class="section-heading">Client Runtime Context</h4>
                  <pre class="json-code font-mono">{JSON.stringify(
                      selectedLog.client_context,
                      null,
                      2,
                    )}</pre>
                </div>
              {/if}

              <!-- Request Payload (Sanitized) -->
              {#if selectedLog.request_payload && Object.keys(selectedLog.request_payload).length > 0}
                <div class="detail-section">
                  <h4 class="section-heading">Sanitized Request Payload</h4>
                  <pre class="json-code font-mono">{JSON.stringify(
                      selectedLog.request_payload,
                      null,
                      2,
                    )}</pre>
                </div>
              {/if}

              <!-- Supabase SQL Query Reference -->
              <div class="supabase-sql-hint font-mono">
                <div class="sql-hint-title">Direct Supabase PostgreSQL Audit Query:</div>
                <code class="sql-hint-code">
                  SELECT * FROM public.error_logs WHERE correlation_id = '{selectedLog.correlation_id}';
                </code>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .telemetry-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(10, 10, 10, 0.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
  }

  .telemetry-modal-card {
    background: var(--bg-card, #ffffff);
    color: var(--text-main, #111111);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 12px;
    box-shadow:
      0 20px 45px -10px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 1360px;
    height: 94vh;
    max-height: 94vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* Console Header */
  .console-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border-color, #e5e5e5);
    background: var(--bg-card, #ffffff);
    flex-shrink: 0;
  }

  .console-kicker-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-gold, #ca8a04);
    margin-bottom: 2px;
  }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #16a34a;
    box-shadow: 0 0 8px rgba(22, 163, 74, 0.6);
  }

  .console-title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-main, #111111);
  }

  .console-subtitle {
    font-size: 0.75rem;
    color: var(--text-muted, #737373);
    margin: 2px 0 0 0;
  }

  .console-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dev-session-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 6px;
    background: var(--bg-subtle, #f5f5f4);
    border: 1px solid var(--border-color, #e7e5e4);
    font-size: 0.78rem;
  }

  .dev-email-text {
    font-family: var(--font-mono, monospace);
    color: var(--text-main, #44403c);
    font-weight: 500;
  }

  .dev-role-badge {
    background: var(--text-main, #1c1917);
    color: var(--text-inverse, #fafaf9);
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .dev-disconnect-btn {
    background: transparent;
    border: none;
    color: var(--status-rose-text, #dc2626);
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .modal-close-btn {
    background: var(--bg-subtle, #f5f5f4);
    border: 1px solid var(--border-color, #e7e5e4);
    color: var(--text-muted, #57534e);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .modal-close-btn:hover {
    background: var(--bg-card-hover, #1c1917);
    color: var(--text-main, #ffffff);
    border-color: var(--border-dark, #1c1917);
  }

  /* Console Body */
  .console-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 0.65rem 1.25rem;
    gap: 0.5rem;
    background: var(--bg-primary, #fcfcfc);
  }

  /* Auth Gateway Form */
  .auth-gateway-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
  }

  .auth-gateway-card {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 12px;
    padding: 2.25rem;
    max-width: 480px;
    width: 100%;
    box-shadow: var(--shadow-card, 0 8px 30px rgba(0, 0, 0, 0.06));
    text-align: center;
  }

  .auth-icon-badge {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: var(--status-amber-bg, #fefce8);
    border: 1px solid var(--status-amber-border, #fef08a);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem auto;
  }

  .auth-title {
    font-family: var(--font-heading, 'Playfair Display', serif);
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--text-main, #111111);
  }

  .auth-desc {
    font-size: 0.82rem;
    color: var(--text-muted, #737373);
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
  }

  .security-disclaimer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-color, #f5f5f4);
    font-size: 0.72rem;
    color: var(--text-dim, #78716c);
    text-align: left;
    line-height: 1.4;
  }

  /* Metrics Ribbon */
  .metrics-ribbon {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .metric-card {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.02));
  }

  .metric-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim, #78716c);
  }

  .metric-value {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--text-main, #1c1917);
  }

  .metric-sub {
    font-size: 0.65rem;
    color: var(--text-muted, #a8a29e);
  }

  .metric-persona-split {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 3px 0;
  }

  .persona-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    font-family: var(--font-mono, monospace);
  }

  .persona-chip.guest {
    background: var(--status-amber-bg, #fefce8);
    color: var(--status-amber-text, #854d0e);
    border: 1px solid var(--status-amber-border, #fef08a);
  }

  .persona-chip.auth {
    background: var(--status-indigo-bg, #eef2ff);
    color: var(--status-indigo-text, #3730a3);
    border: 1px solid var(--status-indigo-border, #e0e7ff);
  }

  .persona-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .guest-dot {
    background: var(--color-gold, #ca8a04);
  }

  .auth-dot {
    background: #4f46e5;
  }

  .subsystem-tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }

  .subsystem-mini-tag {
    font-size: 0.68rem;
    background: var(--bg-subtle, #f5f5f4);
    border: 1px solid var(--border-color, #e7e5e4);
    padding: 1px 5px;
    border-radius: 4px;
    color: var(--text-main, #44403c);
  }

  /* Controls Toolbar */
  .controls-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 6px;
    padding: 0.4rem 0.65rem;
    flex-shrink: 0;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-subtle, #f5f5f4);
    border: 1px solid var(--border-color, #e7e5e4);
    border-radius: 6px;
    padding: 0.35rem 0.6rem;
    flex: 1;
    max-width: 440px;
  }

  .search-input {
    border: none;
    background: transparent;
    font-size: 0.76rem;
    width: 100%;
    outline: none;
    color: var(--text-main, #1c1917);
  }

  .clear-search-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-dim, #a8a29e);
  }

  .clear-search-btn:hover {
    color: var(--text-main, #1c1917);
  }

  .filter-dropdowns {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 0.35rem 0.55rem;
    font-size: 0.74rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    border-radius: 6px;
    color: var(--text-main, #44403c);
    outline: none;
  }

  .filter-select:focus {
    border-color: var(--color-gold, #1c1917);
  }

  .toolbar-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0.35rem 0.65rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-main, #1c1917);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-action-btn:hover:not(:disabled) {
    background: var(--bg-card-hover, #f5f5f4);
    border-color: var(--border-dark, #a8a29e);
  }

  .toolbar-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .fetch-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0.65rem 0.85rem;
    border-radius: 6px;
    background: var(--status-rose-bg, #fef2f2);
    border: 1px solid var(--status-rose-border, #fecaca);
    color: var(--status-rose-text, #b91c1c);
    font-size: 0.78rem;
  }

  /* Table */
  .table-container {
    flex: 1;
    min-height: 280px;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 6px;
    overflow: auto;
    position: relative;
    box-shadow: var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.02));
  }

  .audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.74rem;
    text-align: left;
  }

  .audit-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bg-subtle, #fafaf9);
    padding: 0.45rem 0.75rem;
    border-bottom: 1px solid var(--border-color, #e7e5e4);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim, #78716c);
  }

  .audit-row {
    border-bottom: 1px solid var(--border-color, #f5f5f4);
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .audit-row:hover {
    background: var(--bg-card-hover, #fafaf9);
  }

  .audit-row.selected {
    background: var(--status-amber-bg, #fefce8);
  }

  .audit-table td {
    padding: 0.45rem 0.75rem;
    vertical-align: middle;
  }

  .cid-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .cid-code {
    font-weight: 700;
    color: var(--text-main, #1c1917);
    background: var(--bg-subtle, #f5f5f4);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.72rem;
  }

  .cid-copy-btn {
    background: transparent;
    border: none;
    color: var(--text-dim, #a8a29e);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cid-copy-btn:hover {
    color: var(--text-main, #1c1917);
  }

  .subsystem-pill {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--status-amber-text, #854d0e);
    background: var(--status-amber-bg, #fefce8);
    border: 1px solid var(--status-amber-border, #fef08a);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .endpoint-cell {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .method-tag {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--bg-subtle, #f5f5f4);
    color: var(--text-muted, #57534e);
  }

  .endpoint-text {
    font-size: 0.72rem;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted, #44403c);
  }

  .status-code-tag {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--status-rose-text, #dc2626);
  }

  .messages-cell {
    max-width: 300px;
  }

  .user-msg-preview {
    font-size: 0.78rem;
    color: var(--text-main, #1c1917);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tech-msg-preview {
    font-size: 0.7rem;
    color: var(--text-dim, #78716c);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  }

  .time-cell {
    font-size: 0.7rem;
    color: var(--text-dim, #78716c);
    white-space: nowrap;
  }

  .row-inspect-btn {
    background: var(--bg-card, transparent);
    border: 1px solid var(--border-color, #d6d3d1);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-main, #1c1917);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .row-inspect-btn:hover {
    background: var(--text-main, #1c1917);
    color: var(--text-inverse, #ffffff);
    border-color: var(--text-main, #1c1917);
  }

  .table-loading-state,
  .table-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    gap: 0.75rem;
  }

  .table-empty-state h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main, #1c1917);
  }

  .table-empty-state p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted, #78716c);
  }

  .spinner-dot {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color, #e7e5e4);
    border-top-color: var(--color-gold, #ca8a04);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Pagination Bar */
  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.75rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e5e5e5);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .pagination-info {
    font-size: 0.75rem;
    color: var(--text-dim, #78716c);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .page-nav-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    color: var(--text-main, #1c1917);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .page-nav-btn:hover:not(:disabled) {
    background: var(--bg-card-hover, #f5f5f4);
    border-color: var(--border-dark, #a8a29e);
  }

  .page-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Detail Drawer Submodal */
  .detail-drawer-backdrop {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: flex-end;
  }

  .detail-drawer-card {
    background: var(--bg-card, #ffffff);
    color: var(--text-main, #111111);
    width: 100%;
    max-width: 680px;
    height: 100%;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-left: 1px solid var(--border-color, #e5e5e5);
  }

  .drawer-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #e7e5e4);
    background: var(--bg-card, #fafaf9);
    flex-shrink: 0;
  }

  .drawer-kicker {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .drawer-kicker-dot {
    color: var(--text-dim, #a8a29e);
  }

  .drawer-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drawer-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-main, #1c1917);
  }

  .drawer-copy-cid-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--bg-subtle, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    color: var(--text-main, #1c1917);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .drawer-copy-cid-btn:hover {
    background: var(--bg-card-hover, #f5f5f4);
  }

  .drawer-close-btn {
    background: var(--bg-subtle, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted, #57534e);
    transition: all 0.15s ease;
  }

  .drawer-close-btn:hover {
    background: var(--bg-card-hover, #1c1917);
    color: var(--text-main, #ffffff);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .detail-attrs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .attr-box {
    background: var(--bg-subtle, #fafaf9);
    border: 1px solid var(--border-color, #e7e5e4);
    border-radius: 6px;
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .attr-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim, #78716c);
  }

  .attr-val {
    font-size: 0.8rem;
    color: var(--text-main, #1c1917);
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .section-heading {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #57534e);
    margin: 0;
  }

  .user-explanation-box {
    background: var(--bg-subtle, #f8fafc);
    border-left: 3px solid var(--color-gold, #3b82f6);
    padding: 0.75rem 1rem;
    border-radius: 0 6px 6px 0;
  }

  .user-explanation-text {
    margin: 0;
    font-size: 0.84rem;
    color: var(--text-main, #1e293b);
    line-height: 1.45;
  }

  .tech-exception-box {
    background: var(--status-rose-bg, #fef2f2);
    border: 1px solid var(--status-rose-border, #fecaca);
    color: var(--status-rose-text, #991b1b);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.78rem;
    word-break: break-word;
  }

  .stack-trace-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .copy-stack-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 2px 7px;
    background: var(--bg-subtle, #ffffff);
    border: 1px solid var(--border-color, #d6d3d1);
    color: var(--text-main);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .copy-stack-btn:hover {
    background: var(--bg-card-hover, #f5f5f4);
  }

  .stack-trace-code,
  .json-code {
    background: #08090b;
    color: #e4e4e7;
    border: 1px solid var(--border-color, #27272a);
    padding: 0.85rem 1rem;
    border-radius: 6px;
    font-size: 0.74rem;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 280px;
  }

  .supabase-sql-hint {
    background: var(--status-amber-bg, #fefce8);
    border: 1px solid var(--status-amber-border, #fef08a);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sql-hint-title {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--status-amber-text, #854d0e);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sql-hint-code {
    font-size: 0.75rem;
    color: var(--status-amber-text, #713f12);
    font-weight: 600;
  }

  @media (max-width: 900px) {
    .metrics-ribbon {
      grid-template-columns: repeat(2, 1fr);
    }
    .detail-attrs-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
