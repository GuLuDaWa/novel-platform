/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4f3",
          100: "#fce7e5",
          200: "#f9d0cd",
          300: "#f4a8a3",
          400: "#ec786f",
          500: "#e04a3f",
          600: "#c8331f",
          700: "#a52811",
          800: "#862413",
          900: "#702316",
        },
      },
    },
  },
  plugins: [],
};
