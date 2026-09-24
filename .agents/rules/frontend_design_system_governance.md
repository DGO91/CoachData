# Frontend Canonical Design System & Token Governance

Verificado por: `node scripts/governance-check.js` (checks `design-tokens`, `contrast`).

## 1. El acento NO es un color fijo

Hay 8 paletas (`clean`, `slate`, `ivory`, `forest`/`dark`, `blush`, `sky`,
`lilac`, `apricot`), activadas con `<html data-theme="…">`. `--accent` vale
verde oscuro en unas y oro claro en otras. **Nunca asumas un valor concreto.**

## 2. Qué token usar según el papel

| Necesitas | Token | Por qué |
|---|---|---|
| Fondo de un botón primario | `var(--accent)` | Cambia con la paleta |
| Texto o icono **encima** de `--accent` | `var(--accent-text)` | Es oscuro en las paletas de acento pálido; blanco fijo daba 2.2:1 |
| Texto de acento **sobre el fondo de la página** | `var(--accent-ink)` | `--accent` como texto se queda en 4.46:1 en oscuro |
| Superficies | `var(--bg-surface)` / `var(--bg-root)` |  |
| Bordes | `1px solid var(--border)` |  |
| Texto | `var(--text-primary)` / `var(--text-muted)` |  |
| Estados | `var(--success)` / `--danger` / `--warning` | Se repintan en oscuro; los del modo claro daban 1.85:1 como texto |

En `ProjectDesk.css`, que tiene su propio juego de temas, el equivalente de
`--accent-text` es `--on-accent`.

## 3. Prohibido

- Hex inline en JSX que duplique un token existente (`#2D4A3A`, `#B8985A`,
  `#2ecc71`, `#d9534f`).
- `text-white` o `color: '#fff'` sobre un fondo `var(--accent)`.
- Colores fijos en un botón primario: `.premium-btn` deriva de `--accent`.

Excepciones legítimas (muestras de color de un selector de temas, fondos de
páginas públicas con identidad propia): márcalas en la línea con
`// governance-allow: design-tokens — <motivo>`.

## 4. Botones

Existen `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger` en
`index.css`, pero **la adopción real es del 15%** (33 usos sobre 220 botones):
la mayoría usa `premium-btn`, `pd-btn`, `cd-btn` o estilos en línea. No
declares que la regla se cumple. Al escribir un botón nuevo, usa las clases
canónicas; al tocar uno existente, migrarlo es bienvenido pero no obligatorio.

## 5. Todo botón necesita fondo declarado

Un `<button>` sin `background` cae al `buttonface` del navegador (`#efefef`) y
en las paletas oscuras aparece como un botón blanco pegado. Hay un reset al
principio de `index.css` que lo neutraliza; no lo elimines.

## 6. Contraste

Mínimo AA (4.5:1) para texto de botón sobre su fondo. Si dudas, mídelo — no lo
estimes a ojo.
