---
name: stripe_billing
description: Facturación con Stripe en este repo — suscripciones, checkout, portal de cliente y webhooks entrantes. Úsalo al tocar /api/billing, stripeBillingService, las tablas billing_*, o cualquier webhook de Stripe. Contiene los dos caminos de webhook que hoy están rotos y los mocks que se hacen pasar por datos de facturación reales.
---

# Stripe Billing

## El camino único: `billing_subscriptions`

**Decidido el 2026-08-16 y ya implementado.** Los webhooks de Stripe los atiende
en exclusiva `routes/stripeWebhookRoutes.js`, que actualiza `billing_subscriptions`
a través de `stripeBillingService`.

```
POST /api/billing/webhooks/stripe   ← el único endpoint de Stripe
```

El dispatcher canónico de `/api/webhooks/:tenant_id/:provider` **sigue siendo el
camino bueno** para Tally, Calendly, Kajabi y WhatsApp Cloud. Solo perdió Stripe.
No lo desmontes, y no vuelvas a registrar Stripe en él: cada evento se
procesaría dos veces, por dos modelos de datos distintos.

`StripeConnector` sigue vivo para **backfill y estado de conexión** —lo registran
`nangoRoutes` y `connectionStatusRoutes` por su cuenta—. Lo que se retiró fue
solo la ingesta de webhooks.

## Las tres reglas que hacían fallar el webhook

Costó tres fallos independientes, cada uno capaz de anular la corrección de los
otros dos. Si tocas este endpoint, respétalas:

**1. Va montado antes de `authMiddleware`.** Stripe no envía `Authorization` ni
`x-organization-slug`. Cuando el webhook vivía dentro de `billingRoutes`, sus
eventos morían en 401 sin llegar al handler. Un webhook se autentica por firma
criptográfica, no por sesión.

**2. Va montado antes del `express.json()` global.** Este es el sutil. `app.js`
aplica `express.json()` a toda la aplicación antes de registrar las rutas; un
`express.raw()` declarado más abajo llega tarde, porque el cuerpo ya se consumió.
`constructEvent` recibe entonces el objeto parseado y falla con *"Webhook payload
must be provided as a string or a Buffer"* incluso con el secreto correcto.

**3. La firma se verifica siempre.** Antes se saltaba con
`NODE_ENV === 'development'`, que es justo el valor del `.env` de este repo:
cualquiera que alcanzara la ruta podía dar por pagada una suscripción. Sin
`STRIPE_WEBHOOK_SECRET` el endpoint responde 503, no procesa a ciegas.

Cubierto por `scripts/test-stripe-webhook.js`, que firma con HMAC-SHA256 real y
comprueba que un cuerpo alterado tras firmar se rechaza.

## Pendiente en el entorno, no en el código

- `.env` tiene `STRIPE_WEBHOOK_SECRET` **comentado** (línea 46). Mientras siga
  así el endpoint responde 503.
- `NODE_ENV=development` en el `.env`. Ya no abre ningún bypass, pero el entorno
  desplegado debe ir en `production`.
- `STRIPE_PRICE_<PLAN>` es obligatorio para crear un checkout.

## Nunca inventes datos de facturación

Se eliminaron varios mocks que devolvían un plan `pro` activo, una factura
`INV-2026-001` de 79 €, un PDF de 31 bytes y —el peor— una sesión de checkout
con `status=success&simulated=true` ante un fallo de la pasarela.

Si no hay dato real: `subscription: null`, lista vacía, o un error que diga qué
falta. `scripts/test-no-fake-data.js` lo verifica en cada CI.

## Esquema

`012_billing_engine.sql` crea `billing_customers`, `billing_subscriptions`,
`billing_invoices` y `billing_events`, todas con `organization_id` referenciando
`organizations` y RLS activada. Las policies están bien escritas.

Recuerda que no te protegen: el backend usa `SUPABASE_SERVICE_ROLE_KEY`, que
bypassa RLS. Filtra siempre por `organization_id` a mano — ver `tenant_isolation_guard`.

Ojo con `015_critical_security_hardening.sql`: envuelve sus policies de billing
en `IF to_regclass('public.billing_subscriptions') IS NOT NULL`. Si 012 no se
aplicó, 015 pasa en silencio sin crear nada.

## Convenciones

- La key se lee como `STRIPE_SECRET_KEY || STRIPE_API_KEY`. En el `.env` solo
  existe `STRIPE_API_KEY`. No introduzcas un tercer nombre.
- `apiVersion: '2023-10-16'` está fijada en dos sitios (`billingRoutes` y
  `stripeBillingService`). Si la subes, súbela en ambos.
- Importes en céntimos (`amountDue: 7900` = 79 €), moneda `eur` por defecto.
- El plan del tenant vive en `organizations.plan_tier`, y el middleware de
  límites es `middlewares/planLimitsMiddleware.js`.

## Verificación

No des por bueno un cambio de webhooks sin esto:

```bash
stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe
```

Debe devolver **200**, no 401. Y con una firma manipulada debe devolver **400**,
no 200. Si el 400 no aparece, la verificación no se está ejecutando.

Para las rutas de lectura: crea una organización sin filas en `billing_subscriptions`
y confirma que la respuesta **no** dice `plan: 'pro'`.
