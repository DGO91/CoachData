---
name: e2e_testing
description: Escribir tests de verdad en este repo — E2E con Playwright y tests de integración de API. Úsalo al crear cualquier script scripts/test-*.js, al añadir cobertura de una pantalla o endpoint, al tocar el gate de CI, o cuando necesites demostrar que algo funciona en vez de narrarlo. Complementa a qa_auditor: él audita tests ajenos, este los escribe.
---

# E2E Testing

## La regla que gobierna todo

**Un test que no puede fallar no es un test.** Antes de escribir la primera
línea, decide qué línea concreta pondrá el veredicto en FAILED. Si no la tienes,
no empieces.

Este repo ya tiene dos cadáveres de esa regla:
`scripts/test-auth-session-recovery.js.THEATER_NOT_A_TEST` y
`scripts/test-crm-persistence-stress.js.THEATER_NOT_A_TEST`. Se renombraron
porque no contenían ni un `assert`, `throw` ni `expect` — imprimían `[PASS]`
pasara lo que pasara. `scripts/governance-check.js` los detecta con el check
`fake-test`. No produzcas un tercero.

## Patrón de referencia

Copia la estructura de `scripts/test-tenant-isolation-regression.js`. Su
cabecera declara los requisitos y los cumple:

- servidor efímero real vía `createApp()`, no mocks
- JWT reales de Supabase Auth para dos usuarios de organizaciones distintas
- cliente **ANON + JWT del usuario** para probar RLS, nunca `service_role`
- **control positivo**: el usuario A debe ver >0 filas de su propia org. Sin
  esto, un test que "pasa" puede estar simplemente hablando con una BD vacía
- `assert` estricto, y `SKIP`/`FAIL` en las ramas de error — jamás `PASS`

Ese control positivo es lo que separa este archivo de los dos archivados.

## Contexto de la plataforma

Lo que cualquier test contra la API necesita saber:

| Qué | Valor |
|---|---|
| Backend | `http://localhost:4000` |
| Dev server Vite | `http://localhost:5175` (`strictPort: true`) |
| Proxy | Vite manda `/api` y `/svc` al 4000 |
| Auth | header `Authorization: Bearer <JWT de Supabase>` |
| Tenant | header `x-organization-slug: <slug>` — **obligatorio** |

Sin `x-organization-slug`, `tenantContextMiddleware` corta con **400**, no 401.
Si tu test recibe 400 donde esperabas datos, es esto y no las credenciales.

El frontend lo lee de `localStorage` en `core/api/authFetch.js`
(`coachdata_org_slug`, con fallback `'default'`). En Playwright, siémbralo con
`addInitScript` antes de cargar la página, no después.

## Trampas de este backend

**Un endpoint inexistente devuelve 200 con HTML.** El catch-all
`app.get('*')` de `app.js` sirve `index.html` para todo lo que no matchee. Un
test que solo compruebe `status === 200` pasa contra una ruta que no existe.
**Asserta siempre el `content-type` o el cuerpo parseado**, nunca el status a
secas. Es el mismo síntoma que el `Unexpected token '<'` del frontend.

**Los mocks silenciosos falsean resultados.** El `supabaseProxy` devuelve
`{data: null, error: null}` sin cliente, `tenantContextMiddleware` inventa un
tenant `00000000-...` con rol `owner`, y `/api/billing/subscription` devuelve
un plan `pro` hardcodeado. Un test contra un entorno mal configurado puede
pasar en verde absoluto. Empieza cada suite verificando que hay conexión real
—una lectura conocida que devuelva filas— y aborta si no.

**Rutas montadas dos veces.** `/api/agents` y `/api/invitations` tienen dos
routers cada uno; gana el primero registrado. Si pruebas un path de esos,
verifica cuál responde de verdad antes de dar por bueno el resultado.

## Playwright

`playwright@^1.60` ya está en `dependencies`. No hay `playwright.config.js`:
si montas la suite E2E, créalo con `webServer` apuntando a `npm run dev`
(5175) y `reuseExistingServer: !process.env.CI`.

Selectores por rol y texto visible (`getByRole`, `getByLabel`), no por clase
CSS: el frontend usa Tailwind y las clases cambian en cada rediseño.

Las pantallas grandes —`ContentDesk`, `ProjectDesk`, `MessageBank`,
`AIReportsHub`— son las de mayor riesgo de regresión y las que menos cobertura
tienen. Empieza por ahí.

## CI

`.github/workflows/governance-gate.yml` corre build, `check-ui-governance.js`,
`test-api-security-smoke.js` y `test-tenant-isolation-regression.js`.

Dos cosas que arreglar al tocarlo: usa **Node 20** mientras `package.json`
exige `>=22 <23`, y no ejecuta `governance-check.js`, que es justamente el que
caza los tests de mentira. Añádelo.

## Antes de decir que algo pasa

Rompe el código a propósito y vuelve a correr el test. Si sigue en verde, el
test no vale y lo que tienes que arreglar es el test. Solo después reporta.
