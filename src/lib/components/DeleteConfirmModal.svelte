<script>
  import { createEventDispatcher } from 'svelte';
  import CModal from '../ui/CModal.svelte';
  import CButton from '../ui/CButton.svelte';
  import CBadge from '../ui/CBadge.svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let isOpen = false;
  export let document = null;
  export let mode = 'document'; // 'document' | 'workspace'
  export let documentCount = 0;
  export let isDeleting = false;

  const dispatch = createEventDispatcher();

  function handleClose() {
    if (!isDeleting) {
      isOpen = false;
      dispatch('close');
    }
  }

  function handleConfirm() {
    if (!isDeleting) {
      dispatch('confirm');
    }
  }

  $: docTitle =
    document?.insights?.title ||
    document?.original_filename ||
    (document?.id ? `Document (${document.id.slice(0, 8)}...)` : 'Selected Document');

  $: docType = document?.insights?.document_type || document?.file_type || 'PDF';
</script>

<CModal {isOpen} on:close={handleClose} maxWidth="max-w-[480px]">
  <!-- Danger Header Icon & Badge -->
  <div class="text-center">
    <div
      class="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full border border-status-danger-border bg-status-danger-bg text-status-danger-text shadow-sm"
    >
      <CIcon name="trash" size={24} />
    </div>

    <div class="mb-2 flex justify-center">
      <CBadge variant="danger" icon="warning">Irreversible Action</CBadge>
    </div>

    <h3 class="font-heading text-xl md:text-2xl font-semibold text-ink tracking-tight">
      {mode === 'workspace' ? 'Purge Workspace Documents' : 'Permanently Delete Document'}
    </h3>

    <p class="mt-1 text-xs text-ink-muted leading-relaxed max-w-sm mx-auto">
      {#if mode === 'workspace'}
        You are about to permanently purge all workspace documents, compliance histories, and vector
        embeddings.
      {:else}
        Are you sure you want to permanently delete this document from your workspace?
      {/if}
    </p>
  </div>

  <!-- Document / Workspace Scope Card -->
  <div class="my-4 rounded-[6px] border border-border-hairline bg-surface-subtle p-3.5">
    {#if mode === 'workspace'}
      <div class="space-y-2 text-xs font-body">
        <div class="flex items-center justify-between">
          <span class="text-ink-muted">Total Documents in Scope:</span>
          <span class="font-semibold text-ink"
            >{documentCount} {documentCount === 1 ? 'document' : 'documents'}</span
          >
        </div>
        <div class="flex items-center justify-between border-t border-border-hairline pt-2">
          <span class="text-ink-muted">Affected Systems:</span>
          <span class="font-mono text-[0.7rem] text-ink">PostgreSQL + Qdrant Vector Cloud</span>
        </div>
        <div class="flex items-center justify-between border-t border-border-hairline pt-2">
          <span class="text-ink-muted">Compliance Status:</span>
          <span class="font-semibold text-status-danger-text">Full Database Reset</span>
        </div>
      </div>
    {:else if document}
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-border-hairline bg-surface text-ink shadow-xs"
        >
          <CIcon name="document" size={20} />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h4 class="truncate text-xs font-semibold text-ink" title={docTitle}>
              {docTitle}
            </h4>
            <CBadge variant="indigo" className="text-[0.65rem] px-1.5 py-0 shrink-0">
              {docType}
            </CBadge>
          </div>

          {#if document.original_filename && document.insights?.title && document.original_filename !== document.insights.title}
            <p
              class="truncate text-[0.72rem] text-ink-muted mt-0.5"
              title={document.original_filename}
            >
              {document.original_filename}
            </p>
          {/if}

          <div class="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem] text-ink-dim">
            {#if document.id}
              <span class="font-mono bg-paper px-1.5 py-0.5 rounded border border-border-hairline">
                ID: {document.id.slice(0, 14)}{document.id.length > 14 ? '…' : ''}
              </span>
            {/if}
            {#if document.page_count}
              <span>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'}</span>
            {/if}
            {#if document.file_size_bytes}
              <span>• {Math.round(document.file_size_bytes / 1024)} KB</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Warning Impact Notice -->
  <div
    class="mb-6 rounded-[6px] border border-status-danger-border bg-status-danger-bg p-3.5 text-xs text-status-danger-text"
  >
    <div class="flex items-center gap-2 font-semibold mb-1.5">
      <CIcon name="warning" size={14} />
      <span>What will be removed:</span>
    </div>
    <ul class="space-y-1 pl-4 list-disc text-[0.75rem] text-red-950/80 leading-normal font-body">
      {#if mode === 'workspace'}
        <li>All {documentCount} physical source files and sanitized PDF versions</li>
        <li>All dense neural vector embeddings across Qdrant indexes</li>
        <li>All extracted insights, multi-doc redlines, and audit logs</li>
      {:else}
        <li>Original source document file and cached redacted copies</li>
        <li>Neural vector embeddings in Qdrant and chunk search indices</li>
        <li>Extracted entities, clause summaries, and compliance audit entries</li>
      {/if}
    </ul>
    <p
      class="mt-2 text-[0.72rem] font-medium text-status-danger-text border-t border-status-danger-border/60 pt-1.5"
    >
      ⚠️ This deletion is immediate, permanent, and cannot be undone.
    </p>
  </div>

  <!-- Action Buttons -->
  <div class="flex items-center justify-end gap-2.5">
    <CButton variant="secondary" size="md" disabled={isDeleting} on:click={handleClose}>
      Cancel
    </CButton>
    <CButton
      variant="danger"
      size="md"
      loading={isDeleting}
      disabled={isDeleting}
      on:click={handleConfirm}
    >
      <CIcon name="trash" size={13} />
      <span>{mode === 'workspace' ? 'Purge Workspace Data' : 'Permanently Delete'}</span>
    </CButton>
  </div>
</CModal>
