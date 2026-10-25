<script>
  import { createEventDispatcher } from 'svelte';
  import { loginUser, registerUser, startGuestSession, loginWithGoogle } from '../api.js';

  export let isOpen = false;
  export let initialMode = 'signin'; // 'signin' | 'signup'

  const dispatch = createEventDispatcher();

  let mode = initialMode; // 'signin' | 'signup'
  let name = '';
  let email = '';
  let password = '';
  let isLoading = false;
  let errorMsg = '';

  $: if (initialMode) {
    mode = initialMode;
  }

  function closeModal() {
    errorMsg = '';
    isOpen = false;
    dispatch('close');
  }

  async function handleSubmit() {
    errorMsg = '';
    isLoading = true;

    try {
      let data;
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter your email');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        data = await registerUser(name, email, password);
      } else {
        if (!email.trim() || !password) throw new Error('Please enter your email and password');
        data = await loginUser(email, password);
      }

      dispatch('success', { user: data.user, token: data.access_token });
      closeModal();
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isLoading = false;
    }
  }

  async function handleGuestLogin() {
    errorMsg = '';
    isLoading = true;
    try {
      const data = await startGuestSession();
      dispatch('success', { user: data.user, token: data.access_token, isGuest: true });
      closeModal();
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLoginDemo() {
    // Generates a mock verified Google credential if running standalone,
    // or initiates Google Identity Services if loaded
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      // Direct mock google OAuth login for demonstration
      isLoading = true;
      const mockEmail = `user.${Math.random().toString(36).substring(7)}@gmail.com`;
      loginWithGoogle('demo_google_id_token', mockEmail, 'Google User', 'https://lh3.googleusercontent.com/a/default-user')
        .then((data) => {
          dispatch('success', { user: data.user, token: data.access_token });
          closeModal();
        })
        .catch((err) => {
          errorMsg = err.message;
        })
        .finally(() => {
          isLoading = false;
        });
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()} role="button" tabindex="0">
    <div
      class="modal-card"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <button class="modal-close-btn" on:click={closeModal} aria-label="Close modal">✕</button>

      <div class="modal-brand">
        <span class="brand-badge">⚡ Enterprise Security</span>
        <h2>{mode === 'signin' ? 'Welcome to Cognifolio' : 'Create Enterprise Account'}</h2>
        <p class="brand-sub">
          {mode === 'signin'
            ? 'Sign in to access your multi-tenant document intelligence workspace.'
            : 'Get isolated cloud storage, Gemini 3.5 Flash chat, and audit trails.'}
        </p>
      </div>

      <!-- Mode Switcher Tabs -->
      <div class="tab-switcher">
        <button
          class="tab-btn"
          class:active={mode === 'signin'}
          on:click={() => { mode = 'signin'; errorMsg = ''; }}
        >
          Sign In
        </button>
        <button
          class="tab-btn"
          class:active={mode === 'signup'}
          on:click={() => { mode = 'signup'; errorMsg = ''; }}
        >
          Create Account
        </button>
      </div>

      {#if errorMsg}
        <div class="error-banner">
          <span>⚠️ {errorMsg}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="auth-form">
        {#if mode === 'signup'}
          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Sarah Jenkins"
              bind:value={name}
              required
              disabled={isLoading}
            />
          </div>
        {/if}

        <div class="form-group">
          <label for="email">Work Email</label>
          <input
            id="email"
            type="email"
            placeholder="analyst@enterprise.com"
            bind:value={email}
            required
            disabled={isLoading}
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            bind:value={password}
            required
            disabled={isLoading}
          />
        </div>

        <button type="submit" class="btn-primary auth-submit-btn" disabled={isLoading}>
          {#if isLoading}
            <span class="spinner"></span> Processing...
          {:else}
            {mode === 'signin' ? 'Sign In' : 'Create Account'} →
          {/if}
        </button>
      </form>

      <div class="divider">
        <span>OR</span>
      </div>

      <!-- Google OAuth & Guest Quick Access -->
      <div class="quick-access-buttons">
        <button
          type="button"
          class="btn-social google-btn"
          on:click={handleGoogleLoginDemo}
          disabled={isLoading}
        >
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          class="btn-guest-playground"
          on:click={handleGuestLogin}
          disabled={isLoading}
        >
          <div class="guest-btn-content">
            <span class="guest-title">⚡ Instant Guest Playground</span>
            <span class="guest-desc">Zero friction. Test document intelligence without an account.</span>
          </div>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(3, 7, 18, 0.82);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 2.25rem;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.15);
    color: #f8fafc;
  }

  .modal-close-btn {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .modal-close-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.4);
  }

  .modal-brand {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .brand-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(6, 182, 212, 0.15);
    color: #22d3ee;
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .modal-brand h2 {
    font-family: 'Outfit', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: #fff;
  }

  .brand-sub {
    font-size: 0.85rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.4;
  }

  .tab-switcher {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: rgba(15, 23, 42, 0.6);
    padding: 4px;
    border-radius: 12px;
    margin-bottom: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tab-btn {
    padding: 0.55rem;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: rgba(6, 182, 212, 0.2);
    color: #38bdf8;
    border: 1px solid rgba(6, 182, 212, 0.4);
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fca5a5;
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    font-size: 0.825rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #cbd5e1;
  }

  .form-group input {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.7rem 0.9rem;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #06b6d4;
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
  }

  .auth-submit-btn {
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 10px;
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    color: #fff;
    font-weight: 600;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
    transition: all 0.2s;
  }

  .auth-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.45);
  }

  .divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 1.25rem 0;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .divider span {
    padding: 0 0.75rem;
  }

  .quick-access-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn-social {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.7rem;
    color: #e2e8f0;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-social:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .google-icon {
    width: 18px;
    height: 18px;
  }

  .btn-guest-playground {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08));
    border: 1px dashed rgba(16, 185, 129, 0.4);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .btn-guest-playground:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.15));
    border-color: rgba(16, 185, 129, 0.65);
    transform: translateY(-1px);
  }

  .guest-btn-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .guest-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #34d399;
  }

  .guest-desc {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
