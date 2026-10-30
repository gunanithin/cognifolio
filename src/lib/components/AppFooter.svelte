<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function openMorrowless() {
    dispatch('openMorrowless');
  }

  function openTerms() {
    dispatch('openTerms');
  }

  function openPricing() {
    dispatch('openPricing');
  }

  function openSecurityGuide() {
    dispatch('openSecurityGuide');
  }
</script>

<footer class="app-unified-footer">
  <div class="footer-inner">
    <div class="footer-left">
      <div class="footer-brand-lockup">
        <img src="/app-icon.png" alt="Cognifolio" class="footer-logo-img" />
        <span class="footer-brand">Cognifolio</span>
      </div>
      <span class="footer-dot">•</span>
      <button
        type="button"
        class="footer-org-link"
        on:click={openMorrowless}
        title="Click to view official Morrowless license"
      >
        An Independent Collective Product by <strong>MORROWLESS</strong>
      </button>
    </div>
    <div class="footer-right">
      <span class="footer-contact-group">
        <span class="footer-contact-label">Contact us:</span>
        <a
          href="mailto:contact@morrowless.io"
          class="footer-contact-link"
          title="Contact Morrowless at contact@morrowless.io"
        >
          <strong>contact@morrowless.io</strong>
        </a>
      </span>
      <span class="footer-dot">•</span>
      <button
        type="button"
        class="footer-license-btn"
        on:click={openTerms}
        title="View Terms of Service & Legal Notice"
      >
        Terms
      </button>
      <span class="footer-dot">•</span>
      <button
        type="button"
        class="footer-license-btn"
        on:click={openSecurityGuide}
        title="Read Document Security & Protection Policy"
      >
        Security &amp; Protection Policy
      </button>
    </div>
  </div>
</footer>

<style>
  .app-unified-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 90;
    border-top: 1px solid var(--border-color);
    background: var(--bg-footer);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    padding: 10px 24px calc(10px + env(safe-area-inset-bottom, 0px)) 24px;
    font-size: 0.78rem;
    color: var(--text-dim);
    box-shadow: var(--shadow-card);
    width: 100%;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .footer-inner {
    width: min(1320px, calc(100% - clamp(36px, 6vw, 96px)));
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .footer-brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .footer-logo-img {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    object-fit: cover;
    display: inline-block;
    vertical-align: middle;
  }

  .footer-brand {
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--text-main);
    letter-spacing: -0.01em;
  }

  .footer-dot {
    color: var(--border-dark);
    user-select: none;
  }

  .footer-org-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s ease;
    text-align: left;
  }

  .footer-org-link strong {
    color: var(--text-main);
    letter-spacing: 0.06em;
  }

  .footer-org-link:hover {
    color: var(--theme-dark);
    text-decoration: underline;
  }

  .footer-contact-group {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.76rem;
  }

  .footer-contact-label {
    color: var(--text-dim);
    font-size: 0.74rem;
  }

  .footer-contact-link {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--text-main);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-contact-link strong {
    font-weight: 600;
  }

  .footer-contact-link:hover {
    color: var(--theme-dark);
    text-decoration: underline;
  }

  .footer-license-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 3px 9px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .footer-license-btn:hover {
    background: var(--bg-card-hover);
    color: var(--text-main);
    border-color: var(--theme-dark);
  }

  /* Responsive Multi-Screen Rules */

  /* Tablets and Smaller Laptops (769px to 1024px) */
  @media (max-width: 1024px) {
    .footer-inner {
      width: calc(100% - 32px);
      gap: 12px;
    }
  }

  /* Tablets & Phablets (max 768px) */
  @media (max-width: 768px) {
    .app-unified-footer {
      padding: 9px 16px calc(9px + env(safe-area-inset-bottom, 0px)) 16px;
    }

    .footer-inner {
      width: 100%;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-align: center;
    }

    .footer-left,
    .footer-right {
      justify-content: center;
      gap: 8px;
      font-size: 0.75rem;
    }

    .footer-license-btn {
      padding: 4px 10px;
      min-height: 28px;
    }
  }

  /* Compact Mobile Phones (max 480px) */
  @media (max-width: 480px) {
    .app-unified-footer {
      padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px;
    }

    .footer-inner {
      gap: 6px;
    }

    .footer-left {
      gap: 6px;
      font-size: 0.72rem;
    }

    .footer-org-link {
      font-size: 0.72rem;
    }

    /* Hide middle dot separators on narrow mobile to prevent line-wrapping artifacts */
    .footer-dot {
      display: none;
    }

    .footer-right {
      gap: 6px 10px;
      font-size: 0.72rem;
    }

    .footer-contact-group {
      font-size: 0.72rem;
    }

    .footer-license-btn {
      padding: 4px 8px;
      font-size: 0.7rem;
    }
  }

  /* 32-inch and Ultra-Wide Screens (min 1600px) */
  @media (min-width: 1600px) {
    .app-unified-footer {
      padding: 12px 32px calc(12px + env(safe-area-inset-bottom, 0px)) 32px;
    }

    .footer-inner {
      width: min(1520px, calc(100% - 64px));
    }

    .footer-brand {
      font-size: 0.96rem;
    }

    .footer-org-link,
    .footer-contact-link,
    .footer-license-btn {
      font-size: 0.8rem;
    }
  }
</style>
