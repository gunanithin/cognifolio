/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#08090b',
        surface: {
          DEFAULT: '#121419',
          subtle: '#14171d',
          hover: '#181b22',
          active: '#20242e',
        },
        ink: {
          DEFAULT: '#f6f6f6',
          muted: '#b4b8c0',
          dim: '#7e838f',
          inverse: '#08090b',
        },
        border: {
          hairline: '#2b2e35',
          strong: '#3b3f49',
        },
        brand: {
          dark: '#f2b84b',
          hover: '#e5ab3e',
          light: '#16181f',
        },
        status: {
          success: {
            bg: '#12281e',
            border: '#1e5a40',
            text: '#67d8a2',
          },
          warning: {
            bg: '#261c0e',
            border: '#5a4524',
            text: '#f2b84b',
          },
          danger: {
            bg: '#2a1215',
            border: '#632025',
            text: '#f87171',
          },
          indigo: {
            bg: '#18192c',
            border: '#323564',
            text: '#a5b4fc',
          },
          slate: {
            bg: '#161922',
            border: '#2c3342',
            text: '#cbd5e1',
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
