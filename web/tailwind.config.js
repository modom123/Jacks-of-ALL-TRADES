/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        lions: {
          blue: '#0076B6',
          'blue-light': '#3399CC',
          silver: '#B0B7BC',
          black: '#080C10',
          dark: '#0D1117',
          mid: '#111820',
        },
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        opensans: ['var(--font-opensans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
