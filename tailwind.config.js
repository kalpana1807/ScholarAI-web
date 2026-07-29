/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae5ff',
          200: '#bdd2ff',
          300: '#90b4ff',
          400: '#5e8aff',
          500: '#3b66ff',
          600: '#2447f5',
          700: '#1c36e0',
          800: '#1d2fb5',
          900: '#1e2d8f',
          950: '#161e54',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e3',
          300: '#b1b8ca',
          400: '#8691ab',
          500: '#67718f',
          600: '#525a75',
          700: '#444961',
          800: '#3b3f53',
          900: '#1f2230',
          950: '#13151f',
        },
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgb(16 22 56 / 0.10), 0 4px 16px -4px rgb(16 22 56 / 0.08)',
        card: '0 1px 3px rgb(16 22 56 / 0.06), 0 8px 24px -8px rgb(16 22 56 / 0.10)',
        glow: '0 0 0 1px rgb(59 102 255 / 0.20), 0 8px 32px -8px rgb(59 102 255 / 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'flip': 'flip 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        flip: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
      backgroundImage: {
        'grid-light': 'linear-gradient(rgb(16 22 56/0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(16 22 56/0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
