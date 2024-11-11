/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          '0%, 2%, 5%,  100%': { transform: 'rotate(0deg)' },
          '1': { transform: 'rotate(3deg)' },
          '3%': { transform: 'rotate(-3deg)' },
          '4%': { transform: 'rotate(3deg)' },
        }
      },
      animation: {
        wiggle: 'wiggle 3s linear infinite'
      }
    }
  },
  plugins: [],
}
