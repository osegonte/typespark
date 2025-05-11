/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'dark-blue': '#0f172a',
        'darker-blue': '#0c1222',
        'accent-blue': '#0A84FF',
        'accent-secondary': '#5E5CE6',
        'text-primary': '#FFFFFF',
        'text-secondary': '#94a3b8',
        
        // Light mode colors
        'light-bg': '#FFFFFF',
        'light-card': '#F1F5F9',
        'light-text': '#1C1C1E',
        'light-text-secondary': '#3A3A3C',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}