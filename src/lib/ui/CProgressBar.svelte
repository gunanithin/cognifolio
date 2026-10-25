<script>
  import { progress } from '../stores/progress.js';

  // Export optional overrides
  export let showBadge = true;
  export let height = '3px';
</script>

{#if $progress.visible}
  <!-- Global Top Progress Bar -->
  <div
    class="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden bg-black/5"
    style="height: {height};"
    role="progressbar"
    aria-valuenow={$progress.progress}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label={$progress.message || 'Page activity progress'}
  >
    <div
      class="h-full relative progress-fill"
      style="width: {$progress.progress}%; opacity: {$progress.visible ? 1 : 0};"
    >
      <!-- Leading Edge Comet Glow -->
      <div
        class="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-indigo-200/60 blur-[1px]"
      ></div>
    </div>
  </div>

  <!-- Optional Floating Activity Pill for Long Calls -->
  {#if showBadge && $progress.isLoading && $progress.message}
    <aside
      class="fixed top-3 right-4 z-[99998] flex items-center gap-2.5 rounded-full border border-border-strong/15 bg-surface/95 px-3.5 py-1.5 text-xs font-body font-medium text-ink shadow-paper-elevated backdrop-blur-md transition-all duration-200"
      aria-live="polite"
    >
      <span class="relative flex h-2 w-2">
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-indigo-text opacity-75"
        ></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-status-indigo-text"></span>
      </span>
      <span class="max-w-[280px] truncate">{$progress.message}</span>
    </aside>
  {/if}
{/if}

<style>
  .progress-fill {
    background: linear-gradient(90deg, #111111 0%, #312e81 40%, #4338ca 80%, #6366f1 100%);
    box-shadow:
      0 0 10px rgba(67, 56, 202, 0.5),
      0 0 4px rgba(17, 17, 17, 0.4);
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 250ms ease;
  }
</style>
