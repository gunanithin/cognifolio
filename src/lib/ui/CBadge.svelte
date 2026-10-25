<script>
  import CIcon from '../icons/CIcon.svelte';

  export let variant = 'neutral'; // 'success' | 'warning' | 'danger' | 'indigo' | 'neutral'
  export let icon = '';
  export let className = '';

  $: variantClass = {
    success: 'bg-status-success-bg text-status-success-text border-status-success-border',
    emerald: 'bg-status-success-bg text-status-success-text border-status-success-border',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    amber: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    danger: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
    rose: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
    indigo: 'bg-status-indigo-bg text-status-indigo-text border-status-indigo-border',
    purple: 'bg-status-indigo-bg text-status-indigo-text border-status-indigo-border',
    neutral: 'bg-status-slate-bg text-status-slate-text border-status-slate-border',
    slate: 'bg-status-slate-bg text-status-slate-text border-status-slate-border',
    cyan: 'bg-status-slate-bg text-status-slate-text border-status-slate-border',
  }[variant] || 'bg-status-slate-bg text-status-slate-text border-status-slate-border';
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[0.72rem] font-semibold uppercase tracking-wider font-body {variantClass} {className}"
>
  {#if icon}
    <CIcon name={icon} size={12} />
  {/if}
  <slot />
</span>
