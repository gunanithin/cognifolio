<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let isOpen = false;
  export let maxWidth = 'max-w-md';
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleClose() {
    isOpen = false;
    dispatch('close');
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="0"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="relative w-full {maxWidth} max-h-[90vh] max-h-[90dvh] overflow-y-auto rounded-[8px] border border-border-strong bg-surface p-6 sm:p-7 md:p-8 shadow-paper-elevated text-ink transition-transform duration-200 {className}"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <button
        class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border-hairline bg-surface-subtle text-ink transition-colors hover:bg-ink hover:text-ink-inverse"
        on:click={handleClose}
        aria-label="Close dialog"
      >
        <CIcon name="close" size={14} />
      </button>

      <slot />
    </div>
  </div>
{/if}
