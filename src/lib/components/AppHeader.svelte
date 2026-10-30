<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let currentUser = null;
  export let activeTab = 'portal';

  const dispatch = createEventDispatcher();
  let isUserMenuOpen = false;

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

<header class="app-unified-header">
  <div class="header-inner">
    <!-- Brand Lockup -->
    <div
      class="brand"
      role="button"
      tabindex="0"
      on:click={handleLogoClick}
      on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogoClick()}
      title="Cognifolio by Morrowless — Return to Overview"
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
      <button type="button" class="nav-text-btn" on:click={openPricing}>
        Pricing <span class="nav-free-badge">Free</span>
      </button>
    </nav>

    <!-- Right Actions -->
    <div class="nav-actions">
      {#if !currentUser}
        <button type="button" class="header-signin-btn" on:click={() => openAuth('signin')}>
          Sign In
        </button>
      {/if}

      <!-- User Avatar Chip & Session Menu -->
      <div class="user-menu-wrapper">
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
              <button
                class="menu-item-btn"
                on:click={() => {
                  isUserMenuOpen = false;
                  openPricing();
                }}
              >
                Pricing (Free)
              </button>
              <div class="menu-divider"></div>
            </div>

            {#if currentUser && !currentUser.is_guest}
              <button class="menu-item-btn" on:click={handleLogout}>Sign Out</button>
            {:else}
              <button class="menu-item-btn" on:click={() => openAuth('signin')}
                >Sign In to Save Vault</button
              >
              <button class="menu-item-btn highlight-btn" on:click={() => openAuth('signup')}
                >Create Free Account</button
              >
            {/if}
            <div class="menu-divider"></div>
            <button class="menu-item-btn" on:click={openSecurityGuide}
              >Zero-Trust Privacy Spec</button
            >
            <button class="menu-item-btn" on:click={openMorrowless}>Morrowless Collective</button>
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
    background: rgba(8, 9, 11, 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid #272a30;
    width: 100%;
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
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
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
    color: #f6f6f6 !important;
    line-height: 1.1;
  }

  .brand-byline {
    display: block;
    text-align: left;
    font-size: 8.5px;
    letter-spacing: 1.8px;
    color: #9da2ab;
    margin-top: 2px;
    font-weight: 700;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .brand-byline:hover {
    color: #f2b84b;
  }

  /* Center Links */
  .nav-links {
    display: flex;
    align-items: center;
    gap: 26px;
    color: #c4c6cc;
    font-size: 13px;
  }

  .nav-links a {
    color: #c4c6cc;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s ease;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: #f2b84b;
  }

  .nav-text-btn {
    background: transparent;
    border: none;
    color: #c4c6cc;
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
    color: #f2b84b;
  }

  .nav-free-badge {
    background: #2b2210;
    color: #f2b84b;
    border: 1px solid #5a4524;
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
    gap: 14px;
  }

  .user-menu-wrapper {
    position: relative;
  }

  .user-avatar-chip {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #1e222b;
    border: 1px solid #3c424e;
    color: #f2b84b;
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
    border-color: #f2b84b;
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
    background: #67d8a2;
    border: 2px solid #08090b;
  }

  .user-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: #121419;
    border: 1px solid #2b2e35;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
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
    color: #f6f6f6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-user-role {
    font-size: 10px;
    color: #9da2ab;
  }

  .menu-divider {
    height: 1px;
    background: #272a30;
    margin: 4px 0;
  }

  .menu-item-btn {
    background: transparent;
    border: none;
    text-align: left;
    color: #c4c6cc;
    font-size: 12px;
    padding: 7px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.12s ease,
      color 0.12s ease;
  }

  .menu-item-btn:hover {
    background: #181b23;
    color: #f6f6f6;
  }

  .menu-item-btn.highlight-btn {
    color: #f2b84b;
    font-weight: 600;
  }

  .header-signin-btn {
    background: transparent;
    border: 1px solid #3b3f49;
    color: #f6f6f6;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .header-signin-btn:hover {
    border-color: #f2b84b;
    color: #f2b84b;
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
