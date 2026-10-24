/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          200: '#C7CBFE',
          300: '#A4ACFC',
          400: '#7B84FA',
          500: '#4F5AE4', // Parham's signature brand primary
          600: '#3D45CC',
          700: '#2F34A8',
          800: '#272B87',
          900: '#23266E',
          950: '#151745',
        },
      },
      boxShadow: {
        'glass-sm': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass-md': '0 8px 30px -4px rgba(0, 0, 0, 0.08)',
        'glass-glow': '0 0 35px -5px rgba(79, 90, 228, 0.25)',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.625rem',
        '2xl': '0.75rem',
        '3xl': '0.875rem',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        vazir: ['Vazirmatn', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
