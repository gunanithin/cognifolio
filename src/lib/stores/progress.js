import { writable, derived } from 'svelte/store';

/**
 * Global Progress & Network Activity Store
 * Single source of truth for screen loading and asynchronous request progress.
 */
function createProgressStore() {
  const initialState = {
    isLoading: false,
    progress: 0, // 0 - 100
    visible: false,
    message: '',
    activeRequests: 0,
  };

  const { subscribe, set, update } = writable(initialState);

  let tickTimer = null;
  let fadeTimer = null;
  let resetTimer = null;

  function clearTimers() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function start(message = '') {
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    update((state) => {
      const nextRequests = state.activeRequests + 1;
      const nextMessage = message || state.message;

      if (nextRequests === 1 || !state.visible) {
        // First active request or reopening bar
        if (tickTimer) clearInterval(tickTimer);

        // Start asymptotic progress trickling
        tickTimer = setInterval(() => {
          update((s) => {
            if (!s.isLoading) return s;

            let nextP = s.progress;
            if (nextP < 30) {
              nextP += Math.max(2, (30 - nextP) * 0.25);
            } else if (nextP < 70) {
              nextP += Math.max(1, (70 - nextP) * 0.12);
            } else if (nextP < 90) {
              nextP += Math.max(0.4, (90 - nextP) * 0.06);
            } else if (nextP < 96) {
              nextP += 0.2;
            }

            return {
              ...s,
              progress: Math.min(96, Math.round(nextP * 10) / 10),
            };
          });
        }, 120);

        return {
          ...state,
          isLoading: true,
          visible: true,
          progress: Math.max(state.progress, 18),
          message: nextMessage,
          activeRequests: nextRequests,
        };
      }

      return {
        ...state,
        message: nextMessage,
        activeRequests: nextRequests,
      };
    });
  }

  function setProgress(percent, message = null) {
    const clamped = Math.max(0, Math.min(100, percent));
    update((s) => ({
      ...s,
      progress: clamped,
      ...(message !== null ? { message } : {}),
    }));

    if (clamped >= 100) {
      done();
    }
  }

  function done() {
    update((state) => {
      const nextRequests = Math.max(0, state.activeRequests - 1);

      if (nextRequests === 0) {
        if (tickTimer) {
          clearInterval(tickTimer);
          tickTimer = null;
        }

        // Jump to 100% complete
        fadeTimer = setTimeout(() => {
          update((s) => ({ ...s, visible: false }));

          resetTimer = setTimeout(() => {
            update((s) => ({
              ...s,
              progress: 0,
              message: '',
              isLoading: false,
            }));
          }, 250);
        }, 220);

        return {
          ...state,
          isLoading: false,
          progress: 100,
          activeRequests: 0,
        };
      }

      return {
        ...state,
        activeRequests: nextRequests,
      };
    });
  }

  function reset() {
    clearTimers();
    set(initialState);
  }

  /**
   * Tracks an asynchronous promise or function and manages progress lifecycle.
   * @template T
   * @param {Promise<T> | (() => Promise<T>)} promiseOrFn
   * @param {string} [message]
   * @returns {Promise<T>}
   */
  async function track(promiseOrFn, message = '') {
    start(message);
    try {
      const result = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
      return await result;
    } finally {
      done();
    }
  }

  return {
    subscribe,
    start,
    done,
    set: setProgress,
    track,
    reset,
  };
}

export const progress = createProgressStore();
export default progress;
