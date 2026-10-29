<script>
  import { progress } from '../stores/progress.js';
  import { fade, scale } from 'svelte/transition';

  // Optional overrides
  export let showBadge = true;
  export let height = '3px';
</script>

{#if $progress.visible}
  <!-- Ambient Top Edge Golden Perimeter Beacon -->
  <div
    class="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden bg-black/40"
    style="height: {height};"
    aria-hidden="true"
  >
    <div
      class="h-full relative top-perimeter-fill"
      style="width: {$progress.progress}%; opacity: {$progress.visible ? 1 : 0};"
    >
      <div
        class="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-amber-200/60 to-[#fde047] blur-[1px]"
      ></div>
    </div>
  </div>

  <!-- Centered Luxury Editorial Loading Screen & Activity Console -->
  {#if showBadge && $progress.isLoading}
    <div
      class="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center p-5 bg-black/55 backdrop-blur-[5px]"
      transition:fade={{ duration: 180 }}
      role="progressbar"
      aria-valuenow={$progress.progress}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={$progress.message || 'Page activity progress'}
    >
      <div
        class="centered-loading-card pointer-events-auto"
        transition:scale={{ start: 0.94, duration: 220 }}
      >
        <!-- Subtle Radial Ambient Amber Backlight -->
        <div class="ambient-halo"></div>

        <!-- Center Animated Emblem Aperture -->
        <div class="emblem-stage">
          <div class="radar-orbit clockwise"></div>
          <div class="radar-orbit counter-clockwise"></div>
          <div class="emblem-frame">
            <img src="/app-icon.png" alt="Cognifolio Logo" class="brand-emblem-img" />
          </div>
          <span class="live-pulse-beacon"></span>
        </div>

        <!-- Editorial Kicker Tag -->
        <div class="kicker-pill">
          <span class="pulsing-amber-dot"></span>
          <span class="kicker-label">COGNIFOLIO INTELLIGENCE ENGINE</span>
        </div>

        <!-- Central Operation Message -->
        <div class="message-container">
          <h4 class="operation-title">
            {$progress.message || 'Processing document intelligence...'}
          </h4>
        </div>

        <!-- Amber Gold Precision Progress Bar -->
        <div class="progress-bar-wrapper">
          <div class="progress-track">
            <div class="amber-progress-fill" style="width: {$progress.progress}%;">
              <div class="shimmer-sweep"></div>
            </div>
          </div>
        </div>

        <!-- Status Metrics & Percentage Row -->
        <div class="status-metrics-row">
          <div class="security-stamp">
            <span class="stamp-chip">ZERO-TRUST AUDIT</span>
            <span class="stamp-sep">•</span>
            <span class="stamp-mode">AES-256 ISOLATED</span>
          </div>
          <div class="percent-badge">
            <span class="percent-number">{Math.round($progress.progress)}</span>
            <span class="percent-symbol">%</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Ambient Top Edge Fill */
  .top-perimeter-fill {
    background: linear-gradient(90deg, #ca8a04 0%, #f2b84b 50%, #fde047 100%);
    box-shadow: 0 0 12px rgba(242, 184, 75, 0.6);
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 250ms ease;
  }

  /* Centered Luxury Card */
  .centered-loading-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: rgba(12, 13, 17, 0.94);
    border: 1px solid rgba(242, 184, 75, 0.28);
    border-radius: 14px;
    padding: 32px 28px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.9),
      0 0 50px rgba(242, 184, 75, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    overflow: hidden;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  /* Ambient Gold Halo */
  .ambient-halo {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    height: 120px;
    background: radial-gradient(
      circle,
      rgba(242, 184, 75, 0.2) 0%,
      rgba(202, 138, 4, 0.05) 60%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  /* Center Emblem Aperture */
  .emblem-stage {
    position: relative;
    width: 68px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
    z-index: 1;
  }

  .emblem-frame {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    overflow: hidden;
    background: #111318;
    border: 1px solid rgba(242, 184, 75, 0.35);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-emblem-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .radar-orbit {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px dashed rgba(242, 184, 75, 0.35);
    pointer-events: none;
  }

  .radar-orbit.clockwise {
    animation: orbitRotate 8s linear infinite;
  }

  .radar-orbit.counter-clockwise {
    inset: -6px;
    border: 1px solid rgba(242, 184, 75, 0.15);
    border-top-color: #f2b84b;
    animation: orbitRotateRev 4s linear infinite;
  }

  .live-pulse-beacon {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: #10b981;
    border: 2px solid #0c0d11;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
  }

  /* Kicker Tag */
  .kicker-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 3px 10px;
    border-radius: 9999px;
    background: rgba(242, 184, 75, 0.08);
    border: 1px solid rgba(242, 184, 75, 0.22);
    margin-bottom: 12px;
    z-index: 1;
  }

  .pulsing-amber-dot {
    width: 6px;
    height: 6px;
    background: #f2b84b;
    border-radius: 50%;
    box-shadow: 0 0 6px #f2b84b;
    animation: pulseDot 1.4s ease-in-out infinite;
  }

  .kicker-label {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.65rem;
    font-weight: 700;
    color: #f2b84b;
    letter-spacing: 0.1em;
  }

  /* Message */
  .message-container {
    text-align: center;
    margin-bottom: 20px;
    padding: 0 10px;
    z-index: 1;
  }

  .operation-title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.15rem;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  /* Progress Bar Track */
  .progress-bar-wrapper {
    width: 100%;
    margin-bottom: 14px;
    z-index: 1;
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
    position: relative;
  }

  .amber-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ca8a04 0%, #f2b84b 55%, #fde047 100%);
    border-radius: 9999px;
    position: relative;
    box-shadow: 0 0 12px rgba(242, 184, 75, 0.5);
    transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .shimmer-sweep {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 50%,
      transparent 100%
    );
    animation: sweep 1.6s infinite ease-in-out;
  }

  /* Status Metrics & Foot */
  .status-metrics-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.72rem;
    color: #717682;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    z-index: 1;
  }

  .security-stamp {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stamp-chip {
    color: #10b981;
    font-weight: 700;
  }

  .stamp-sep {
    color: #3b3f49;
  }

  .stamp-mode {
    color: #8c929e;
  }

  .percent-badge {
    display: flex;
    align-items: baseline;
    font-weight: 800;
    color: #f2b84b;
    font-size: 0.85rem;
  }

  .percent-symbol {
    font-size: 0.7rem;
    margin-left: 1px;
    color: #ca8a04;
  }

  /* Keyframe Animations */
  @keyframes orbitRotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes orbitRotateRev {
    from {
      transform: rotate(360deg);
    }
    to {
      transform: rotate(0deg);
    }
  }

  @keyframes pulseDot {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.85);
    }
  }

  @keyframes sweep {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
</style>
