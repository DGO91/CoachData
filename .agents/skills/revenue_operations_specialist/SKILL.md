---
name: revenue_operations_specialist
description: El Revenue Suite: LeadHub, Call Intelligence, propuestas y cierre de tratos. Úsalo al tocar cualquier pantalla de src/frontend/src/components/revenue/, las rutas /api/revenue/*, el pipeline de la organización, o el flujo de propuesta pública que ve el cliente final.
---

# Revenue Operations Specialist

Cubre el módulo comercial: de prospecto captado a trato cerrado.

## Mapa

| Pantalla | Ruta backend |
|---|---|
| `LeadHub.jsx` | `GET /api/revenue/leads`, `POST /leadhub-sync` |
| `CallIntelligenceCenter.jsx` | `POST /call-intelligence/upload`, `POST /call-approve` |
| `DealClosingWorkspace.jsx` / `tabs/DealsAndProposalsTab.jsx` | `POST /proposal-approve` |
| `RevenueChiefAI.jsx` | `POST /chief-approve` |
| `PipelineAnalytics.jsx` | — (ver abajo) |

Tablas: `crm_contacts`, `crm_deals`, `proposals`, `proposal_items`,
`proposal_acceptance_logs`.

## Aviso: hay métricas inventadas en producción

`PipelineAnalytics.jsx` muestra cifras **hardcodeadas** — "184 leads captados",
"142 calificados por IA", "7.6% de conversión", "11d de cierre medio". No salen
de ninguna consulta: están escritas en el componente.

Es la peor clase de dato falso, porque parece un informe y el coach puede tomar
decisiones con él. Al tocar esa pantalla, o lo conectas a datos reales o lo
marcas explícitamente como demo. No lo dejes como está fingiendo que funciona.

## El pipeline es configurable por organización

Las etapas viven en `organizations.settings_json.pipeline_stages`, con
`['Lead Captured', 'AI Qualified', 'Call Logged', 'Proposal Sent']` como
respaldo. No hardcodees etapas: cada coach define las suyas desde Configuración.

## Coherencia de middlewares

Casi todas las rutas de `revenueRoutes.js` heredan `authMiddleware` y
`tenantContextMiddleware` del montaje en `app.js`, pero **`POST /prospect` los
repite en la propia ruta**. Funciona, pero si tocas ese archivo, comprueba que
toda ruta nueva quede protegida y no dependas de que el patrón sea uniforme.

## Propuestas públicas

`publicProposalRoutes` se monta **sin autenticación** (`/api/public/proposals`):
es la propuesta que el cliente final abre desde un enlace. Al tocar ahí:

- Nunca expongas datos de la organización más allá de la propuesta concreta.
- El identificador tiene que ser no adivinable — un id secuencial permite
  enumerar propuestas de otros clientes.
- Las aceptaciones se registran en `proposal_acceptance_logs`, que permite
  inserción pública pero **no** lectura pública.

## Al cerrar una tarea aquí

```bash
node scripts/governance-check.js
```

Y comprueba en el navegador que la pantalla se ve bien **sin datos**: la mayoría
de estas vistas se diseñaron con el array lleno. Si viene vacío, toca
`<EmptyState />`, nunca una fila de ejemplo.
