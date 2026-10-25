/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f6f6',
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#fcfcfc',
          hover: '#f0f0f0',
          active: '#e5e5e5',
        },
        ink: {
          DEFAULT: '#111111',
          muted: '#555555',
          dim: '#777777',
          inverse: '#ffffff',
        },
        border: {
          hairline: '#e5e5e5',
          strong: '#111111',
        },
        brand: {
          dark: '#111111',
          hover: '#2a2a2a',
          light: '#ffffff',
        },
        status: {
          success: {
            bg: '#f0fdf4',
            border: '#bbf7d0',
            text: '#166534',
          },
          warning: {
            bg: '#fefce8',
            border: '#fde047',
            text: '#854d0e',
          },
          danger: {
            bg: '#fef2f2',
            border: '#fecaca',
            text: '#991b1b',
          },
          indigo: {
            bg: '#f5f3ff',
            border: '#ddd6fe',
            text: '#4338ca',
          },
          slate: {
            bg: '#f1f5f9',
            border: '#cbd5e1',
            text: '#0f172a',
          },
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
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
