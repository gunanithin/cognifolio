<script>
  import { createEventDispatcher } from 'svelte';

  export let label = '';
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let disabled = false;
  export let required = false;
  export let id = '';
  export let error = '';
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleInput(e) {
    value = e.target.value;
    dispatch('input', e);
  }

  function handleKeyDown(e) {
    dispatch('keydown', e);
  }
</script>

<div class="flex w-full flex-col gap-1.5 {className}">
  {#if label}
    <label for={id} class="text-xs font-semibold uppercase tracking-wider text-ink-muted">
      {label}
      {#if required}<span class="text-status-danger-text">*</span>{/if}
    </label>
  {/if}

  <div class="relative flex items-center w-full">
    {#if $$slots.leading}
      <div class="pointer-events-none absolute left-3 flex items-center text-ink-muted">
        <slot name="leading" />
      </div>
    {/if}

    <input
      {id}
      {type}
      {placeholder}
      {disabled}
      {required}
      {value}
      on:input={handleInput}
      on:keydown={handleKeyDown}
      on:change
      on:blur
      class="w-full rounded-[4px] border border-border-hairline bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim transition-all duration-150 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50 disabled:cursor-not-allowed {$$slots.leading
        ? 'pl-10'
        : ''} {$$slots.trailing ? 'pr-10' : ''} {error
        ? 'border-status-danger-border ring-1 ring-status-danger-border'
        : ''}"
    />

    {#if $$slots.trailing}
      <div class="absolute right-3 flex items-center">
        <slot name="trailing" />
      </div>
    {/if}
  </div>

  {#if error}
    <span class="text-xs text-status-danger-text">{error}</span>
  {/if}
</div>
