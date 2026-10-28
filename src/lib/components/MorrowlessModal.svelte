<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';

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
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if isOpen}
  <div
    class="morrow-backdrop"
    transition:fade={{ duration: 180 }}
    on:click={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
    role="button"
    tabindex="0"
    aria-label="Close modal backdrop"
  >
    <div
      class="morrow-card"
      transition:scale={{ start: 0.96, duration: 220 }}
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Morrowless Brand & License"
    >
      <button class="close-btn" on:click={close} aria-label="Close modal">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Brand Logo / Wordmark -->
      <div class="brand-showcase">
        <div class="wordmark-wrap">
          <span class="wm-letter">M</span>
          <span class="wm-letter">O</span>
          <span class="wm-letter">R</span>
          <span class="wm-letter">R</span>
          <span class="wm-letter">O</span>
          <span class="wm-letter">W</span>
          <span class="wm-letter">L</span>
          <span class="wm-e" aria-label="E">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </span>
          <span class="wm-letter">S</span>
          <span class="wm-letter">S</span>
        </div>

        <p class="tagline">INDEPENDENT BY NATURE. BUILT BEYOND TOMORROW.</p>

        <div class="divider"></div>

        <blockquote class="credo-quote">
          “We don’t wait for the future.<br />
          <span>We build it.</span>”
        </blockquote>

        <p class="collective-tag">AN INDEPENDENT COLLECTIVE</p>
      </div>

      <!-- Licensing & Legal Ownership -->
      <div class="license-tray">
        <div class="license-badge-row">
          <span class="license-chip">Official Platform License</span>
          <span class="license-chip chip-amber">Zero-Trust Protected</span>
        </div>
        <p class="license-details">
          <strong>Cognifolio</strong> is proprietary document intelligence software engineered and
          licensed by
          <strong>Morrowless Inc.</strong> All zero-trust PII sanitization pipelines, multimodal neural
          extractors, and redline diff algorithms are protected intellectual property.
        </p>
        <!-- Dedicated High-End Contact Row -->
        <div class="modal-contact-row">
          <span class="modal-contact-label">Direct Inquiries &amp; Legal</span>
          <a
            href="mailto:contact@morrowless.io"
            class="contact-pill-btn"
            title="Email Morrowless at contact@morrowless.io"
          >
            <svg
              class="mail-icon"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <strong>contact@morrowless.io</strong>
          </a>
        </div>

        <div class="license-footer-row">
          <span class="copyright-text">© 2026 Morrowless. All rights reserved.</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .morrow-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .morrow-card {
    position: relative;
    width: 100%;
    max-width: 580px;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 20px;
    box-shadow:
      0 30px 80px -15px rgba(0, 0, 0, 0.9),
      0 0 40px rgba(255, 255, 255, 0.03);
    overflow: hidden;
    color: #ffffff;
    text-align: center;
  }

  .close-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #a1a1aa;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    transform: scale(1.05);
  }

  .brand-showcase {
    padding: 48px 36px 36px;
    background: radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
  }

  .wordmark-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.12em;
    font-family:
      var(--font-sans, system-ui),
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif;
    font-size: 2.1rem;
    font-weight: 800;
    letter-spacing: 0.24em;
    color: #ffffff;
    margin-bottom: 12px;
  }

  .wm-letter {
    display: inline-block;
  }

  /* Custom Morrowless 'E' with 3 sleek horizontal bars */
  .wm-e {
    display: inline-flex;
    flex-direction: column;
    justify-content: space-between;
    width: 0.62em;
    height: 0.72em;
    margin: 0 0.06em;
    vertical-align: -0.02em;
  }

  .wm-e .bar {
    display: block;
    width: 100%;
    height: 2.4px;
    background: #ffffff;
    border-radius: 1px;
  }

  .tagline {
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    color: #a1a1aa;
    margin: 0 0 24px 0;
    text-transform: uppercase;
  }

  .divider {
    width: 52px;
    height: 1px;
    background: rgba(255, 255, 255, 0.22);
    margin: 0 auto 28px;
  }

  .credo-quote {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.55rem;
    font-weight: 500;
    line-height: 1.45;
    color: #f4f4f5;
    margin: 0 0 24px 0;
  }

  .credo-quote span {
    font-weight: 600;
    color: #ffffff;
  }

  .collective-tag {
    font-family: var(--font-mono, monospace);
    font-size: 0.66rem;
    letter-spacing: 0.28em;
    color: #71717a;
    text-transform: uppercase;
    margin: 0;
  }

  .license-tray {
    background: #111111;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 24px 32px;
    text-align: left;
  }

  .license-badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .license-chip {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .license-chip.chip-amber {
    background: rgba(202, 138, 4, 0.15);
    color: #fde047;
    border-color: rgba(202, 138, 4, 0.3);
  }

  .license-details {
    font-size: 0.8rem;
    line-height: 1.55;
    color: #a1a1aa;
    margin: 0 0 16px 0;
  }

  .license-details strong {
    color: #ffffff;
  }

  .modal-contact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 14px;
    margin-bottom: 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 6px;
  }

  .modal-contact-label {
    font-family: var(--font-sans);
    color: #a1a1aa;
    font-size: 0.74rem;
    font-weight: 500;
  }

  .contact-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono, monospace);
    font-size: 0.74rem;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 4px 10px;
    border-radius: 4px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .contact-pill-btn strong {
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .contact-pill-btn:hover {
    background: #ffffff;
    color: #0c0c0c;
    border-color: #ffffff;
  }

  .contact-pill-btn .mail-icon {
    opacity: 0.75;
    transition: opacity 0.15s ease;
  }

  .contact-pill-btn:hover .mail-icon {
    opacity: 1;
    stroke: #0c0c0c;
  }

  .license-footer-row {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    color: #71717a;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;
    letter-spacing: 0.02em;
  }

  @media (max-width: 600px) {
    .wordmark-wrap {
      font-size: 1.55rem;
      letter-spacing: 0.18em;
    }
    .credo-quote {
      font-size: 1.25rem;
    }
    .brand-showcase {
      padding: 36px 20px 24px;
    }
    .license-tray {
      padding: 18px 20px;
    }
  }
</style>
