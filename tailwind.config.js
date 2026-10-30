/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--bg-primary)',
        surface: {
          DEFAULT: 'var(--bg-card)',
          subtle: 'var(--bg-subtle)',
          hover: 'var(--bg-card-hover)',
          active: 'var(--bg-active)',
        },
        ink: {
          DEFAULT: 'var(--text-main)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          hairline: 'var(--border-color)',
          strong: 'var(--border-dark)',
        },
        brand: {
          dark: '#f2b84b',
          hover: '#e5ab3e',
          light: '#16181f',
        },
        status: {
          success: {
            bg: 'var(--status-emerald-bg)',
            border: 'var(--status-emerald-border)',
            text: 'var(--status-emerald-text)',
          },
          warning: {
            bg: 'var(--status-amber-bg)',
            border: 'var(--status-amber-border)',
            text: 'var(--status-amber-text)',
          },
          danger: {
            bg: 'var(--status-rose-bg)',
            border: 'var(--status-rose-border)',
            text: 'var(--status-rose-text)',
          },
          indigo: {
            bg: 'var(--status-indigo-bg)',
            border: 'var(--status-indigo-border)',
            text: 'var(--status-indigo-text)',
          },
          slate: {
            bg: 'var(--status-slate-bg)',
            border: 'var(--status-slate-border)',
            text: 'var(--status-slate-text)',
          },
        },
      },
      fontFamily: {
        heading: [
          'Outfit',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        paper: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'paper-hover': '0 4px 14px rgba(0, 0, 0, 0.08)',
        'paper-elevated': '0 12px 30px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
