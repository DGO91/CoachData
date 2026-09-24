# REQUISITOS · CoachData SaaS Suite

Registro de cumplimiento del estándar de construcción (skill `estandar-app`). Sin evidencia no hay `hecho`.

**Nivel:** N2 · Producción (guarda datos personales de coaches y de sus clientes, y va a cobrar)
**Dueño técnico:** Diógenes González
**Última revisión:** 2026-09-19, verificada ejecutando contra el repo, Supabase y `app.coachdata.example`
**Plan para cerrarlo:** [docs/PLAN_CUMPLIMIENTO_N2_2026-09-19.md](docs/PLAN_CUMPLIMIENTO_N2_2026-09-19.md)

## Qué es

Sistema operativo multi-tenant para coaches y consultores: unifica sus herramientas (Stripe, Tally, Calendly, Google) y les entrega informes por agentes de IA.

Requisitos funcionales, etapas y decisiones de producto: [docs/MAPA_DEL_PROYECTO.md](docs/MAPA_DEL_PROYECTO.md). Este archivo cubre lo **no funcional**.

## Cumplimiento

Estados: `pendiente` · `parcial` · `hecho` · `no aplica (motivo)`.

### Bloqueantes antes del primer coach

| Área | Ítem | Estado | Evidencia / qué falta |
|---|---|---|---|
| Infra | Backup restaurado con éxito | **pendiente** | PITR de Supabase sin verificar desde el 12-ago. Los volcados JSON de `backups/` pesan 50 KB y se detuvieron el 14-ago. Nunca se ha probado una restauración |
| Entornos | Staging separado de producción | **pendiente** | Hay un solo proyecto Supabase (`driqkbnksvkrzdngktyj`): desarrollo local, CI y producción usan la misma base |
| Seguridad | Sin secretos por defecto en el código | **hecho** (desplegado 2026-09-19) | F0.1 y F0.2 (2026-09-19). `INTERNAL_SECRET` sin fallback: `shared/internalSecret.js` impide arrancar si falta o si vale el literal publicado; CI usa uno aleatorio por ejecución. El dispatcher de webhooks salientes no envía sin secreto propio; `tests/integration/test_outbound_webhooks.js` verifica el HMAC y da 3 fallos contra el código anterior |
| Observabilidad | Captura de errores | **pendiente** | No hay Sentry ni equivalente en backend ni frontend |
| Observabilidad | Monitoreo externo + alerta a una persona | **pendiente** | El endpoint ya sirve (F0.6): `/api/system/health` responde 503 si la base no contesta, probado por `tests/integration/test_health_endpoint.js`. Falta el monitor externo y la alerta (F3) |
| Infra | SSL que se renueva **y se recarga** | **desplegado, falta la prueba real** | F0.4: nginx se recarga cada 12 h (desplegado 2026-09-19). Se cierra cuando, antes del **13-nov-2026**, `openssl s_client` muestre una fecha de caducidad nueva |
| Correo | Proveedor transaccional para correos de Auth | **pendiente** | No hay SMTP propio en el repo. Si Auth usa el SMTP por defecto de Supabase, el límite es de pocos correos por hora: registros y recuperaciones se pierden en cuanto haya tráfico. Verificar en el dashboard (Auth → SMTP) |

### Resto de N2

