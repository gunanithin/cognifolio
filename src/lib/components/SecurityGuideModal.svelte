<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import CIcon from '../icons/CIcon.svelte';

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      close();
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if isOpen}
  <div
    class="security-backdrop"
    transition:fade={{ duration: 160 }}
    on:click={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
    role="button"
    tabindex="0"
    aria-label="Close security guide modal"
  >
    <div
      class="security-modal-card"
      transition:scale={{ start: 0.97, duration: 180 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Document Protection & Security Policy"
    >
      <!-- Prominent Top Close Button -->
      <button class="modal-close-btn" on:click={close} aria-label="Close security guide modal">
        <CIcon name="close" size={16} />
      </button>

      <!-- Pinned Modal Header -->
      <div class="modal-header">
        <div class="header-badge">
          <CIcon name="shield" size={13} />
          <span>ZERO-TRUST PROTECTION GUARANTEE</span>
        </div>
        <h2 class="header-title">Your Documents Are Safe With Us</h2>
        <p class="header-subtitle">
          Cognifolio is engineered for sensitive contracts, financials, and legal audits. Your
          documents are <strong>never stolen, never sold, and never used to train AI models</strong
          >.
        </p>
      </div>

      <!-- Scrollable Modal Content Body -->
      <div class="modal-body">
        <div class="pillars-grid">
          <!-- Pillar 1 -->
          <div class="pillar-card">
            <div class="pillar-num">01</div>
            <div class="pillar-content">
              <h4>Zero AI Model Training</h4>
              <p>
                We use enterprise Google Cloud Gemini APIs under strict non-training terms. Your
                files, prompts, and intelligence extracts are <strong
                  >never stored to train public AI models</strong
                >.
              </p>
            </div>
          </div>

          <!-- Pillar 2 -->
          <div class="pillar-card highlight-card">
            <div class="pillar-num num-gold">02</div>
            <div class="pillar-content">
              <h4>Pre-AI PII Redaction</h4>
              <p>
                Sensitive identifiers (Aadhaar, PAN, SSN, debit/credit cards, bank accounts) are
                <strong>permanently masked locally</strong> before any data is sent for AI analysis.
              </p>
            </div>
          </div>

          <!-- Pillar 3 -->
          <div class="pillar-card">
            <div class="pillar-num">03</div>
            <div class="pillar-content">
              <h4>Single-Tenant Session Isolation</h4>
              <p>
                Every uploaded document, text index, and Qdrant vector embedding is
                cryptographically scoped to your authenticated user account. Cross-tenant leakage is
                strictly impossible.
              </p>
            </div>
          </div>

          <!-- Pillar 4 -->
          <div class="pillar-card">
            <div class="pillar-num">04</div>
            <div class="pillar-content">
              <h4>1-Click Cryptographic Shredding</h4>
              <p>
                When you delete a document, raw files, database records, and vector embeddings are
                <strong>permanently expunged immediately</strong>. No hidden backups or ghost copies
                remain.
              </p>
            </div>
          </div>
        </div>

        <!-- Inline Security Specs Bar -->
        <div class="specs-bar">
          <div class="spec-item">
            <span class="spec-label">Max File Size:</span>
            <span class="spec-value">50 MB</span>
          </div>
          <div class="spec-divider"></div>
          <div class="spec-item">
            <span class="spec-label">Encryption:</span>
            <span class="spec-value">TLS 1.3 &bull; AES-256</span>
          </div>
          <div class="spec-divider"></div>
          <div class="spec-item">
            <span class="spec-label">Data Retention:</span>
            <span class="spec-value">30, 90, or 365 Days</span>
          </div>
          <div class="spec-divider"></div>
          <div class="spec-item">
            <span class="spec-label">Ownership:</span>
            <span class="spec-value">100% Customer IP</span>
          </div>
        </div>
      </div>

      <!-- Pinned Modal Footer Action Bar (Always Visible on Mobile) -->
      <div class="modal-footer">
        <div class="footer-left">
          <span class="security-contact-hint">
            Questions?
            <a
              href="mailto:contact@morrowless.io?subject=Cognifolio%20Security%20Inquiry"
              class="security-contact-link"
            >
              contact@morrowless.io
            </a>
          </span>
        </div>
        <div class="footer-right">
          <button type="button" class="btn-enter" on:click={close}>
            <CIcon name="check" size={15} />
            <span>Got It &bull; Close Guide</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .security-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(10, 10, 10, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    cursor: default;
    overflow-y: auto;
  }

  .security-modal-card {
    position: relative;
    width: 100%;
    max-width: 680px;
    max-height: min(88vh, 88dvh);
    background: #121419;
    border: 1px solid #2b2e35;
    border-radius: 14px;
    box-shadow:
      0 24px 60px -10px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    cursor: default;
    color: #f6f6f6;
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    outline: none;
  }

  .modal-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 38px;
    height: 38px;
    min-width: 38px;
    min-height: 38px;
    border-radius: 8px;
    background: #1a1e27;
    border: 1px solid #363b47;
    color: #b4b8c0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease-out;
    z-index: 30;
  }

  .modal-close-btn:hover,
  .modal-close-btn:active {
    background: #272d3b;
    color: #ffffff;
    border-color: #f2b84b;
    transform: scale(1.05);
  }

  /* Header */
  .modal-header {
    background: #14171d;
    border-bottom: 1px solid #2b2e35;
    padding: 1.5rem 1.75rem 1.25rem 1.75rem;
    padding-right: 4rem;
    flex-shrink: 0;
    position: relative;
  }

  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.2rem 0.65rem;
    background: #261c0e;
    border: 1px solid #5a4524;
    color: #f2b84b;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    border-radius: 999px;
    margin-bottom: 0.65rem;
  }

  .header-title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.55rem;
    font-weight: 700;
    color: #f6f6f6;
    margin: 0 0 0.35rem 0;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .header-subtitle {
    font-size: 0.88rem;
    color: #b4b8c0;
    line-height: 1.45;
    margin: 0;
    max-width: 540px;
  }

  .header-subtitle strong {
    color: #f6f6f6;
  }

  /* Scrollable Body */
  .modal-body {
    padding: 1.25rem 1.75rem 1.5rem 1.75rem;
    background: #121419;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;
    min-height: 0;
  }

  .pillars-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.85rem;
  }

  .pillar-card {
    display: flex;
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    background: #14171d;
    border: 1px solid #2b2e35;
    border-radius: 8px;
    transition: border-color 0.15s ease-out;
  }

  .pillar-card:hover {
    border-color: #f2b84b;
  }

  .pillar-card.highlight-card {
    background: #1a1812;
    border-color: #f2b84b;
  }

  .pillar-num {
    font-family: var(--font-mono, monospace);
    font-size: 0.74rem;
    font-weight: 700;
    color: #9da2ab;
    line-height: 1;
    padding-top: 2px;
    letter-spacing: 0.05em;
  }

  .pillar-num.num-gold {
    color: #f2b84b;
  }

  .pillar-content {
    flex: 1;
  }

  .pillar-content h4 {
    margin: 0 0 0.3rem 0;
    font-size: 0.88rem;
    font-weight: 700;
    color: #f6f6f6;
    line-height: 1.3;
  }

  .pillar-content p {
    margin: 0;
    font-size: 0.78rem;
    color: #b4b8c0;
    line-height: 1.45;
  }

  .pillar-content p strong {
    color: #f6f6f6;
  }

  /* Specs Bar */
  .specs-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #14171d;
    border: 1px solid #2b2e35;
    border-radius: 6px;
    padding: 0.65rem 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .spec-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.74rem;
  }

  .spec-label {
    color: #9da2ab;
  }

  .spec-value {
    color: #f6f6f6;
    font-weight: 600;
    font-family: var(--font-mono, monospace);
  }

  .spec-divider {
    width: 1px;
    height: 16px;
    background: #2b2e35;
  }

  /* Pinned Footer Action Bar */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.75rem;
    background: #14171d;
    border-top: 1px solid #2b2e35;
    gap: 1rem;
    flex-shrink: 0;
  }

  .footer-left {
    display: flex;
    align-items: center;
  }

  .footer-right {
    display: flex;
    align-items: center;
  }

  .security-contact-hint {
    font-size: 0.78rem;
    color: #9da2ab;
  }

  .security-contact-link {
    color: #f2b84b;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .btn-enter {
    background: #f2b84b;
    color: #08090b;
    font-size: 0.84rem;
    font-weight: 700;
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    border: 1px solid #f2b84b;
    cursor: pointer;
    transition: all 0.15s ease-out;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    box-shadow: 0 2px 10px rgba(242, 184, 75, 0.2);
  }

  .btn-enter:hover,
  .btn-enter:active {
    background: #e5ab3e;
    border-color: #e5ab3e;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(242, 184, 75, 0.35);
  }

  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .security-backdrop {
      padding: 10px;
      align-items: flex-end;
    }

    .security-modal-card {
      max-height: min(92vh, 92dvh);
      border-radius: 12px;
    }

    .modal-header {
      padding: 1.15rem 1rem 0.9rem 1rem;
      padding-right: 3.5rem;
    }

    .header-title {
      font-size: 1.25rem;
    }

    .header-subtitle {
      font-size: 0.8rem;
    }

    .modal-close-btn {
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
    }

    .modal-body {
      padding: 0.9rem 1rem;
    }

    .pillars-grid {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }

    .pillar-card {
      padding: 0.85rem;
    }

    .specs-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.65rem 0.85rem;
    }

    .spec-divider {
      display: none;
    }

    .modal-footer {
      flex-direction: column-reverse;
      align-items: stretch;
      padding: 0.85rem 1rem;
      gap: 0.65rem;
    }

    .footer-left {
      justify-content: center;
      text-align: center;
    }

    .footer-right {
      width: 100%;
    }

    .btn-enter {
      width: 100%;
      min-height: 44px;
      font-size: 0.88rem;
    }
  }
</style>
