/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'workplace-teal': {
          DEFAULT: '#0d9488',
          600: '#0d9488',
          700: '#0f766e',
        },
      }
    },
  },
  darkMode: 'class',
  plugins: [],
};
