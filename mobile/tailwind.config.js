/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC2626',
          light: '#FFEBEE',
          dark: '#B91C1C',
        },
        backgroundLight: '#F4F6F0',
        backgroundSurface: '#FFFFFF',
        textPrimary: '#2D2327',
        textSecondary: '#6E6266',
        textMuted: '#9E9296',
        borderDefault: '#E8DFD8',
      },
    },
  },
  plugins: [],
};
