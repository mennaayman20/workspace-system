/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {fontFamily: {
        sans: ['"Cairo"', 'sans-serif'],
      },},
  },
  plugins: [],
}

