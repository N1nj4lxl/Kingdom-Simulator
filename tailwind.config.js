/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        good: 'var(--good)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        purple: 'var(--purple)'
      },
      boxShadow: { soft: 'var(--shadow)' },
      borderRadius: { '2xl': '1rem' }
    }
  },
  plugins: []
};
