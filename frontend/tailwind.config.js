/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      colors: {
        primary: {
          50: '#e6f0ff',
          100: '#b3d7ff',
          200: '#80bfff',
          300: '#4da6ff',
          400: '#1a8cff',
          500: '#0066cc',  // 主蓝色
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },
        navy: {
          50: '#e8eaf2',
          100: '#c3c9de',
          200: '#9ea7ca',
          300: '#7986b6',
          400: '#5465a2',
          500: '#3a4d8f',  // 深蓝
          600: '#2e3e72',
          700: '#232f56',
          800: '#171f39',
          900: '#0c101d',
        },
      },
    },
  },
  plugins: [],
}
