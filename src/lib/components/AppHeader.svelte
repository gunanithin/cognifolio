<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import { theme } from '../stores/theme.js';

  export let currentUser = null;
  export let activeTab = 'portal';
  export let showPricing = false; // Hidden from UI navigation for now per product requirements

  const dispatch = createEventDispatcher();
  let isUserMenuOpen = false;
  let userMenuContainer;

  function handleWindowClick(event) {
    if (isUserMenuOpen && userMenuContainer && !userMenuContainer.contains(event.target)) {
      isUserMenuOpen = false;
    }
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && isUserMenuOpen) {
      isUserMenuOpen = false;
    }
  }

  function handleLogoClick() {
    dispatch('navigate', { tab: 'portal', anchor: null });
  }

  function handleNavClick(anchor) {
    dispatch('navigate', { tab: 'portal', anchor });
  }

  function handleLaunchStudio() {
    dispatch('navigate', { tab: 'dashboard' });
  }

  function openSecurityGuide() {
    dispatch('openSecurityGuide');
  }

  function openPricing() {
    dispatch('openPricing');
  }

  function openMorrowless() {
    dispatch('openMorrowless');
  }

  function openAuth(mode) {
    isUserMenuOpen = false;
    dispatch('openAuthModal', { mode });
  }

  function handleLogout() {
    isUserMenuOpen = false;
    dispatch('logout');
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleWindowKeydown} />

