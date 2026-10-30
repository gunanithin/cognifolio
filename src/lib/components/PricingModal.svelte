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
    class="pricing-backdrop"
    transition:fade={{ duration: 160 }}
    on:click={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
    role="button"
    tabindex="0"
    aria-label="Close pricing modal"
  >
    <div
      class="pricing-modal-card"
      transition:scale={{ start: 0.97, duration: 180 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Morrowless Commercial Plans and Pricing"
    >
      <!-- Top Close Button -->
      <button class="modal-close-btn" on:click={close} aria-label="Close modal">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-badge">
          <CIcon name="sparkle" size={13} />
          <span>COMMERCIAL EDITIONS &bull; EARLY ACCESS</span>
        </div>
        <h2 class="header-title">Transparent Pricing for Growing Teams</h2>
        <p class="header-subtitle">
          Enterprise document intelligence with Zero-Trust privacy. We are currently in
          <strong>Public Early Access</strong>—all Pro features are
          <strong>100% free with no credit card required</strong>.
        </p>

        <!-- Early Access Active Reassurance Banner -->
        <div class="early-access-banner">
          <div class="ea-left">
            <span class="ea-pill">ACTIVE PASS</span>
            <span class="ea-text">
              <strong>All features are currently unlocked.</strong> Enjoy unlimited 50MB intake, local
              PII redaction, multimodal Gemini extraction, and redline compare at $0.
            </span>
          </div>
          <span class="ea-tag">$0 / month today</span>
        </div>
      </div>

      <!-- Pricing Cards Grid -->
      <div class="modal-body">
        <div class="pricing-grid">
          <!-- Tier 1: Free Starter -->
          <div class="pricing-card">
            <div class="card-header">
              <span class="tier-name">Starter</span>
              <div class="price-wrap">
                <span class="currency">$</span>
                <span class="amount">0</span>
                <span class="period">/ month</span>
              </div>
              <p class="tier-desc">
                For individual analysts, researchers, and quick document inspections.
              </p>
            </div>

            <div class="status-btn current-tier">
              <span>Current Free Tier</span>
            </div>

            <ul class="feature-list">
              <li>
                <CIcon name="check" size={14} />
                <span>Up to <strong>50 MB</strong> per file</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>PDF, Office (Word, Excel), Images, Text</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Pre-AI PII Privacy Shield</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Multimodal Gemini 2.5 Summaries</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Qdrant 768-D Vector Search</span>
              </li>
            </ul>
          </div>

          <!-- Tier 2: Professional -->
          <div class="pricing-card highlight-tier">
            <div class="tier-ribbon">UNLOCKED IN BETA</div>
            <div class="card-header">
              <span class="tier-name">Professional</span>
              <div class="price-wrap">
                <span class="currency">$</span>
                <span class="amount">19</span>
                <span class="period">/ month</span>
              </div>
              <p class="tier-desc">
                For lawyers, finance leads, and power users auditing high-value records.
              </p>
            </div>

            <div class="status-btn unlocked-beta">
              <span>Included Free in Early Access</span>
            </div>

            <ul class="feature-list">
              <li>
                <CIcon name="check" size={14} />
                <span><strong>Everything in Starter</strong></span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>High-resolution redacted file export</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>AI Redline Clause & Discrepancy Compare</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Automated 30/90/365d retention shredding</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Priority email support & feature requests</span>
              </li>
            </ul>
          </div>

          <!-- Tier 3: Team & Compliance -->
          <div class="pricing-card">
            <div class="tier-ribbon ribbon-upcoming">UPCOMING</div>
            <div class="card-header">
              <span class="tier-name">Team Vault</span>
              <div class="price-wrap">
                <span class="currency">$</span>
                <span class="amount">49</span>
                <span class="period">/ seat / mo</span>
              </div>
              <p class="tier-desc">
                For legal departments, accounting firms, and compliance teams.
              </p>
            </div>

            <div class="status-btn coming-soon">
              <span>Coming Soon in Q1</span>
            </div>

            <ul class="feature-list">
              <li>
                <CIcon name="check" size={14} />
                <span><strong>Everything in Professional</strong></span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Shared organizational team workspaces</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Role-based access (Admin, Auditor, Reviewer)</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Exportable legal audit certificates</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Centralized team billing & seat pooling</span>
              </li>
            </ul>
          </div>

          <!-- Tier 4: Enterprise -->
          <div class="pricing-card">
            <div class="card-header">
              <span class="tier-name">Enterprise & VPC</span>
              <div class="price-wrap">
                <span class="amount custom-amount">Custom</span>
              </div>
              <p class="tier-desc">
                For banks, healthcare networks, and defense contractors requiring private hosting.
              </p>
            </div>

            <a
              href="mailto:contact@morrowless.io?subject=Morrowless%20Enterprise%20Inquiry"
              class="status-btn contact-btn"
            >
              <span>Contact Sales &rarr;</span>
            </a>

            <ul class="feature-list">
              <li>
                <CIcon name="check" size={14} />
                <span>SAML 2.0 / Okta / Azure AD Single Sign-On</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Private Cloudflare Tunnel / VPC hosting</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>SOC 2 Type II compliance DPA</span>
              </li>
              <li>
                <CIcon name="check" size={14} />
                <span>Dedicated Account Manager & 99.9% SLA</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <div class="footer-left">
          <span class="footer-hint">
            Need high-volume programmatic batch API processing?
            <a href="mailto:contact@morrowless.io?subject=API%20Inquiry" class="contact-link">
              contact@morrowless.io
            </a>
          </span>
        </div>
        <div class="footer-right">
          <button type="button" class="btn-continue" on:click={close}>
            Continue with Free Early Access
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .pricing-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(10, 10, 10, 0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    cursor: default;
  }

  .pricing-modal-card {
    position: relative;
    width: 100%;
    max-width: 960px;
    max-height: 92vh;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    cursor: default;
    color: var(--text-main);
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  }

  .modal-close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease-out;
    z-index: 10;
  }

  .modal-close-btn:hover {
    background: var(--bg-card-hover);
    color: var(--text-main);
    border-color: var(--theme-dark);
  }

  /* Header */
  .modal-header {
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-color);
    padding: 1.75rem 2rem 1.25rem 2rem;
  }

  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.2rem 0.65rem;
    background: var(--status-amber-bg);
    border: 1px solid var(--status-amber-border);
    color: var(--status-amber-text);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    border-radius: 999px;
    margin-bottom: 0.65rem;
  }

  .header-title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0 0 0.35rem 0;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .header-subtitle {
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.45;
    margin: 0 0 1rem 0;
    max-width: 680px;
  }

  .header-subtitle strong {
    color: var(--text-main);
  }

  /* Early Access Active Banner */
  .early-access-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--status-emerald-bg);
    border: 1px solid var(--status-emerald-border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    gap: 1rem;
  }

  .ea-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .ea-pill {
    font-size: 0.65rem;
    font-weight: 800;
    background: #1e5a40;
    color: #67d8a2;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .ea-text {
    font-size: 0.8rem;
    color: #67d8a2;
    line-height: 1.4;
  }

  .ea-tag {
    font-size: 0.8rem;
    font-weight: 700;
    color: #67d8a2;
    font-family: var(--font-mono, monospace);
    white-space: nowrap;
  }

  /* Body */
  .modal-body {
    padding: 1.5rem 2rem;
    background: var(--bg-card);
    overflow-y: auto;
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .pricing-card {
    position: relative;
    background: var(--bg-subtle);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.25rem 1.15rem;
    display: flex;
    flex-direction: column;
    transition: all 0.15s ease-out;
  }

  .pricing-card:hover {
    border-color: #f2b84b;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .pricing-card.highlight-tier {
    background: #1a1812;
    border-color: #f2b84b;
    box-shadow: 0 4px 20px rgba(242, 184, 75, 0.12);
  }

  .tier-ribbon {
    position: absolute;
    top: -10px;
    right: 12px;
    font-size: 0.62rem;
    font-weight: 800;
    padding: 2px 8px;
    background: #f2b84b;
    color: #08090b;
    border-radius: 999px;
    letter-spacing: 0.06em;
  }

  .tier-ribbon.ribbon-upcoming {
    background: var(--bg-subtle);
    color: var(--text-muted);
  }

  .card-header {
    margin-bottom: 1rem;
  }

  .tier-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
    display: block;
    margin-bottom: 0.5rem;
  }

  .price-wrap {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin-bottom: 0.5rem;
  }

  .currency {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f2b84b;
  }

  .amount {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 2.1rem;
    font-weight: 700;
    color: var(--text-main);
    line-height: 1;
  }

  .custom-amount {
    font-size: 1.6rem;
  }

  .period {
    font-size: 0.74rem;
    color: var(--text-muted);
    margin-left: 2px;
  }

  .tier-desc {
    font-size: 0.74rem;
    color: var(--text-muted);
    line-height: 1.4;
    margin: 0;
    min-height: 34px;
  }

  /* Status Buttons */
  .status-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 1.25rem;
    text-decoration: none;
  }

  .current-tier {
    background: var(--bg-card);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
  }

  .unlocked-beta {
    background: var(--status-amber-bg);
    color: var(--status-amber-text);
    border: 1px solid var(--status-amber-border);
  }

  .coming-soon {
    background: var(--bg-subtle);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
  }

  .contact-btn {
    background: #f2b84b;
    color: #08090b;
    border: 1px solid #f2b84b;
    font-weight: 700;
    transition: all 0.15s ease-out;
  }

  .contact-btn:hover {
    background: #e5ab3e;
    border-color: #e5ab3e;
  }

  /* Feature List */
  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    font-size: 0.74rem;
    color: var(--text-muted);
  }

  .feature-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    line-height: 1.4;
  }

  .feature-list li strong {
    color: var(--text-main);
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 2rem;
    background: var(--bg-subtle);
    border-top: 1px solid var(--border-color);
    gap: 1rem;
    flex-wrap: wrap;
  }

  .footer-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .contact-link {
    color: #f2b84b;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .btn-continue {
    background: #f2b84b;
    color: #08090b;
    font-size: 0.82rem;
    font-weight: 700;
    padding: 0.55rem 1.25rem;
    border-radius: 6px;
    border: 1px solid #f2b84b;
    cursor: pointer;
    transition: all 0.15s ease-out;
  }

  .btn-continue:hover {
    background: #e5ab3e;
    border-color: #e5ab3e;
  }

  @media (max-width: 900px) {
    .pricing-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .pricing-grid {
      grid-template-columns: 1fr;
    }
    .early-access-banner {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .modal-header,
    .modal-body,
    .modal-footer {
      padding-left: 1.25rem;
      padding-right: 1.25rem;
    }
  }
</style>
