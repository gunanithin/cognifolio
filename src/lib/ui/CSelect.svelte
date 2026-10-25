<script>
  import { createEventDispatcher } from 'svelte';

  export let label = '';
  export let value = '';
  export let id = '';
  export let disabled = false;
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleChange(e) {
    value = e.target.value;
    dispatch('change', e);
  }
</script>

<div class="flex flex-col gap-1.5 {className}">
  {#if label}
    <label for={id} class="text-xs font-semibold uppercase tracking-wider text-ink-muted">
      {label}
    </label>
  {/if}

  <div class="relative w-full">
    <select
      {id}
      {disabled}
      {value}
      on:change={handleChange}
      class="w-full appearance-none rounded-[4px] border border-border-hairline bg-surface px-3.5 py-2.5 pr-9 text-sm text-ink transition-all duration-150 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <slot />
    </select>
    <div
      class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</div>
