---
name: coachdata_design_system
description: El sistema de diseño de ESTE producto: 8 paletas de color, tokens de acento, avisos y confirmaciones, estados vacíos. Úsalo al escribir o tocar cualquier componente de src/frontend/src, al elegir un color, al añadir un botón, al mostrar un mensaje al usuario o al pedir confirmación de algo destructivo. Complementa (no sustituye) a las skills globales de React y diseño web, que cubren el framework pero no estas decisiones.
---

# Sistema de diseño CoachData

Lo que ninguna guía general de diseño puede saber: cómo funciona **este**
sistema de temas y qué componentes propios hay que reutilizar.

## El acento no es un color, es una variable por tema

Ocho paletas activadas con `<html data-theme="…">`: `clean`, `slate`, `ivory`,
`forest`/`dark`, `blush`, `sky`, `lilac`, `apricot`. `--accent` es verde oscuro
en unas y **oro claro** en otras. Nunca asumas un valor.

| Papel | Token |
|---|---|
| Fondo de botón primario | `var(--accent)` |
| Texto/icono **encima** de `--accent` | `var(--accent-text)` |
| Texto de acento sobre el fondo de la página | `var(--accent-ink)` |
| Superficies | `var(--bg-surface)` / `var(--bg-root)` |
| Bordes | `var(--border)` |
| Texto | `var(--text-primary)` / `var(--text-muted)` |
| Estados | `var(--success)` / `--danger` / `--warning` |

En `ProjectDesk.css`, que tiene su propio juego de temas, el equivalente de
`--accent-text` se llama `--on-accent`.

**El error clásico**: `text-white` o `color: '#fff'` sobre `var(--accent)`. En
las paletas de acento pálido da 2.2:1 y el botón queda ilegible. Hubo 19 casos.

**El segundo error clásico**: un `<button>` sin `background` declarado cae al
`buttonface` del navegador (`#efefef`) y en modo oscuro aparece como un botón
blanco pegado. Hay un reset al inicio de `index.css`; no lo quites.

## Componentes propios que hay que reutilizar

| En vez de | Usa |
|---|---|
| `alert()` | `notify(msg, { type })` de `useNotifications()` |
| `window.confirm()` | `await confirm({ message, danger: true })` — devuelve una promesa |
| Una fila de ejemplo cuando no hay datos | `<EmptyState />` |
| Formatear fechas o importes a mano | `Intl.DateTimeFormat` / `Intl.NumberFormat` con el `locale` del idioma |

`components/common/Notifications.jsx` ya trae los roles de accesibilidad
correctos (`alert` + `assertive` para errores, `status` + `polite` para el
resto), foco atrapado y Escape en el diálogo. No hagas otro.

## Reglas que se verifican solas

- Sin datos ficticios (`John Doe`, `Acme`, `Visa •••• 4242`). Si el array viene
  vacío, `<EmptyState />`.
- Sin iconos decorativos de estilo IA (`Sparkles`, `Brain`, `Rocket`, `Wand`).
- Un solo `className` por tag: JSX descarta el primero **en silencio** y se
  pierden sus clases. Hubo 23 casos.
- Escrituras a red o a `localStorage` disparadas por tecleo van con debounce.

## Accesibilidad, mínimos

- Contraste AA (4.5:1) para texto sobre su fondo. Mídelo, no lo estimes.
- Botón de solo icono → `aria-label`; el icono, `aria-hidden="true"`.
- `label` con `htmlFor` apuntando al `id` del campo.
- Campos de secretos: `autoComplete="off"`, `spellCheck={false}` y un `name` no
  adivinable, para que el gestor de contraseñas no los trate como credenciales.
- Toda acción destructiva se confirma antes, nunca al primer clic.

## Antes de darlo por hecho

```bash
npm run build && node scripts/governance-check.js
```

Y míralo en el navegador en **modo oscuro**, que es donde aparecen los fallos
de contraste. Si el cambio afecta a color, compruébalo en más de una paleta.
