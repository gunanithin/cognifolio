<script>
  import { createEventDispatcher } from 'svelte';

  export let spacious = true;
  export let interactive = false;
  export let variant = 'default'; // 'default' | 'subtle' | 'active' | 'outline'
  export let className = '';

  const dispatch = createEventDispatcher();

  $: baseStyles =
    'c-card rounded-[6px] border transition-all duration-200 relative overflow-hidden text-ink';

  $: paddingStyles = spacious ? 'p-6 md:p-7' : 'p-4 md:p-5';

  $: variantStyles =
    {
      default: 'bg-surface border-border-hairline shadow-paper',
      subtle: 'bg-surface-subtle border-border-hairline',
      active: 'bg-surface border-ink shadow-paper-hover',
      outline: 'bg-transparent border-border-hairline',
    }[variant] || 'bg-surface border-border-hairline shadow-paper';

  $: interactiveStyles = interactive
    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-paper-hover hover:border-neutral-400'
    : '';
</script>

{#if interactive}
  <div
    role="button"
    tabindex="0"
    class="{baseStyles} {paddingStyles} {variantStyles} {interactiveStyles} {className}"
    on:click={(e) => dispatch('click', e)}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch('click', e)}
  >
    <slot />
  </div>
{:else}
  <div class="{baseStyles} {paddingStyles} {variantStyles} {className}">
    <slot />
  </div>
{/if}

<style>
  .c-card {
    background: var(--bg-card, #121419);
    border: 1px solid var(--border-color, #2b2e35);
    border-radius: 8px;
    color: var(--text-main, #f6f6f6);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }
</style>
