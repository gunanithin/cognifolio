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
      <img src="/app-icon.png" alt="Cognifolio" class="footer-logo-img" />
      <span class="footer-brand">Cognifolio</span>
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
    border-top: 1px solid #25282e;
    background: rgba(8, 9, 11, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 9px 24px calc(9px + env(safe-area-inset-bottom, 0px)) 24px;
    font-size: 0.78rem;
    color: #71717a;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.02);
  }

  .footer-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .footer-left,
  .footer-right {
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
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
    color: #f6f6f6;
  }

  .footer-dot {
    color: #3b3f49;
  }

  .footer-org-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    color: #9da2ab;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .footer-org-link strong {
    color: #f6f6f6;
    letter-spacing: 0.06em;
  }

  .footer-org-link:hover {
    color: #ffffff;
    text-decoration: underline;
  }

  .footer-contact-group {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.76rem;
  }

  .footer-contact-label {
    color: #71717a;
    font-size: 0.74rem;
  }

  .footer-contact-link {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: #f6f6f6;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-contact-link strong {
    font-weight: 600;
  }

  .footer-contact-link:hover {
    color: #f2b84b;
    text-decoration: underline;
  }

  .footer-license-btn {
    background: #14171d;
    border: 1px solid #2b2e35;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 500;
    color: #8a8f98;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .footer-license-btn:hover {
    background: #20242e;
    color: #ffffff;
    border-color: #3b3f49;
  }

  @media (max-width: 768px) {
    .app-unified-footer {
      padding: 8px 16px;
    }
    .footer-inner {
      justify-content: space-between;
    }
  }
</style>
