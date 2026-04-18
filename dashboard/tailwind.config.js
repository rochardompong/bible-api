/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enforce dark mode as default/class-based
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
        // Zinc/Slate Dark Base Palette
        background: '#09090b', // zinc-950
        surface: '#18181b', // zinc-900
        'on-surface': '#fafafa', // zinc-50
        'surface-container-low': '#27272a', // zinc-800
        'surface-container-lowest': '#09090b', // zinc-950
        'surface-container-high': '#3f3f46', // zinc-700
        primary: '#fafafa', // zinc-50
        'on-primary': '#09090b', // zinc-950
        'secondary-container': '#27272a', // zinc-800
        'on-secondary-container': '#a1a1aa', // zinc-400
        'primary-container': '#e4e4e7', // zinc-200 
        'outline-variant': '#3f3f46', // zinc-700
        
        // Semantic Accent Colors from PRD
        'status-emerald': '#10b981', // Emerald 500 (Healthy, success, cache hit)
        'status-red': '#ef4444', // Red 500 (Error, failed, quota critical)
        'status-amber': '#f59e0b', // Amber 500 (Warning, quota rendah, degraded)
        'status-blue': '#3b82f6', // Blue 500 (Info, request volume, neutral metric)
        
        // Shadcn CSS Variables
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        'ambient': '0 20px 40px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
      }
    },
  },
  plugins: [],
}