<header class="app-unified-header">
  <div class="header-inner">
    <!-- Brand Lockup -->
    <div
      class="brand"
      role="button"
      tabindex="0"
      on:click={handleLogoClick}
      on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogoClick()}
      title="Cognifolio by Morrowless · Return to Overview"
    >
      <div class="brand-row">
        <img src="/app-icon.png" alt="Cognifolio Logo" class="brand-icon-img" />
        <div class="brand-titles">
          <span class="brand-name">Cognifolio</span>
          <button
            type="button"
            class="brand-byline"
            on:click|stopPropagation={openMorrowless}
            title="View Morrowless License"
          >
            BY MORROWLESS
          </button>
        </div>
      </div>
    </div>

    <!-- Center Navigation Links (Persistent Across Entire Product) -->
    <nav class="nav-links">
      <a href="#product" on:click|preventDefault={() => handleNavClick('product')}>Product</a>
      <a href="#features" on:click|preventDefault={() => handleNavClick('features')}>Features</a>
      <a href="#workflow" on:click|preventDefault={() => handleNavClick('workflow')}>How it works</a
      >
      <a
        href="#documents"
        class="nav-workspace-link"
        class:active={activeTab !== 'portal'}
        on:click|preventDefault={handleLaunchStudio}
      >
        Workspace
      </a>
      <button type="button" class="nav-text-btn" on:click={openSecurityGuide}> Security </button>
      {#if showPricing}
        <button type="button" class="nav-text-btn" on:click={openPricing}>
          Pricing <span class="nav-free-badge">Free</span>
        </button>
      {/if}
    </nav>

    <!-- Right Actions -->
    <div class="nav-actions">
      <!-- Theme Switcher Button -->
      <button
        type="button"
        class="theme-toggle-btn"
        on:click={() => theme.toggle()}
        title={$theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={$theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {#if $theme === 'dark'}
          <CIcon name="sun" size={16} color="var(--theme-dark)" />
        {:else}
          <CIcon name="moon" size={16} color="var(--text-main)" />
        {/if}
      </button>

      {#if !currentUser}
        <button type="button" class="header-signin-btn" on:click={() => openAuth('signin')}>
          Sign In
        </button>
      {/if}

      <!-- User Avatar Chip & Session Menu -->
      <div class="user-menu-wrapper" bind:this={userMenuContainer}>
        <button
          type="button"
          class="user-avatar-chip"
          on:click={() => (isUserMenuOpen = !isUserMenuOpen)}
          title={currentUser ? currentUser.email : 'Account & Navigation Menu'}
        >
          {#if currentUser && currentUser.avatar_url}
            <img src={currentUser.avatar_url} alt={currentUser.name} class="avatar-img" />
          {:else if currentUser && currentUser.name}
            {currentUser.name.slice(0, 2).toUpperCase()}
          {:else}
            GU
          {/if}
          <span class="status-dot-indicator"></span>
        </button>

        {#if isUserMenuOpen}
          <div class="user-dropdown-menu">
            <div class="menu-header">
              <span class="menu-user-name">
                {currentUser ? currentUser.name || currentUser.email : 'Cognifolio Guest'}
              </span>
              <span class="menu-user-role">
                {currentUser?.is_guest
                  ? '⚡ Guest Session'
                  : currentUser
                    ? 'Free Public Beta'
                    : 'Not Signed In'}
              </span>
            </div>
            <div class="menu-divider"></div>

            <!-- Mobile-only navigation items -->
            <div class="mobile-nav-group">
              <button
                class="menu-item-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  handleNavClick('product');
                }}
              >
                Product
              </button>
              <button
                class="menu-item-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  handleNavClick('features');
                }}
              >
                Features
              </button>
              <button
                class="menu-item-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  handleNavClick('workflow');
                }}
              >
                How it works
              </button>
              <button
                class="menu-item-btn highlight-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  handleLaunchStudio();
                }}
              >
                Workspace Studio ↗
              </button>
              {#if showPricing}
                <button
                  class="menu-item-btn"
                  on:click={() => {
                    isUserMenuOpen = false;
                    openPricing();
                  }}
                >
                  Pricing (Free)
                </button>
              {/if}
              <div class="menu-divider"></div>
            </div>

            {#if currentUser && !currentUser.is_guest}
              <button class="menu-item-btn" on:click={handleLogout}>Sign Out</button>
            {:else}
              {#if currentUser?.is_guest}
                <button class="menu-item-btn" on:click={handleLogout}>Reset Guest Session</button>
              {/if}
              <button class="menu-item-btn" on:click={() => openAuth('signin')}
                >Sign In to Save Vault</button
              >
              <button class="menu-item-btn highlight-btn" on:click={() => openAuth('signup')}
                >Create Free Account</button
              >
            {/if}
            <div class="menu-divider"></div>
            <button
              type="button"
              class="menu-item-btn theme-menu-btn"
              on:click={() => {
                theme.toggle();
              }}
            >
              <div class="theme-menu-content">
                <CIcon name={$theme === 'dark' ? 'sun' : 'moon'} size={14} color="currentColor" />
                <span>{$theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </div>
            </button>
            <div class="menu-divider"></div>
            <button class="menu-item-btn" on:click={openSecurityGuide}
              >Zero-Trust Privacy Spec</button
            >
            <button class="menu-item-btn" on:click={openMorrowless}>Morrowless Collective</button>
            {#if currentUser && !currentUser.is_guest && (currentUser.role === 'developer' || currentUser.role === 'admin')}
              <div class="menu-divider"></div>
              <button
                type="button"
                class="menu-item-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  dispatch('openDeveloperAudit');
                }}
              >
                <div style="display: flex; align-items: center; gap: 8px;">
                  <CIcon name="shield" size={13} color="#ca8a04" />
                  <span>Developer Audit Console</span>
                </div>
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .app-unified-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--bg-header);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .header-inner {
    width: min(1320px, calc(100% - clamp(36px, 6vw, 96px)));
    margin: 0 auto;
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  /* Brand */
  .brand {
    cursor: pointer;
    user-select: none;
    outline: none;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-icon-img {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .brand-titles {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    font-weight: 800;
    font-size: 21px;
    letter-spacing: -0.7px;
    color: var(--text-main) !important;
    line-height: 1.1;
  }

  .brand-byline {
    display: block;
    text-align: left;
    font-size: 8.5px;
    letter-spacing: 1.8px;
    color: var(--text-dim);
    margin-top: 2px;
    font-weight: 700;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .brand-byline:hover {
    color: var(--theme-dark);
  }

  /* Center Links */
  .nav-links {
    display: flex;
    align-items: center;
    gap: 26px;
    color: var(--text-muted);
    font-size: 13px;
  }

  .nav-links a {
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s ease;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: var(--theme-dark);
  }

  .nav-text-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s ease;
  }

  .nav-text-btn:hover {
    color: var(--theme-dark);
  }

  .nav-free-badge {
    background: var(--status-amber-bg);
    color: var(--status-amber-text);
    border: 1px solid var(--status-amber-border);
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  /* Right Actions */
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .theme-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }

  .theme-toggle-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--theme-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  .theme-menu-btn {
    width: 100%;
  }

  .theme-menu-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
  }

  .user-menu-wrapper {
    position: relative;
  }

  .user-avatar-chip {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--theme-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
    position: relative;
    transition: all 0.15s ease;
  }

  .user-avatar-chip:hover {
    border-color: var(--theme-dark);
    transform: scale(1.05);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .status-dot-indicator {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--status-emerald-text);
    border: 2px solid var(--bg-card);
  }

  .user-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: var(--shadow-elevated);
    padding: 8px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .menu-header {
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-user-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-user-role {
    font-size: 10px;
    color: var(--text-muted);
  }

  .menu-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 0;
  }

  .menu-item-btn {
    background: transparent;
    border: none;
    text-align: left;
    color: var(--text-muted);
    font-size: 12px;
    padding: 7px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.12s ease,
      color 0.12s ease;
  }

  .menu-item-btn:hover {
    background: var(--bg-card-hover);
    color: var(--text-main);
  }

  .menu-item-btn.highlight-btn {
    color: var(--theme-dark);
    font-weight: 600;
  }

  .header-signin-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-main);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .header-signin-btn:hover {
    border-color: var(--theme-dark);
    color: var(--theme-dark);
    background: rgba(242, 184, 75, 0.08);
  }

  .mobile-nav-group {
    display: none;
    flex-direction: column;
    gap: 3px;
  }

  @media (max-width: 820px) {
    .header-inner {
      width: calc(100% - 24px);
      height: 64px;
    }

    .nav-links {
      display: none;
    }

    .mobile-nav-group {
      display: flex;
    }
  }

  @media (min-width: 1600px) {
    .header-inner {
      width: min(1520px, calc(100% - 64px));
      height: 80px;
    }

    .brand-name {
      font-size: 20px;
    }

    .nav-links a,
    .nav-text-btn {
      font-size: 14px;
    }
  }
</style>
