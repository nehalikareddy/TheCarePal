/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        care: {
          teal: {
            50: '#F0FDFA',
            100: '#CCFBF1',
            200: '#99F6E4',
            500: '#14B8A6',
            600: '#0D9488', // Deep Care Teal
            700: '#0F766E',
            800: '#115E59',
            900: '#134E4A',
          },
          coral: {
            light: '#FDF2E9',
            DEFAULT: '#E07A5F', // Warm Coral
            dark: '#C86248',
          },
        },
      },
    },
  },
  plugins: [],
}
