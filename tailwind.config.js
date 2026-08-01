/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // matches the light blue / teal palette from the plaryu Figma mockups
        brand: {
          50: '#eefcfb',
          100: '#d4f5f2',
          400: '#3fb8ae',
          500: '#2a9d93',
          600: '#1f7d75',
        },
      },
    },
  },
  plugins: [],
}
