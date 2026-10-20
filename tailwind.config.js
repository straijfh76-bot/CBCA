/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      // Push the desktop-layout threshold above iPad Pro 12.9" portrait (1024px)
      // so tablets always get the mobile-optimized layout.
      lg: '1080px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      keyframes: {
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(34,197,94,0.4)' },
          '50%':       { boxShadow: '0 0 18px 6px rgba(34,197,94,0.75)' },
        },
        'glow-red': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(239,68,68,0.4)' },
          '50%':       { boxShadow: '0 0 18px 6px rgba(239,68,68,0.75)' },
        },
        'shine': {
          '0%':   { transform: 'translateX(-120%) skewX(-20deg)' },
          '100%': { transform: 'translateX(320%) skewX(-20deg)' },
        },
      },
      animation: {
        'shine': 'shine 1.4s ease-in-out infinite',
        'glow-green': 'glow-green 1.5s ease-in-out infinite',
        'glow-red':   'glow-red 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
