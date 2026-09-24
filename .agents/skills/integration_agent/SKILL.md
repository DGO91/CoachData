---
name: integration_agent
description: Conectores con herramientas externas del coach (Nango, Stripe, Google, Evolution/WhatsApp) y webhooks entrantes. Úsalo al añadir o tocar una integración, al conectar una cuenta de cliente, al recibir un webhook, o al diseñar cómo llegan datos externos a la plataforma. Contiene la decisión de arquitectura pendiente sobre el modelo canónico ("metáfora del pulpo").
---

# Integration Agent

## Dónde estamos de verdad

El Security Vault ofrece ~40 herramientas (HubSpot, Kajabi, Skool, Stripe,
Hotmart, Typeform…) repartidas en 8 categorías. **Pero de esas 40, solo dos
hacen algo**: Stripe y Tally, y únicamente en dirección *entrante* (webhooks).
No existe ninguna llamada saliente a las otras APIs. Un coach puede pegar su
clave de HubSpot hoy y no ocurre nada con ella.

No presentes el catálogo como si funcionara. Un catálogo que promete 40
integraciones y cumple 2 destruye más confianza que no tener catálogo.

## Nango ya está integrado y desaprovechado

`nangoRoutes.js` genera el session token y guarda la conexión, pero solo para
la categoría `crm`. Nango da OAuth gestionado para 400+ APIs: es la respuesta a
"conectar cualquier herramienta" sin escribir el OAuth de cada una. Antes de
construir un conector a mano, comprueba si Nango ya lo cubre.

## La metáfora del pulpo (arquitectura objetivo)

La plataforma es la **cabeza**: el centro de mando donde se ve y se procesa
todo. Los **tentáculos** son los conectores a las herramientas que cada coach
ya usa. El objetivo del producto es que no tenga que abrir ocho pestañas para
llevar su negocio.

Tres capas, y la del medio es la que hace que las otras valgan:

1. **Conexión** — Nango para OAuth; el Vault para claves sueltas.
2. **Normalización** — un modelo canónico propio (`contacto`, `pago`, `sesión`,
   `formulario`) al que **cada conector traduce**. *Esta capa todavía no
   existe, y es la que falta para que el resto tenga sentido.*
3. **Consumo** — el dashboard y los agentes leen del modelo canónico; ese mismo
   modelo se puede exponer por MCP hacia fuera.

La prueba de que está bien construido: si un coach cambia Skool por Kajabi,
**ningún panel ni agente debería enterarse** — solo cambia qué tentáculo
alimenta el mismo torrente. Si hay que tocar el dashboard cada vez que cambia
un conector, no hay una cabeza: hay ocho cabezas con un menú común.

Aclaración conceptual, porque es fácil mezclarlo: **MCP no resuelve conectar la
cuenta de Kajabi de un coach** (eso es OAuth). MCP sirve para que un modelo
descubra y llame herramientas: encaja para dar herramientas a nuestros agentes,
y para que el coach consulte sus datos unificados desde su propio Claude.

Estrategia: **no construir 40 conectores**. Construir la capa 2 y entregar 5
reales de punta a punta. En el catálogo, el resto va marcado como "próximamente",
no como un campo que acepta la clave y la ignora.

## Webhooks entrantes

Arquitectura hexagonal en `modules/webhooks/`: `HandlerRegistry` +
`WebhookDispatcher` + handlers por proveedor. `webhookRoutes.js` es solo el
cableado.

**Verificar la firma siempre, y fallar cerrado:**

- Stripe: `stripe.webhooks.constructEvent(rawBody, sig, secret)`.
- Tally: HMAC-SHA256 en base64 comparado con `crypto.timingSafeEqual`.
- El secreto es **por tenant** (`client_provider_keys.webhook_secret_token`),
  no global.
- La firma se calcula sobre el **cuerpo crudo**. `app.js` lo guarda en
  `req.rawBody` mediante el `verify` de `express.json()`; si alguien reserializa
  el objeto ya parseado, la firma no cuadra nunca.

Sin secreto configurado → error, no "pasar sin verificar".

## Verificación

Un webhook "funciona" cuando rechaza una firma inválida, no solo cuando acepta
una válida. Prueba los dos casos:

```bash
node scripts/test-critical-routes.js
```
