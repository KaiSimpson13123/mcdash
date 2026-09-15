/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#141415',
          900: '#1e1e1f',
          850: '#252526',
          800: '#313233',
          700: '#48494a',
          600: '#5a5b5c',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4f913c',
          500: '#3c8527',
          600: '#2a641c',
          700: '#1d4d13',
        },
        mc: {
          stone: '#313233',
          dark: '#1e1e1f',
          panel: '#48494a',
          border: '#131313',
          accent: '#d0d1d4',
          green: '#3c8527',
          greenhover: '#218306',
          red: '#a82323',
          gold: '#ffaa00',
          diamond: '#55ffff',
        }
      },
      fontFamily: {
        sans: ['MinecraftRegular', 'MinecraftTen', 'monospace'],
        mono: ['MinecraftRegular', 'monospace'],
        heading: ['MinecraftTen', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      }
    },
  },
  plugins: [],
}
