---
name: ai_orchestrator
description: Las dos capas de agentes de IA del repo y los prompts protegidos. Úsalo antes de tocar cualquier agente de IA, al registrar uno nuevo, al cambiar un prompt o el proveedor de LLM, al depurar por qué un agente no responde, y siempre que confundas los agentes en proceso con los microservicios del mismo nombre.
---

# AI Orchestrator

## Dos capas distintas con los mismos nombres

Confundirlas es el error más fácil del repo, porque comparten nombre y son
sistemas separados.

**1. Orquestador en proceso** — `application/orchestrator/`
Un `AgentRegistry` singleton guarda clases con `execute(input, context)` o
`run()`. `ExecutionPipeline.execute()` resuelve el proveedor
(`openai` | `anthropic` | `gemini`, por defecto `AI_DEFAULT_PROVIDER`), invoca
al agente y **registra cada ejecución en la tabla `ai_agent_logs`** con duración
y estado. Registrados: `prospect_analyzer`, `pre_call`, `weekly_digest`,
`evening_summary`, `knowledge_search`.

**2. Microservicios** — `src/agents/`
Apps independientes, cada una en su puerto fijo, unas en Node y otras en Python
con su propio venv. `bootAllAgents` las lanza como procesos hijo; con
`DOCKER_ENV=true` no se lanzan, porque cada una corre en su contenedor.

Antes de tocar un agente, identifica **de cuál de las dos capas** hablas.

## Prompts protegidos

Solo `ProspectAnalyzerAgent.js` está autorizado para refactor de prompts vía
`getEffectiveAISettings`. Los prompts de `WeeklyDigestAgent`,
`EveningSummaryAgent`, `PreCallAgent` y `KnowledgeSearchAgent` están **en
producción y protegidos**: no los refactorices aunque veas margen de mejora.
Un cambio de prompt no rompe el build ni falla ningún test — se descubre
cuando el cliente recibe una salida peor.

## Los agentes hoy están ciegos a las integraciones

No hay capa de herramientas: los agentes no leen datos de las herramientas que
el coach conectó. Es la pieza que falta para que la plataforma sea un
"sistema operativo" y no cinco agentes sueltos. Ver `integration_agent` para el
modelo canónico del que deberían leer.

## Diagnóstico

- `/api/agents/status` da el estado de los subsistemas. Tiene caché en memoria
  de 5s: una segunda llamada dentro de la ventana devuelve `cached: true` con
  `cacheAgeMs`.
- Reiniciar un subsistema sin tumbar el servidor:
  ```bash
  curl -X POST http://localhost:4000/api/restart-subsystem \
    -H "Content-Type: application/json" -d '{"key":"prospect"}'
  ```
- Si un agente Python no arranca, suele ser el venv o el puerto ocupado por un
  proceso viejo, no el código.
- Toda ejecución queda en `ai_agent_logs`: mira ahí antes de suponer.

## Al añadir un agente

1. Decide la capa (en proceso salvo que necesite runtime propio).
2. Regístralo en el `AgentRegistry`; si es legacy, `wrapLegacyAgent()` lo adapta
   sin reescribirlo.
3. Pásale el contexto de tenant — un agente que no sabe de qué organización es
   puede filtrar datos entre clientes.
4. Verifica que su ejecución aparece en `ai_agent_logs`.
