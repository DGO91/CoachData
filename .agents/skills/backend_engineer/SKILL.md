---
name: backend_engineer
description: Rutas Express y controladores de ESTE repo. Úsalo al crear o mover una ruta, al montarla en app.js, cuando el frontend reciba "Unexpected token '<'" al llamar a la API, cuando un endpoint devuelva 401/403/404 inesperado, o al diagnosticar por qué una pantalla sale vacía sin errores visibles.
---

# Backend Engineer

## La trampa nº1: un endpoint inexistente devuelve 200, no 404

`app.js` termina con `app.get('*')` sirviendo el `index.html` del SPA. Una
petición a una ruta que no existe **cae ahí**: responde `200 OK` con HTML, y el
`res.json()` del cliente revienta con `Unexpected token '<'`.

Consecuencias:

- El síntoma de "ruta mal montada" no es un 404, es una pantalla vacía y un
  error de JSON en consola. Se puede pasar semanas sin detectarlo.
- Cualquier verificación de "la API responde 200" tiene que comprobar que el
  cuerpo sea JSON, no solo el código de estado.

## La trampa nº2: el prefijo duplicado

El prefijo lo pone **el montaje**, una sola vez. Si el router declara sus rutas
con el prefijo dentro, se duplica:

```js
// MAL — la ruta real acaba siendo /api/admin/tenants/admin/tenants
router.get('/admin/tenants', …);
app.use('/api/admin/tenants', …, tenantRoutes);

// BIEN
router.get('/tenants', …);
app.use('/api/admin', …, adminRoutes);
```

Esto ocurrió de verdad y dejó todo el Control Center vacío. `adminRoutes.js` es
el patrón correcto. **`userRoutes` sigue montado en `/api/users` con rutas
internas `/users`, dando `/api/users/users`** — está pendiente de auditar si
alguien lo llama.

Al añadir una ruta, comprueba siempre la ruta *efectiva*, no la declarada:

```bash
grep -n "app.use('/api" src/backend/infrastructure/web/app.js
```

## Middlewares según lo que expone la ruta

| La ruta expone | Monta |
|---|---|
| Datos de una organización | `authMiddleware, tenantContextMiddleware` |
| Administración | `+ requireOwnerRole` |
| Algo del usuario sin contexto de org (unirse a una org, vault propio) | solo `authMiddleware` |
| Webhook externo | ninguno — verifica **firma** dentro del handler |

Detalle que se olvida: una ruta para **unirse** a una organización no puede
exigir `tenantContextMiddleware`, porque el usuario todavía no es miembro de
ninguna.

## Convenciones

- Respuestas: `{ success: true, … }` o `{ error: '<mensaje descriptivo>' }` con
  el código HTTP correcto.
- Valida `req.body` antes de tocar Postgres.
- El id de tenant sale de `req.tenant.id`, **nunca** del body ni de la query.
- Comprueba sintaxis antes de reiniciar: `node -c <archivo>`.
- Los secretos tienen fallbacks inseguros en el código (`JWT_SECRET`,
  `INTERNAL_SECRET`). Impórtalos de `config/env.js`, no redeclares el fallback.

## Verificación

No basta con que arranque el servidor. Comprueba la ruta con `curl` y mira el
**cuerpo**:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/tu/ruta   # ¿401 sin token?
curl -s http://localhost:4000/api/tu/ruta | head -c 100                       # ¿JSON o HTML?
```

Si sale `<!DOCTYPE`, la ruta no existe aunque el status sea 200.
