/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#f7f9fb',
        surface: '#f7f9fb',
        'on-surface': '#191c1e',
        'surface-container-low': '#f2f4f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#e6e8ea',
        primary: '#000000',
        'on-primary': '#ffffff',
        'secondary-container': '#d0e1fb',
        'on-secondary-container': '#54647a',
        'primary-container': '#333333', 
        'outline-variant': '#c6c6cd',
        'success-signal': '#497cff',
        'warning-signal': '#fcdeb5',
        'error-signal': '#ba1a1a',
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        'ambient': '0 20px 40px rgba(25, 28, 30, 0.04)',
      },
      borderRadius: {
        'sm': '0.125rem', // Tech data tables
        DEFAULT: '0.25rem',
        'lg': '0.5rem', // Large container / Dashboard modules
        'xl': '0.75rem', // Action buttons (kinetic)
      }
    },
  },
  plugins: [],
}
