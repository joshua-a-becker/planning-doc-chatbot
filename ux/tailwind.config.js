/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          '0%, 3%, 12%,  100%': { transform: 'rotate(0deg)' },
          '1%': { transform: 'rotate(3deg)' },
          '5%': { transform: 'rotate(-3deg)' },
          '7%': { transform: 'rotate(3deg)' },
        }
      },
      animation: {
        wiggle: 'wiggle 2s linear infinite'
      }
    }
  },
  plugins: [],
}
