/** @type {import('tailwindcss').Config} */
// Migrado desde el bloque inline de index.html, que configuraba el CDN de
// Tailwind en el navegador. Mismos valores; la diferencia es que ahora el CSS
// se genera en el build y sólo incluye las clases realmente usadas.
module.exports = {
  // Sólo .jsx: los .js del proyecto son hooks, utilidades y clientes de API que
  // no llevan className, pero sí contienen expresiones regulares como [-:|\s].
  // Tailwind las lee como valores arbitrarios y emite selectores inválidos que
  // rompen el minificador.
  content: [
    './index.html',
    './src/**/*.jsx',
  ],
  corePlugins: {
    // El proyecto trae su propio reset en index.css; activar preflight aquí
    // reescribiría estilos base que la aplicación ya define.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bgMain: 'var(--bg-root)',
        bgSurface: 'var(--bg-surface)',
        bgSecondary: 'var(--bg-muted)',
        bgMuted: 'var(--bg-muted)',
        cardBg: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        textMain: 'var(--text-primary)',
        textMuted: 'var(--text-muted)',
        accentSage: 'var(--color-forest-green)',
        accentDeep: 'var(--color-forest-green)',
      },
    },
  },
  plugins: [],
};
