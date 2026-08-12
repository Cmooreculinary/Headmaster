/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0D0D',
        fire: '#EC5B13',
        steel: {
          1: '#141414',
          2: '#1E1E1E',
          3: '#2A2A2A',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        trench: '6px',
      },
      zIndex: {
        nav: '20',
        overlay: '40',
      },
    },
  },
  plugins: [],
}
