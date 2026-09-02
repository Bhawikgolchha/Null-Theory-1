/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        pulse: 'var(--pulse)',
        flare: 'var(--flare)',
        acid: 'var(--acid)',
        slate: 'var(--slate)',
        'paper-card': 'var(--paper-card)',
      },
      fontFamily: {
        display: ['"Clash Display"', 'sans-serif'],
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hard': '3px 3px 0px 0px var(--ink)',
        'hard-lg': '5px 5px 0px 0px var(--ink)',
        'hard-sm': '2px 2px 0px 0px var(--ink)',
      }
    },
  },
  plugins: [],
}
