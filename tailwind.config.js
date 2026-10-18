/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#30DCFF',
        'primary-dark': '#05839D',
        'bg-dark': '#050f33',
        'bg-card': '#1a394d',
      },
      fontFamily: {
        'd-din': ['D-DIN', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
