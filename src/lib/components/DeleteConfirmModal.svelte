<script>
  import { createEventDispatcher } from 'svelte';
  import CModal from '../ui/CModal.svelte';
  import CButton from '../ui/CButton.svelte';
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

  $: docName =
    document?.insights?.title ||
    document?.original_filename ||
    (document?.id ? `Document (${document.id.slice(0, 8)}...)` : 'this document');
</script>

<CModal {isOpen} on:close={handleClose} maxWidth="max-w-[420px]">
  <div class="p-1">
    <div class="flex items-start gap-3.5">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200"
      >
        <CIcon name="trash" size={18} />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="font-heading text-lg font-semibold text-ink tracking-tight">
          {mode === 'workspace' ? 'Purge Workspace?' : 'Delete Document?'}
        </h3>
        <p class="mt-1 text-xs text-ink-muted leading-relaxed">
          {#if mode === 'workspace'}
            Are you sure you want to permanently purge all <strong class="text-ink font-semibold"
              >{documentCount} {documentCount === 1 ? 'document' : 'documents'}</strong
            >? This action cannot be undone.
          {:else}
            Are you sure you want to permanently delete <strong
              class="text-ink font-semibold break-all"
              title={docName}>{docName}</strong
            >? This action cannot be undone.
          {/if}
        </p>
      </div>
    </div>

    <div class="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
      <CButton variant="secondary" size="sm" disabled={isDeleting} on:click={handleClose}>
        Cancel
      </CButton>
      <CButton
        variant="danger"
        size="sm"
        loading={isDeleting}
        disabled={isDeleting}
        on:click={handleConfirm}
      >
        <span>{mode === 'workspace' ? 'Purge Workspace' : 'Delete'}</span>
      </CButton>
    </div>
  </div>
</CModal>
