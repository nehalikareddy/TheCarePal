/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Roboto Flex"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['"Lexend"', 'sans-serif'],
        marker: ['"Permanent Marker"', 'cursive'],
      },
      colors: {
        carepal: {
          teal: {
            50: '#f0fdfc',
            100: '#ccfbf8',
            200: '#99f6ee',
            300: '#5eead4',
            DEFAULT: '#3fb6ad', // Signature TheCarePal primary teal
            dark: '#37a79e',
            text: '#04302c',   // Dark contrast text on teal
          },
          dark: {
            DEFAULT: '#101820', // Signature TheCarePal deep obsidian
            hover: '#000000',
            card: '#1e293b',
            footer: '#1a202c',
          },
          blue: {
            DEFAULT: '#0074ff',
            dark: '#005fd1',
            badge: '#2563eb',
          },
          border: {
            light: '#e6ecf1',
            card: '#e0e7ff',
          }
        },
      },
      boxShadow: {
        'carepal-btn': '0 4px 14px rgba(63, 182, 173, 0.28)',
        'carepal-btn-hover': '0 8px 20px rgba(63, 182, 173, 0.42)',
        'carepal-dark': '0 8px 20px rgba(16, 24, 32, 0.25)',
        'carepal-card': '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
