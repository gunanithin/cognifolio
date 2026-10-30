<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { loginUser, registerUser, startGuestSession, loginWithGoogle } from '../api.js';
  import { evaluatePasswordStrength, validateEmail } from '../crypto/authCrypto.js';
  import { telemetry } from '../stores/telemetry.js';
  import CModal from '../ui/CModal.svelte';
  import CTextBox from '../ui/CTextBox.svelte';
  import CButton from '../ui/CButton.svelte';
  import CBadge from '../ui/CBadge.svelte';
  import CIcon from '../icons/CIcon.svelte';

  export let isOpen = false;
  export let initialMode = 'signin'; // 'signin' | 'signup'

  const dispatch = createEventDispatcher();

  let mode = initialMode; // 'signin' | 'signup'
  let name = '';
  let email = '';
  let password = '';
  let isLoading = false;
  let errorMsg = '';
  let activeAuthError = null;
  let copiedCorrelationId = false;
  let isEmailTouched = false;

  $: strength = evaluatePasswordStrength(password);
  $: emailValidation = validateEmail(email);
  $: emailError =
    email.length > 0 &&
    (isEmailTouched || email.includes('@') || email.length > 5) &&
    !emailValidation.valid
      ? emailValidation.error
      : '';
  $: isEmailValid = email.trim().length > 0 && emailValidation.valid;

  onMount(() => {
    if (typeof window !== 'undefined' && !window.google?.accounts?.id) {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  });

  $: if (initialMode) {
    mode = initialMode;
  }

  function copyCorrelationId(id) {
    if (typeof navigator !== 'undefined' && navigator?.clipboard && id) {
      navigator.clipboard.writeText(id).then(() => {
        copiedCorrelationId = true;
        setTimeout(() => (copiedCorrelationId = false), 2000);
      });
    }
  }

  function closeModal() {
    errorMsg = '';
    activeAuthError = null;
    isOpen = false;
    dispatch('close');
  }

  async function handleSubmit() {
    errorMsg = '';
    activeAuthError = null;
    isEmailTouched = true;
    isLoading = true;

    try {
      let data;
      const cleanEmail = email.trim().toLowerCase();
      const emailCheck = validateEmail(cleanEmail);
      if (!emailCheck.valid) {
        throw new Error(emailCheck.error);
      }

      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 8) throw new Error('Password must be at least 8 characters');
        if (!strength.meetsPolicy) {
          throw new Error(
            strength.feedback ||
              'Please choose a stronger passphrase (min 10 characters with mixed cases/numbers).',
          );
        }
        data = await registerUser(name, cleanEmail, password);
      } else {
        if (!password) throw new Error('Please enter your password');
        data = await loginUser(cleanEmail, password);
      }

      dispatch('success', { user: data.user, token: data.access_token });
      closeModal();
    } catch (err) {
      const record = telemetry.captureError(err, {
        subsystem: 'auth',
        endpoint: mode === 'signup' ? '/auth/secure-register' : '/auth/secure-login',
        method: 'POST',
        status_code: err.status || 400,
        correlation_id: err.correlation_id,
        metadata: {
          email: email ? `${email.split('@')[0]}@***` : 'empty',
          mode,
        },
      });
      activeAuthError = record;
      errorMsg = record.userMessage;
    } finally {
      isLoading = false;
    }
  }

  async function handleGuestLogin() {
    errorMsg = '';
    activeAuthError = null;
    isLoading = true;
    try {
      const data = await startGuestSession();
      dispatch('success', { user: data.user, token: data.access_token, isGuest: true });
      closeModal();
    } catch (err) {
      const record = telemetry.captureError(err, {
        subsystem: 'auth',
        endpoint: '/auth/guest',
        method: 'POST',
        status_code: err.status || 500,
      });
      activeAuthError = record;
      errorMsg = record.userMessage;
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLoginDemo() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      isLoading = true;
      activeAuthError = null;
      errorMsg = '';
      const mockEmail = `user.${Math.random().toString(36).substring(7)}@gmail.com`;
      loginWithGoogle(
        'demo_google_id_token',
        mockEmail,
        'Google User',
        'https://lh3.googleusercontent.com/a/default-user',
      )
        .then((data) => {
          dispatch('success', { user: data.user, token: data.access_token });
          closeModal();
        })
        .catch((err) => {
          const record = telemetry.captureError(err, {
            subsystem: 'auth',
            endpoint: '/auth/google',
            method: 'POST',
            status_code: err.status || 500,
          });
          activeAuthError = record;
          errorMsg = record.userMessage;
        })
        .finally(() => {
          isLoading = false;
        });
    }
  }
