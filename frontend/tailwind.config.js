/**
 * @file tailwind.config.js
 * @description Tailwind CSS Configuration. Configures content purge paths, custom brand colors (luminaPurple, luminaLight), and dark mode class strategy.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your custom brand colors from the mockup!
        luminaPurple: '#2d1b64', 
        luminaLight: '#f3f4f6',
      }
    },
  },
  plugins: [],
}