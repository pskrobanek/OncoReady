/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primární barva aplikace (tlačítka „Vytvořit“, „Uložit“, aktivní položka menu)
        primary: {
          50: '#eef3ff',
          100: '#dbe4ff',
          400: '#5b7fff',
          500: '#3461ff',
          600: '#2550f0',
          700: '#1c3fd0',
        },
      },
    },
  },
  plugins: [],
}