</script>

<CModal {isOpen} on:close={closeModal} maxWidth="max-w-[440px]">
  <!-- Brand Header -->
  <div class="mb-6 text-center">
    <img
      src="/app-icon.png"
      alt="Cognifolio Logo"
      class="mx-auto mb-3 h-12 w-12 rounded-[10px] border border-black/10 shadow-sm object-contain"
    />
    <CBadge variant="neutral" icon="security" className="mb-2">Enterprise Security</CBadge>
    <h2 class="font-heading text-2xl font-semibold text-ink tracking-tight">
      {mode === 'signin' ? 'Welcome to Cognifolio' : 'Create Enterprise Account'}
    </h2>
    <p class="mt-1 text-xs text-ink-muted leading-relaxed">
      {mode === 'signin'
        ? 'Sign in to access your multi-tenant document intelligence workspace.'
        : 'Get isolated cloud storage, document AI chat, and audit trails.'}
    </p>
  </div>

  <!-- Mode Switcher Tabs -->
  <div
    class="mb-5 grid grid-cols-2 rounded-[6px] border border-border-hairline bg-surface-subtle p-1"
  >
    <button
      type="button"
      class="rounded-[4px] py-1.5 text-xs font-semibold uppercase tracking-wider transition-all {mode ===
      'signin'
        ? 'bg-surface text-ink border border-ink shadow-sm'
        : 'text-ink-muted hover:text-ink'}"
      on:click={() => {
        mode = 'signin';
        errorMsg = '';
        activeAuthError = null;
      }}
    >
      Sign In
    </button>
    <button
      type="button"
      class="rounded-[4px] py-1.5 text-xs font-semibold uppercase tracking-wider transition-all {mode ===
      'signup'
        ? 'bg-surface text-ink border border-ink shadow-sm'
        : 'text-ink-muted hover:text-ink'}"
      on:click={() => {
        mode = 'signup';
        errorMsg = '';
        activeAuthError = null;
      }}
    >
      Create Account
    </button>
  </div>

  {#if activeAuthError}
    <div
      class="mb-4 rounded-[6px] border border-status-danger-border bg-status-danger-bg/80 p-3.5 text-xs text-status-danger-text shadow-sm"
    >
      <div class="flex items-start gap-2.5">
        <div class="mt-0.5 shrink-0 text-status-danger-text">
          <CIcon name="close" size={16} />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-serif font-bold text-sm text-ink">
              {activeAuthError.title || 'Authentication Notice'}
            </h4>
            {#if activeAuthError.correlationId}
              <button
                type="button"
                title="Click to copy incident reference"
                class="font-mono text-[10px] text-ink-muted bg-surface/90 border border-border-hairline rounded px-1.5 py-0.5 tracking-wider hover:border-ink hover:text-ink transition-colors flex items-center gap-1"
                on:click={() => copyCorrelationId(activeAuthError.correlationId)}
              >
                <span>{activeAuthError.correlationId}</span>
                {#if copiedCorrelationId}
                  <span class="text-status-success-text font-bold">✓</span>
                {/if}
              </button>
            {/if}
          </div>
          <p class="mt-1 text-xs text-ink/80 leading-relaxed">{activeAuthError.userMessage}</p>
          <div
            class="mt-2.5 flex items-center justify-between text-[11px] text-ink-dim border-t border-status-danger-border/30 pt-2"
          >
            <span class="flex items-center gap-1">
              <CIcon name="shield" size={12} />
              <span>Logged to Central Audit Console</span>
            </span>
            <button
              type="button"
              class="text-ink font-semibold hover:underline"
              on:click={() => {
                activeAuthError = null;
                errorMsg = '';
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else if errorMsg}
    <div
      class="mb-4 flex items-center gap-2 rounded-[4px] border border-status-danger-border bg-status-danger-bg p-2.5 text-xs text-status-danger-text"
    >
      <CIcon name="close" size={14} />
      <span>{errorMsg}</span>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-3.5">
    {#if mode === 'signup'}
      <CTextBox
        id="name"
        label="Full Name"
        placeholder="e.g. Sarah Jenkins"
        bind:value={name}
        required
        disabled={isLoading}
      />
    {/if}

    <CTextBox
      id="email"
      type="email"
      label="Work Email"
      placeholder="e.g. name@company.io or analyst@enterprise.com"
      bind:value={email}
      on:input={() => {
        if (email.includes('@') || email.length > 5) isEmailTouched = true;
      }}
      on:blur={() => {
        if (email) isEmailTouched = true;
      }}
      required
      disabled={isLoading}
      error={emailError}
    >
      <div slot="trailing">
        {#if isEmailValid && !emailError}
          <div class="text-status-success-text pr-1 flex items-center">
            <CIcon name="check" size={14} color="#16a34a" />
          </div>
        {/if}
      </div>
    </CTextBox>

    <CTextBox
      id="password"
      type="password"
      label="Password"
      placeholder="••••••••"
      bind:value={password}
      required
      disabled={isLoading}
    />

    {#if mode === 'signup' && password}
      <div
        class="mt-1 flex flex-col gap-1.5 rounded-[4px] bg-surface-subtle border border-border-hairline p-2 text-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-muted"
            >Entropy / Strength:</span
          >
          <span class="font-bold text-[0.72rem]" style="color: {strength.color};">
            {strength.label} ({strength.score}%)
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            class="h-full transition-all duration-300"
            style="width: {strength.score}%; background-color: {strength.color};"
          ></div>
        </div>
        <span class="text-[0.68rem] text-ink-muted">{strength.feedback}</span>
      </div>
    {/if}

    <div class="flex items-center gap-1.5 text-[0.68rem] text-ink-muted mt-0.5">
      <CIcon name="shield" size={11} color="#ca8a04" />
      <span>Encrypted in browser via 4096-bit RSA asymmetric envelope</span>
    </div>

    <div class="pt-2">
      <CButton
        type="submit"
        variant="primary"
        loading={isLoading}
        className="w-full text-xs font-semibold uppercase tracking-wider py-2.5"
      >
        {mode === 'signin' ? 'Sign In →' : 'Create Account →'}
      </CButton>
    </div>
  </form>

  <!-- Divider -->
  <div
    class="my-5 flex items-center text-center text-[0.7rem] font-semibold tracking-wider text-ink-dim uppercase"
  >
    <div class="flex-1 border-b border-border-hairline"></div>
    <span class="px-3">OR</span>
    <div class="flex-1 border-b border-border-hairline"></div>
  </div>

  <!-- Google & Guest Quick Access -->
  <div class="flex flex-col gap-2.5">
    <CButton
      variant="secondary"
      on:click={handleGoogleLoginDemo}
      disabled={isLoading}
      className="w-full py-2.5 text-xs justify-center"
    >
      <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      Continue with Google
    </CButton>

    <button
      type="button"
      class="flex flex-col text-left rounded-[4px] border border-dashed border-ink bg-surface-subtle p-3 transition-colors hover:bg-neutral-100 disabled:opacity-50"
      on:click={handleGuestLogin}
      disabled={isLoading}
    >
      <span class="flex items-center gap-1.5 text-xs font-bold text-ink">
        <CIcon name="lightning" size={14} /> Instant Guest Playground
      </span>
      <span class="text-[0.72rem] text-ink-muted mt-0.5">
        Zero friction. Test document intelligence without an account.
      </span>
    </button>
  </div>
</CModal>
