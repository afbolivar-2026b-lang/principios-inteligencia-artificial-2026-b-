// Mapeo de los tokens en Tailwind. Los componentes usan clases como bg-surface o text-text-muted, nunca colores hex directos.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg': 'var(--color-bg)',
        'surface': 'var(--color-surface)',
        'border': 'var(--color-border)',
        'border-input': 'var(--color-border-input)',
        'text': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'accent': 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
        'on-accent': 'var(--color-on-accent)',
        'focus': 'var(--color-focus)',
        'danger': 'var(--color-danger)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'hero-from': 'var(--color-hero-from)',
        'hero-mid': 'var(--color-hero-mid)',
        'hero-to': 'var(--color-hero-to)',
        'on-hero': 'var(--color-on-hero)',
        'hero-border': 'var(--color-hero-border)',
        'brand': 'var(--color-brand)'
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        sm: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        base: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        lg: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        xl: ['28px', { lineHeight: '34px', fontWeight: '700' }],
        display: ['40px', { lineHeight: '44px', fontWeight: '700' }]
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
      transitionDuration: { fast: '120ms', base: '200ms' },
      maxWidth: { content: '480px' },
    },
  },
};