| Área | Ítem | Estado | Evidencia / qué falta |
|---|---|---|---|
| Entrega | Despliegue con rollback | **pendiente** | `deploy.sh` hace rsync desde el portátil y `docker compose up --build`. CI no despliega. No hay imagen anterior etiquetada a la que volver. **Medido el 2026-09-19: la app estuvo caída unos 25 minutos**, porque el script apaga los contenedores antes de construir, y construir y exportar 10 imágenes en el droplet tarda eso |
| Entrega | Secretos de producción gestionados | **pendiente** | rsync no excluye `.env`: producción corre con el `.env` del portátil. Rotar una clave obliga a redesplegar |
| Pruebas | E2E de flujos críticos | **pendiente** | Ni Playwright ni config. `tests/e2e/leadhub.spec.ts` y `tests/e2e/prospect.e2e.test.js` siguen siendo stubs |
| Pruebas | Aislamiento de tenants en CI | **parcial** | 22 de 28 comprobaciones corren en CI; las 6 que necesitan base real se omiten (ver paso 10 del gate). Bloqueado por la falta de staging |
| Seguridad | Cabeceras sin duplicados | **hecho** | F0.3. En producción, el 2026-09-19: un solo HSTS (`max-age=63072000; includeSubDomains`) y un solo `x-frame-options: DENY` |
| Seguridad | Protección de contraseñas filtradas | **pendiente** | Aviso de Supabase: HaveIBeenPwned desactivado. Un clic en Auth → Password security |
| Seguridad | `search_path` fijo en funciones | **hecho** | Migración 040 aplicada; el aviso desapareció de los advisors y el trigger sigue actualizando `updated_at` |
| Mantenimiento | Actualización automática de dependencias | **pendiente** | No hay Dependabot ni Renovate. `npm audit` de la raíz: 3 moderadas, 0 altas. Pero los `package.json` de los agentes tienen los suyos propios: el build del 2026-09-19 reportó hasta **1 crítica y 5 altas** en uno de ellos. 20 paquetes desactualizados en la raíz |
| Mantenimiento | Alerta de presupuesto por proveedor | **pendiente** | Sin tope en Supabase, DigitalOcean, OpenAI, Anthropic ni Google |
| RGPD | Exportar datos del usuario | **pendiente** | La política de privacidad promete portabilidad «desde tu Perfil», pero no existe el flujo |
| Pagos | Planes, reembolsos y conciliación | **pendiente** | Etapa 7 del mapa, aplazada a propósito hasta saber qué se cobra |
| Calidad | Rendimiento, accesibilidad y compatibilidad medidos | **pendiente** | Sin Lighthouse, sin auditoría WCAG, sin prueba en móvil documentada |
| Analítica | Analítica de producto con consentimiento | **pendiente** | No hay analítica ni banner de cookies |

### Hecho

| Área | Ítem | Evidencia |
|---|---|---|
| Datos | Migraciones versionadas | 39 en `supabase/migrations/`, índice en `MIGRATIONS_INDEX.md` |
| Datos | RLS y aislamiento entre tenants | Usuario B ve 0 filas de la org A con JWT real; `tenant_filter_audit` en CI |
| Datos | Índices | Migración 034 (cobertura y duplicados) |
| Seguridad | Secretos fuera de git | `.env`, `deploy.env` y `backups/` en `.gitignore` y fuera del historial |
| Seguridad | Rate limiting | Global, auth, inteligencia y rutas públicas (`app.js:58-74`, `public*Routes.js`) |
| Seguridad | CSP y cabeceras | CSP estricta servida en producción |
| Seguridad | Credenciales de terceros cifradas | AES-256-GCM por tenant; rotación de clave probada en CI |
| Pagos | Firma de webhooks de Stripe | `constructEvent` en `stripeWebhookRoutes.js:55`; `STRIPE_WEBHOOK_SECRET` definido |
| Pagos | Idempotencia de eventos | `webhook_inbox` (migración 027) + ingesta: el mismo evento dos veces deja 1 fila |
| Correo | SPF, DKIM y DMARC del dominio | `dig`: SPF con Google y MailerLite, DKIM `google._domainkey`, DMARC `p=quarantine` |
| Entrega | CI en cada push y PR | `.github/workflows/governance-gate.yml`, 10 pasos |
| Legal | Privacidad y términos publicados | `privacy.html`, `terms.html`, `LegalDocuments.jsx`, en inglés y en español |
| RGPD | Borrar la propia cuenta | `Profile.jsx:107` llama a la RPC `delete_own_user` |

## Riesgos abiertos

- **WhatsApp por API no oficial** (mapa, 12-ago): puede bloquear el número del coach. Existe `test_whatsapp_cloud_connector.js`; confirmar si la migración a la API oficial ya es el camino por defecto.
- **Google Cloud en modo *Testing***: los tokens caducan a los 7 días. Confirmar el estado de publicación.
- **Todo depende de una sola persona y de un solo portátil**: el despliegue, el `.env` de producción y los volcados de `backups/`.
