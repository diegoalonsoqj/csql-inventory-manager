/** @type {import('tailwindcss').Config} */

// Los colores salen de variables CSS (canales RGB) definidas por tema y modo en
// src/index.css, así el cambio de paleta/modo no requiere tocar componentes.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: v('--surface'),
          card: v('--surface-card'),
          hover: v('--surface-hover'),
          border: 'rgb(var(--fg) / calc(<alpha-value> * var(--border-alpha)))',
        },
        accent: {
          DEFAULT: v('--accent'),
          hover: v('--accent-hover'),
          muted: 'rgb(var(--accent) / 0.15)',
        },
        // Texto/iconos sobre fondo de la app y sobre bg-accent.
        fg: v('--fg'),
        'on-accent': v('--on-accent'),
        success: v('--success'),
        danger: v('--danger'),
        warning: v('--warning'),
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
