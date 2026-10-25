<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let tabs = []; // [{ id, label, icon, badge }]
  export let activeTab = '';
  export let sticky = true;
  export let className = '';

  const dispatch = createEventDispatcher();

  function selectTab(id) {
    activeTab = id;
    dispatch('change', { id });
  }
</script>

<nav
  class="c-tabs-nav w-full border-b border-border-hairline bg-paper {sticky
    ? 'sticky top-[67px] z-40'
    : ''} {className}"
>
  <div class="c-tabs-container max-w-[1400px] w-full mx-auto px-6 sm:px-8 flex items-center gap-5 md:gap-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    {#each tabs as tab}
      <button
        type="button"
        class="c-tab-btn inline-flex items-center gap-2 py-3.5 px-1 text-xs md:text-[0.82rem] font-semibold uppercase tracking-wider font-body border-b-2 transition-all duration-150 whitespace-nowrap {activeTab ===
        tab.id
          ? 'active border-ink text-ink font-bold'
          : 'border-transparent text-ink-muted hover:text-ink'}"
        on:click={() => selectTab(tab.id)}
      >
        {#if tab.icon}
          <CIcon name={tab.icon} size={16} />
        {/if}
        <span>{tab.label}</span>
        {#if tab.badge}
          <span
            class="c-tab-badge ml-1 rounded-[3px] border border-border-hairline bg-surface px-1.5 py-0.5 text-[0.68rem] font-mono text-ink-dim"
          >
            {tab.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .c-tabs-nav {
    background: #f6f6f6;
    border-bottom: 1px solid #e5e5e5;
  }
  .c-tabs-container {
    display: flex;
    align-items: center;
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 32px;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE & Edge */
  }
  .c-tabs-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
    width: 0;
    height: 0;
  }
  .c-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 4px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #555555;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .c-tab-btn:hover {
    color: #111111;
  }
  .c-tab-btn.active {
    color: #111111;
    border-bottom-color: #111111;
    font-weight: 700;
  }
  .c-tab-badge {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.7rem;
    color: #777777;
  }
</style>
