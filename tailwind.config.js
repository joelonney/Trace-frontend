/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b1220',
          900: '#101a2c',
          800: '#16233a',
          700: '#1f314e',
          600: '#2c4468',
          500: '#3d5a86',
        },
        slate: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d8dce3',
          300: '#b9c0cc',
          400: '#8b95a7',
          500: '#647089',
          600: '#4c5770',
          700: '#3a435a',
          800: '#282e40',
          900: '#1a1f2c',
        },
        accent: {
          50: '#eef6f6',
          100: '#d6ebe9',
          400: '#2f9c94',
          500: '#1f867e',
          600: '#187169',
        },
        status: {
          success: '#1f8a5f',
          successBg: '#e7f5ee',
          warning: '#b3760f',
          warningBg: '#fbf1de',
          danger: '#b3261e',
          dangerBg: '#faeaea',
          info: '#2c5aa0',
          infoBg: '#e9eff9',
          neutral: '#5a6472',
          neutralBg: '#eef0f3',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 26, 44, 0.06), 0 1px 1px 0 rgba(16, 26, 44, 0.04)',
      },
    },
  },
  plugins: [],
}
