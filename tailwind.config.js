/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.html", "./static/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        "bmkg-blue": {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9d9fe",
          300: "#7cb9fd",
          400: "#3695fa",
          500: "#0d75eb",
          600: "#0055a4",
          700: "#004488",
          800: "#003366",
          900: "#002244",
        },
        "bmkg-orange": {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
