<script>
  import { createEventDispatcher } from 'svelte';

  export let variant = 'primary'; // 'primary' | 'secondary' | 'danger' | 'action' | 'chip' | 'ghost'
  export let size = 'md'; // 'sm' | 'md' | 'lg'
  export let loading = false;
  export let disabled = false;
  export let type = 'button';
  export let title = '';
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (!disabled && !loading) {
      dispatch('click', e);
    }
  }

  $: baseStyles =
    'inline-flex items-center justify-center font-body font-medium transition-all duration-150 outline-none select-none';

  $: sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-[4px]',
    md: 'px-4 py-2 text-sm gap-2 rounded-[4px]',
    lg: 'px-6 py-2.5 text-base gap-2.5 rounded-[6px]',
  }[size] || 'px-4 py-2 text-sm gap-2 rounded-[4px]';

  $: variantStyles = {
    primary:
      'bg-ink text-ink-inverse border border-ink hover:bg-neutral-800 hover:border-neutral-800 shadow-sm active:translate-y-[1px]',
    secondary:
      'bg-surface text-ink border border-border-hairline hover:bg-surface-hover hover:border-ink active:translate-y-[1px]',
    danger:
      'bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:bg-red-100 hover:border-status-danger-text active:translate-y-[1px]',
    action:
      'bg-surface text-ink border border-border-hairline hover:bg-ink hover:text-ink-inverse hover:border-ink',
    chip:
      'rounded-full bg-surface text-ink border border-border-hairline hover:bg-ink hover:text-ink-inverse hover:border-ink font-normal text-xs px-3 py-1',
    ghost:
      'bg-transparent text-ink hover:bg-surface-hover active:bg-neutral-200 border border-transparent',
  }[variant] || 'bg-ink text-ink-inverse border border-ink';

  $: stateStyles =
    disabled || loading
      ? 'opacity-50 cursor-not-allowed pointer-events-none transform-none'
      : 'cursor-pointer';
</script>

<button
  {type}
  {title}
  disabled={disabled || loading}
  class="{baseStyles} {sizeStyles} {variantStyles} {stateStyles} {className}"
  on:click={handleClick}
>
  {#if loading}
    <span
      class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    ></span>
  {/if}
  <slot />
</button>
