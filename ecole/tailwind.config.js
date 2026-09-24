/**
 * Tailwind CSS v3 — choisi pour sa compatibilité avec les anciens téléphones
 * (iOS 12+, Chrome 64+), contrairement à la v4 qui exige iOS 16.4 / Chrome 111.
 * Les jetons reprennent la charte graphique N°1.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563eb', 600: '#1d4ed8', 50: '#eff6ff' },
        navy: '#0f172a',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        mist: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(15, 23, 42, 0.06)',
        glow: '0 10px 40px -10px rgba(37, 99, 235, 0.45)',
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        'float-slow': 'float 14s ease-in-out infinite',
        shine: 'shine 2.8s ease-in-out infinite',
        gradient: 'gradient 12s ease infinite',
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(12px, -18px, 0) scale(1.05)' },
          '66%': { transform: 'translate3d(-10px, 10px, 0) scale(0.97)' },
        },
        shine: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '60%, 100%': { transform: 'translateX(220%) skewX(-20deg)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
    },
  },
  plugins: [],
};
