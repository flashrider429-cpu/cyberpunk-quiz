/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        "neon-cyan": "0 0 15px rgba(6, 182, 212, 0.45)",
        "neon-purple": "0 0 15px rgba(168, 85, 247, 0.45)",
      },
    },
  },
  plugins: [],
};
