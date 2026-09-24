import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';

// The 8 CoachData glass themes. `swatch` is the theme's accent colour, shown as a dot.
const THEMES = [
  { id: 'clean',   name: 'Clean',   swatch: '#2D4A3A', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Dark Emerald Forest Green
  { id: 'slate',   name: 'Slate',   swatch: '#3F4A54', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Cool Slate Steel Blue-Grey
  { id: 'ivory',   name: 'Ivory',   swatch: '#B8985A', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Warm Gold Amber
  { id: 'forest',  name: 'Forest',  swatch: '#111A15', dark: true  }, // Deep Night Midnight Dark
  { id: 'blush',   name: 'Blush',   swatch: '#C98B96', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Soft Rose Blush
  { id: 'sky',     name: 'Sky',     swatch: '#7FA8C4', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Clear Sky Azure Blue
  { id: 'lilac',   name: 'Lilac',   swatch: '#A38CC0', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Muted Lavender Lilac
  { id: 'apricot', name: 'Apricot', swatch: '#D9A273', dark: false }, // governance-allow: design-tokens — muestra de color del selector de temas // Warm Peach Apricot
];

// legacy stored values map onto the new palette ids
const normalize = (t) => (t === 'light' ? 'clean' : t === 'dark' ? 'forest' : t);

export default function ThemePicker({ theme, setTheme, language }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = normalize(theme);
  const active = THEMES.find((t) => t.id === current) || THEMES[0];

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  const pick = (id) => {
    // suppress the cross-fade so the palette swap is instant, not smeared
    document.documentElement.classList.add('theme-transition-disable');
    setTheme(id);
    setOpen(false);
    setTimeout(() => document.documentElement.classList.remove('theme-transition-disable'), 60);
  };

  return (
    <div className="theme-pick" ref={ref}>
      <button
        className="btn-top theme-pick-btn"
        onClick={() => setOpen((o) => !o)}
        title={language === 'es' ? 'Tema' : 'Theme'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="theme-swatch" style={{ background: active.swatch }} />
        <Palette size={15} />
      </button>

      {open && (
        <div className="theme-pick-menu" role="menu">
          <p className="theme-pick-label">{language === 'es' ? 'Tema' : 'Theme'}</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-pick-item ${current === t.id ? 'active' : ''}`}
              onClick={() => pick(t.id)}
              role="menuitemradio"
              aria-checked={current === t.id}
            >
              <span className="theme-swatch" style={{ background: t.swatch }} />
              <span className="theme-pick-name">{t.name}</span>
              {t.dark && <span className="theme-pick-tag">{language === 'es' ? 'Oscuro' : 'Dark'}</span>}
              {current === t.id && <Check size={14} className="theme-pick-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
