/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#E8F3FF',
          100: '#BEDAFF',
          200: '#94C2FF',
          300: '#6AA7FF',
          400: '#408CFF',
          500: '#165DFF',
          600: '#0E42D2',
          700: '#0A2BA6',
          800: '#061D79',
          900: '#03104D',
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 0 0 rgba(245, 63, 63, 0.4)',
          },
          '50%': {
            opacity: '0.95',
            boxShadow: '0 0 0 10px rgba(245, 63, 63, 0)',
          },
        },
      },
    },
  },
  plugins: [],
};
