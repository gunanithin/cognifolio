<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import AppHeader from './AppHeader.svelte';

  export let documents = [];
  export let currentUser = null;
  export let showHeader = true;
  export let showFooter = true;

  const dispatch = createEventDispatcher();

  function launchStudio(tab = 'dashboard') {
    dispatch('launchStudio', { tab });
  }

  function triggerUpload() {
    dispatch('upload');
  }

  function openPricing() {
    dispatch('openPricing');
  }

  function openSecurityGuide() {
    dispatch('openSecurityGuide');
  }

  function openMorrowless() {
    dispatch('openMorrowless');
  }

  function openDocument(doc) {
    dispatch('openDoc', { doc });
  }

  function goToSection(sectionId) {
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#/${sectionId}`);
      }
    }
  }
</script>

<div class="cognifolio-landing-root">
  {#if showHeader}
    <!-- Top Navigation Header (Unified App Shell) -->
    <AppHeader
      {currentUser}
      on:navigate={(e) => {
        if (e.detail.tab && e.detail.tab !== 'portal') {
          launchStudio(e.detail.tab);
        } else if (e.detail.anchor) {
          goToSection(e.detail.anchor);
        } else {
          goToSection('product');
        }
      }}
      on:openSecurityGuide={openSecurityGuide}
      on:openPricing={openPricing}
      on:openMorrowless={openMorrowless}
      on:triggerUpload={triggerUpload}
      on:openAuthModal={(e) => dispatch('openAuthModal', e.detail)}
      on:logout={() => dispatch('logout')}
    />
  {/if}

  <main>
    <!-- Hero Section -->
    <section class="hero" id="product">
      <div class="wrap grid">
        <div class="hero-content">
          <div class="eyebrow">✦ &nbsp; AI DOCUMENT INTELLIGENCE</div>

          <h1 class="hero-title">
            Turn documents<br />
            into <em>decisions.</em>
          </h1>

          <p class="lead">
            Upload any PDF, contract, or image. Extract meaning, uncover risks, protect sensitive
            information, and ask questions grounded in your documents.
          </p>

          <div class="actions">
            <button type="button" class="btn primary" on:click={() => launchStudio('dashboard')}>
              Explore Cognifolio →
            </button>
            <button type="button" class="btn secondary" on:click={triggerUpload}>
              ⚡ &nbsp; Upload Document
            </button>
            <button type="button" class="btn ghost" on:click={openPricing}>
              Pricing &amp; Limits
            </button>
          </div>

          <div class="trust">
            <span><b>✓</b> Source-grounded answers</span>
            <span><b>✓</b> Privacy-first analysis</span>
            <span><b>✓</b> PDF · DOCX · Images</span>
            <span><b>✓</b> 100% Free Public Beta</span>
          </div>

          <!-- Active Workspace Vault Quick Access Strip (if files exist) -->
          {#if documents && documents.length > 0}
            <div class="active-vault-strip">
              <span class="vault-label">ACTIVE VAULT:</span>
              <div class="vault-chips">
                {#each documents.slice(0, 3) as doc}
                  <button
                    type="button"
                    class="vault-chip"
                    on:click={() => openDocument(doc)}
                    title="Open {doc.original_filename} in Studio Viewer"
                  >
                    <CIcon name="document" size={12} />
                    <span class="chip-name">{doc.original_filename}</span>
                    <span class="chip-arrow">&rarr;</span>
                  </button>
                {/each}
                {#if documents.length > 3}
                  <button
                    type="button"
                    class="vault-chip more-chip"
                    on:click={() => launchStudio('dashboard')}
                  >
                    +{documents.length - 3} more &rarr;
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- Hero Visual: Clean High-Resolution Dashboard Mockup Image -->
        <div class="hero-art-container">
          <div class="hero-art" aria-label="Cognifolio AI document intelligence visual">
            <img
              src="/hero-dashboard.png"
              alt="Cognifolio AI Document Intelligence Dashboard"
              class="hero-art-img"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section: From files to clarity -->
    <section class="content" id="features">
      <div class="wrap">
        <div class="kicker">FROM FILES TO CLARITY</div>
        <h2>More than a document viewer.</h2>
        <p class="intro">
          Bring your documents into one workspace, then move from raw pages to useful, explainable
          insights.
        </p>

        <div class="cards">
          <div
            class="card"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('viewer')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('viewer')}
          >
            <div class="icon">✦</div>
            <h3>Understand in seconds</h3>
            <p>
              Generate concise summaries, key takeaways, dates, entities, and action items from
              lengthy documents.
            </p>
          </div>

          <div
            class="card"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('viewer')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('viewer')}
          >
            <div class="icon">⌕</div>
            <h3>Ask your documents</h3>
            <p>
              Ask natural-language questions and get answers grounded in relevant retrieved
              passages.
            </p>
          </div>

          <div
            class="card"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('compare')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('compare')}
          >
            <div class="icon">△</div>
            <h3>Spot potential risks</h3>
            <p>
              Highlight clauses, obligations, ambiguities, and terms that may deserve human review.
            </p>
          </div>

          <div
            class="card"
            id="security"
            role="button"
            tabindex="0"
            on:click={openSecurityGuide}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && openSecurityGuide()}
          >
            <div class="icon">⬡</div>
            <h3>Protect sensitive data</h3>
            <p>
              Identify sensitive information and support client-side redaction workflows before
              sharing documents.
            </p>
          </div>

          <div
            class="card"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('viewer')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('viewer')}
          >
            <div class="icon">▧</div>
            <h3>Read scans and images</h3>
            <p>
              Use multimodal OCR to turn scanned pages and image-based documents into searchable
              content.
            </p>
          </div>

          <div
            class="card"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('search')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('search')}
          >
            <div class="icon">⌘</div>
            <h3>Keep context connected</h3>
            <p>
              Use neural vector retrieval to connect AI answers directly with relevant document
              citations.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Workflow Section: Upload. Understand. Decide. -->
    <section class="content" id="workflow">
      <div class="wrap">
        <div class="kicker">A CLEARER WORKFLOW</div>
        <h2>Upload. Understand. Decide.</h2>
        <p class="intro">
          A simple path from a file you need to understand to insights you can act on.
        </p>

        <div class="steps">
          <div
            class="step"
            role="button"
            tabindex="0"
            on:click={triggerUpload}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerUpload()}
          >
            <div class="num">01 / INGEST</div>
            <h3>Bring in your files</h3>
            <p>
              Upload supported PDFs, documents, spreadsheets, text files, or images into your
              workspace.
            </p>
          </div>

          <div
            class="step"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('search')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('search')}
          >
            <div class="num">02 / RETRIEVE</div>
            <h3>Find the relevant context</h3>
            <p>
              Document processing and semantic retrieval surface passages relevant to your
              questions.
            </p>
          </div>

          <div
            class="step"
            role="button"
            tabindex="0"
            on:click={() => launchStudio('viewer')}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && launchStudio('viewer')}
          >
            <div class="num">03 / ANALYSE</div>
            <h3>Get useful answers</h3>
            <p>
              Review summaries, potential risks, extracted details, and source-grounded responses.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Commercial Call-To-Action Banner -->
    <section class="content" id="start">
      <div class="wrap">
        <div class="cta">
          <div>
            <div class="kicker">YOUR DOCUMENTS, WITH CONTEXT</div>
            <h2>Make every page count.</h2>
            <p>
              Explore a smarter way to understand complex documents&mdash;without losing sight of
              the source.
            </p>
          </div>
          <button
            type="button"
            class="btn primary cta-launch-btn"
            on:click={() => launchStudio('dashboard')}
          >
            Explore Cognifolio →
          </button>
        </div>
      </div>
    </section>
  </main>

  {#if showFooter}
    <!-- Editorial Landing Footer -->
    <footer class="footer">
      <div class="wrap foot">
        <div>
          &copy; 2026 <strong>Cognifolio by MORROWLESS</strong> &bull;
          <button type="button" class="footer-credo-btn" on:click={openMorrowless}>
            &ldquo;We don&rsquo;t wait for the future. We build it.&rdquo;
          </button>
        </div>
        <div class="foot-links">
          <button type="button" class="footer-link-btn" on:click={openSecurityGuide}
            >Privacy &amp; Protection</button
          >
          <span class="foot-dot">&bull;</span>
          <button type="button" class="footer-link-btn" on:click={openPricing}
            >Pricing &amp; Limits</button
          >
          <span class="foot-dot">&bull;</span>
          <a href="mailto:contact@morrowless.io" class="footer-link-btn">contact@morrowless.io</a>
        </div>
      </div>
    </footer>
  {/if}
</div>

<style>
  :root {
    --bg: #08090b;
    --panel: #121419;
    --line: #2b2e35;
    --text: #f6f6f6;
    --muted: #b4b8c0;
    --amber: #f2b84b;
    --green: #67d8a2;
  }

  .cognifolio-landing-root {
    background: var(--bg);
    color: var(--text);
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif;
    font-size: 16px;
    line-height: 1.6;
    min-height: 100vh;
    box-sizing: border-box;
    overflow-x: hidden;
    animation: portalFadeIn 0.18s ease-out;
  }

  @keyframes portalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .cognifolio-landing-root * {
    box-sizing: border-box;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .wrap {
    width: min(1180px, calc(100% - 40px));
    margin: auto;
  }

  /* Sticky Top Navigation Bar */

  .btn {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 700;
    border: 1px solid #41444b;
    cursor: pointer;
    background: transparent;
    color: var(--text);
    transition: all 0.15s ease;
  }

  .btn.primary {
    background: var(--amber);
    color: #16120a;
    border-color: var(--amber);
  }

  .btn.primary:hover {
    background: #e5ab3e;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(242, 184, 75, 0.25);
  }

  .btn.secondary {
    background: #171a21;
    border-color: #3b3f49;
    color: var(--text);
  }

  .btn.secondary:hover {
    background: #20242e;
    border-color: #555b68;
    transform: translateY(-1px);
  }

  .btn.ghost {
    background: transparent;
    border-color: #32353d;
    color: var(--muted);
  }

  .btn.ghost:hover {
    color: var(--text);
    border-color: #4f535d;
  }

  /* Hero Section */
  .hero {
    position: relative;
    overflow: hidden;
    padding: 76px 0 72px;
    background:
      radial-gradient(ellipse at 79% 43%, #4c321d45, transparent 42%),
      radial-gradient(ellipse at 3% 95%, #292d3433, transparent 34%);
  }

  .hero::before {
    content: '';
    position: absolute;
    width: 640px;
    height: 640px;
    border: 1px solid #f2b84b13;
    border-radius: 50%;
    right: -170px;
    top: -150px;
    box-shadow:
      0 0 0 70px #f2b84b06,
      0 0 0 140px #f2b84b04;
    pointer-events: none;
  }

  .grid {
    display: grid;
    grid-template-columns: 0.87fr 1.13fr;
    gap: 46px;
    align-items: center;
    position: relative;
  }

  .eyebrow {
    display: inline-block;
    border: 1px solid #70562b;
    background: #21180d;
    border-radius: 30px;
    padding: 6px 13px;
    color: #ffd27d;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 1.3px;
    margin-bottom: 4px;
  }

  /* Explicit White Headline on Dark Canvas to override app.css #111111 */
  .hero-title,
  .hero h1 {
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif !important;
    font-size: clamp(43px, 5vw, 67px);
    line-height: 1.04;
    letter-spacing: -3px;
    margin: 24px 0 20px;
    font-weight: 800;
    color: #f6f6f6 !important;
  }

  .hero-title em,
  .hero h1 em {
    font-style: normal;
    color: var(--amber, #f2b84b) !important;
  }

  .lead {
    color: var(--muted);
    line-height: 1.8;
    max-width: 520px;
    font-size: 16px;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 26px 0 22px;
  }

  .trust {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    color: #b7bbc3;
    font-size: 11px;
  }

  .trust b {
    color: var(--amber);
  }

  /* Active Vault Strip */
  .active-vault-strip {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #1e2229;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vault-label {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: var(--amber);
  }

  .vault-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .vault-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    background: #14171d;
    border: 1px solid #2b2f37;
    border-radius: 6px;
    color: #cfd3dc;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .vault-chip:hover {
    background: #1c212a;
    border-color: var(--amber);
    color: #ffffff;
    transform: translateY(-1px);
  }

  .chip-name {
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-arrow {
    color: var(--amber);
  }

  .more-chip {
    color: var(--amber);
    background: #1c1810;
    border-color: #4b391d;
  }

  /* Hero Art Visual Container */
  .hero-art-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hero-art {
    width: 100%;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-art-img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 560px;
    object-fit: contain;
    border-radius: 14px;
    border: 1px solid #2b2e35;
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7);
    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5));
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-art-img:hover {
    transform: translateY(-2px) scale(1.008);
  }

  /* Content Sections */
  section.content {
    padding: 76px 0;
    border-top: 1px solid #202329;
  }

  .kicker {
    color: var(--amber);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.6px;
    text-transform: uppercase;
  }

  .content h2 {
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif !important;
    font-size: clamp(30px, 4vw, 43px);
    line-height: 1.15;
    letter-spacing: -1.7px;
    margin: 12px 0;
    font-weight: 800;
    color: #f6f6f6 !important;
  }

  .intro {
    color: var(--muted);
    max-width: 650px;
    font-size: 15px;
    line-height: 1.7;
    margin: 0;
  }

  /* Cards Grid */
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 30px;
  }

  .card {
    background: linear-gradient(145deg, #14161b, #0d0e11);
    border: 1px solid var(--line);
    border-radius: 13px;
    padding: 22px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .card:hover {
    border-color: #554425;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  .icon {
    height: 38px;
    width: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #5a4524;
    background: #241b10;
    color: var(--amber);
    border-radius: 10px;
    font-size: 17px;
  }

  .card h3 {
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif !important;
    font-size: 15px;
    margin: 15px 0 7px;
    color: #f6f6f6 !important;
    font-weight: 700;
  }

  .card p,
  .step p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.7;
    margin: 0;
  }

  /* Steps Grid */
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
    margin-top: 30px;
  }

  .step {
    background: #111318;
    border: 1px solid #23262d;
    border-radius: 12px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .step:hover {
    border-color: #4f3c1f;
    transform: translateY(-2px);
  }

  .num {
    color: var(--amber);
    font-size: 11px;
    letter-spacing: 1.5px;
    font-weight: 800;
  }

  .step h3 {
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif !important;
    font-size: 17px;
    margin: 8px 0;
    color: #f6f6f6 !important;
    font-weight: 700;
  }

  /* Commercial CTA Box */
  .cta {
    border: 1px solid #48371d;
    background: radial-gradient(ellipse at 85% 10%, #9b68231d, transparent 40%), #121419;
    border-radius: 17px;
    padding: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .cta h2 {
    font-family:
      Inter,
      system-ui,
      -apple-system,
      sans-serif !important;
    margin: 8px 0;
    font-size: clamp(26px, 3.5vw, 36px);
    font-weight: 800;
    color: #f6f6f6 !important;
  }

  .cta p {
    color: var(--muted);
    max-width: 600px;
    margin: 0;
    font-size: 14.5px;
    line-height: 1.6;
  }

  .cta-launch-btn {
    white-space: nowrap;
    padding: 14px 24px;
    font-size: 14px;
  }

  /* Footer */
  .footer {
    border-top: 1px solid #25282e;
    padding: 28px 0;
    color: #969ba4;
    font-size: 11.5px;
    background: #08090b;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
    align-items: center;
  }

  .footer strong {
    color: #eeeeee;
  }

  .footer-credo-btn {
    background: transparent;
    border: none;
    color: #969ba4;
    font-style: italic;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    transition: color 0.15s ease;
  }

  .footer-credo-btn:hover {
    color: var(--amber);
  }

  .foot-links {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .footer-link-btn {
    background: transparent;
    border: none;
    color: #969ba4;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-link-btn:hover {
    color: #ffffff;
  }

  .foot-dot {
    color: #4a4f59;
  }

  /* Responsive Breakpoints */
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .hero-art-container {
      max-width: 760px;
      margin: 0 auto;
    }
    .hero-art-img {
      max-height: none;
    }
    .cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .wrap {
      width: calc(100% - 30px);
    }
    .hero {
      padding: 55px 0;
    }
    .hero-title,
    .hero h1 {
      letter-spacing: -2px;
    }
    .hero-art-img {
      width: 100%;
      height: auto;
    }
    .cards,
    .steps {
      grid-template-columns: 1fr;
    }
    .content {
      padding: 55px 0 !important;
    }
    .cta {
      padding: 25px;
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
