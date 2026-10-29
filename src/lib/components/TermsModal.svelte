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
    class="terms-backdrop"
    transition:fade={{ duration: 160 }}
    on:click={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
    role="button"
    tabindex="0"
    aria-label="Close terms modal"
  >
    <div
      class="terms-modal-card"
      transition:scale={{ start: 0.97, duration: 180 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Cognifolio Terms of Service"
    >
      <!-- Top Close Button -->
      <button class="modal-close-btn" on:click={close} aria-label="Close modal">
        <CIcon name="close" size={16} />
      </button>

      <!-- Header Section -->
      <div class="terms-header">
        <div class="terms-pill">
          <CIcon name="shield" size={13} />
          <span>LEGAL &amp; PLATFORM POLICY</span>
        </div>
        <h2 class="terms-title">Cognifolio Terms of Service</h2>
        <p class="terms-subtitle">
          Essential commitments regarding data sovereignty, zero-training artificial intelligence,
          corporate due diligence, and cryptographic erasure on the Cognifolio platform.
        </p>
        <div class="terms-meta-row">
          <span class="meta-item">Effective: <strong>October 2026</strong></span>
          <span class="meta-dot">•</span>
          <span class="meta-item">Version: <strong>2.4 Enterprise</strong></span>
          <span class="meta-dot">•</span>
          <span class="meta-item">Data Sovereignty: <strong>100% User Owned</strong></span>
        </div>
      </div>

      <!-- Scrollable Policy Body -->
      <div class="terms-scroll-body">
        <!-- Section 1 -->
        <div class="terms-section">
          <div class="section-tag">
            <span class="section-num">01</span>
            <span class="section-heading">Document Ownership &amp; Data Sovereignty</span>
          </div>
          <p class="section-text">
            You retain <strong>100% intellectual property, legal ownership, and copyright</strong> over
            all documents, contracts, spreadsheets, scans, and financial models ingested into Cognifolio.
            Uploading files into your workspace does not grant Cognifolio, Morrowless, or any third party
            any license, title, or commercial rights to your proprietary content.
          </p>
          <div class="terms-callout">
            <CIcon name="check" size={15} />
            <span
              >Your files, redlines, and generated intelligence remain strictly private to your
              account.</span
            >
          </div>
        </div>

        <!-- Section 2 -->
        <div class="terms-section">
          <div class="section-tag">
            <span class="section-num">02</span>
            <span class="section-heading">Zero-Training AI Guarantee</span>
          </div>
          <p class="section-text">
            Cognifolio operates under an inviolable <strong>zero-training AI policy</strong>.
            Content analyzed by our multimodal neural extractors, OCR bounding box aligners, and
            vector embeddings is never used to train, retrain, fine-tune, or benchmark public or
            foundational AI models.
          </p>
          <ul class="section-bullets">
            <li>Enterprise Gemini LLM endpoints operate under strict non-retention agreements.</li>
            <li>In-memory semantic context and chat sessions are isolated per workspace.</li>
            <li>Vector embeddings in Qdrant are securely partitioned and never aggregated.</li>
          </ul>
        </div>

        <!-- Section 3 -->
        <div class="terms-section">
          <div class="section-tag">
            <span class="section-num">03</span>
            <span class="section-heading">Permitted Auditing &amp; Acceptable Use</span>
          </div>
          <p class="section-text">
            Cognifolio is engineered specifically for financial intelligence, due diligence, legal
            audits, and contract comparisons. By using the service, you affirm that:
          </p>
          <ul class="section-bullets">
            <li>
              You hold lawful rights or enterprise authorization to inspect all submitted records.
            </li>
            <li>You will not upload malicious files, exploits, or unlawful content.</li>
            <li>
              You will not attempt to bypass zero-trust PII sanitization filters or security
              controls.
            </li>
          </ul>
        </div>

        <!-- Section 4 -->
        <div class="terms-section">
          <div class="section-tag">
            <span class="section-num">04</span>
            <span class="section-heading"
              >Data Retention &amp; Permanent Erasure (GDPR Art. 17)</span
            >
          </div>
          <p class="section-text">
            You retain sovereign control over data retention. Workspaces may be configured with
            automated retention expiries (1-day, 7-day, 30-day, or custom). Triggering <em
              >Purge Workspace</em
            > permanently and irreversibly destroys all original files, OCR layers, redacted caches, and
            vector embeddings from our servers.
          </p>
        </div>

        <!-- Section 5 -->
        <div class="terms-section">
          <div class="section-tag">
            <span class="section-num">05</span>
            <span class="section-heading">Professional Verification &amp; Advisory Notice</span>
          </div>
          <p class="section-text">
            Cognifolio delivers state-of-the-art document intelligence to accelerate diligence and
            audits. AI-extracted key takeaways, financial amounts, and redline diffs are
            decision-support aids and should be reviewed alongside qualified legal and financial
            counsel before concluding binding agreements.
          </p>
        </div>
      </div>

      <!-- Footer Tray -->
      <div class="terms-modal-footer">
        <div class="footer-legal-copy">
          Legal inquiries: <a href="mailto:contact@morrowless.io" class="legal-mail"
            >contact@morrowless.io</a
          >
        </div>
        <button type="button" class="btn-agree" on:click={close}> Understood &amp; Accept </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .terms-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .terms-modal-card {
    position: relative;
    width: 100%;
    max-width: 720px;
    max-height: 88vh;
    background: #0c0d11;
    border: 1px solid #272a30;
    border-radius: 12px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #f6f6f6;
    outline: none;
  }

  .modal-close-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #9da2ab;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    z-index: 10;
  }

  .modal-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Header */
  .terms-header {
    padding: 28px 32px 20px;
    border-bottom: 1px solid #1e2026;
    background: linear-gradient(180deg, rgba(20, 22, 28, 0.6) 0%, rgba(12, 13, 17, 0) 100%);
  }

  .terms-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(242, 184, 75, 0.1);
    border: 1px solid rgba(242, 184, 75, 0.25);
    color: #f2b84b;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    font-family: var(--font-mono);
    margin-bottom: 12px;
  }

  .terms-title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.65rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .terms-subtitle {
    font-size: 0.86rem;
    color: #9da2ab;
    line-height: 1.5;
    margin: 0 0 14px;
    max-width: 620px;
  }

  .terms-meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.74rem;
    color: #717682;
    font-family: var(--font-mono);
    flex-wrap: wrap;
  }

  .terms-meta-row strong {
    color: #cccccc;
  }

  .meta-dot {
    color: #3b3f49;
  }

  /* Scrollable Body */
  .terms-scroll-body {
    padding: 24px 32px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    scrollbar-width: thin;
    scrollbar-color: #272a30 transparent;
  }

  .terms-scroll-body::-webkit-scrollbar {
    width: 6px;
  }

  .terms-scroll-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .terms-scroll-body::-webkit-scrollbar-thumb {
    background: #272a30;
    border-radius: 3px;
  }

  .terms-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-tag {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-num {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: #f2b84b;
    background: rgba(242, 184, 75, 0.08);
    border: 1px solid rgba(242, 184, 75, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .section-heading {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.05rem;
    font-weight: 600;
    color: #eeeeee;
  }

  .section-text {
    font-size: 0.84rem;
    line-height: 1.6;
    color: #a0a5af;
    margin: 0;
  }

  .section-text strong {
    color: #f6f6f6;
  }

  .section-text em {
    color: #f2b84b;
    font-style: normal;
  }

  .terms-callout {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(16, 185, 129, 0.07);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    font-size: 0.78rem;
    margin-top: 4px;
  }

  .section-bullets {
    margin: 4px 0 0;
    padding-left: 20px;
    color: #8f95a0;
    font-size: 0.82rem;
    line-height: 1.6;
  }

  .section-bullets li {
    margin-bottom: 4px;
  }

  /* Footer */
  .terms-modal-footer {
    padding: 16px 32px;
    background: #090a0d;
    border-top: 1px solid #1e2026;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .footer-legal-copy {
    font-size: 0.78rem;
    color: #717682;
  }

  .legal-mail {
    color: #f2b84b;
    text-decoration: none;
  }

  .legal-mail:hover {
    text-decoration: underline;
  }

  .btn-agree {
    background: #f2b84b;
    color: #0b0c10;
    border: none;
    padding: 9px 20px;
    border-radius: 6px;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 10px rgba(242, 184, 75, 0.25);
  }

  .btn-agree:hover {
    background: #f5c464;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(242, 184, 75, 0.35);
  }

  @media (max-width: 640px) {
    .terms-header,
    .terms-scroll-body,
    .terms-modal-footer {
      padding-left: 20px;
      padding-right: 20px;
    }
    .terms-title {
      font-size: 1.35rem;
    }
  }
</style>
