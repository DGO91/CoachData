# Project Rules & Governance System

## 0. VERIFICACIÓN OBLIGATORIA — `governance-check`

Antes de dar por terminado cualquier trabajo, ejecuta:

```bash
node scripts/governance-check.js
```

Es el árbitro mecánico de las reglas de este documento. No opina ni recuerda:
mira el código y falla con código de salida 1. **Pega su salida real en tu
reporte.** Una regla escrita aquí solo se cumple si alguien la recuerda; este
script se cumple siempre, y es lo que mantiene a todos los agentes (Claude
Code, Antigravity, humanos) tirando en la misma dirección.

Si un check te parece equivocado, discútelo — no lo silencies. Para una
excepción legítima y puntual, márcala en el propio código y quedará a la vista
en la revisión:

```js
{ id: 'ivory', swatch: '#B8985A' },  // governance-allow: design-tokens — muestra de color del selector de temas
```

Regla de fondo que aplica a todo lo demás: **un test que no puede fallar no es
un test.** Si tu script imprime `[PASS]` sin que exista un camino que lo ponga
en fallo, no has verificado nada.


## 1. Frontend Build Process
When making changes to the React frontend (`src/frontend/src/components/*`), ensure that the changes are compiled so the production server serves them correctly.
See detailed instructions in: `.agents/rules/frontend_build_process.md`

## 2. Frontend Design & Architecture Pipeline
Whenever creating or refactoring a frontend component, execute the 4-stage pipeline defined by the AI Product Director.
See detailed instructions in: `.agents/rules/ux_ui_pipeline.md`

## 3. Canonical Design System & Token Governance
All frontend code MUST strictly use CSS variables from `src/frontend/src/index.css` (`var(--bg-surface)`, `var(--border)`, `var(--text-primary)`, `var(--accent)`).
See detailed instructions in: `.agents/rules/frontend_design_system_governance.md`

## 4. No Mock Data & Empty State Policy
Hardcoded business data (`John Doe`, `Acme`, `Nova Consulting` fallbacks) is PERMANENTLY PROHIBITED in production components. Empty data arrays MUST render canonical `<EmptyState />`.
See detailed instructions in: `.agents/rules/no_mock_data_policy.md`

## 5. Prohibition of AI-Style Artifacts
Generic AI-style icons (`Sparkles`, `Brain`, `Rocket`, `Zap`) for decorative purposes and rainbow gradients are prohibited.
See detailed instructions in: `.agents/rules/ai_artifact_prohibition.md`

## 6. Pre-Execution AI Safety Directives
Only `ProspectAnalyzerAgent.js` is authorized for pilot refactoring using `getEffectiveAISettings`. All other active production prompts remain protected.
See detailed instructions in: `.agents/rules/ai_safety_directives.md`

---

# 🤖 Agentes activos

Nueve, reducidos desde diecisiete. El criterio: una skill del proyecto solo se
justifica si sabe algo que **ninguna skill general puede saber** — las
decisiones y cicatrices de este repo. Las genéricas (arquitectura React,
buenas prácticas de Express, diseño web) se eliminaron: las cubren mejor las
skills globales, que están mantenidas.

| Agente | Qué sabe que nadie más sabe |
|---|---|
| **`qa_auditor`** | Cómo distinguir lo verificado de lo narrado. Las cuatro formas de test que no puede fallar |
| **`tenant_isolation_guard`** | Los dos modelos de tenant conviviendo, que `service_role` bypassa RLS, el Vault AES-256-GCM. *(absorbe `rls_security_agent` y `auth_vault_agent`)* |
| **`backend_engineer`** | Que un endpoint inexistente devuelve **200 con HTML**, no 404. El prefijo duplicado en el montaje |
| **`database_architect`** | Supabase directo, **nunca Prisma**. Verificar el esquema contra la base, no contra el código. *(absorbe `migration_hardening_agent`)* |
| **`coachdata_design_system`** | Las 8 paletas, `--accent-text` vs `--accent-ink`, el reset de `button`, `Notifications.jsx`. *(era `ui_ux_designer`; renombrado para no colisionar con la skill global `ui-ux-designer`)* |
| **`integration_agent`** | Que solo 2 de las ~40 integraciones hacen algo. Nango desaprovechado. La metáfora del pulpo y el modelo canónico pendiente |
| **`ai_orchestrator`** | Las dos capas de agentes con los mismos nombres. Qué prompts están protegidos. *(absorbe `automation_dispatcher_agent`)* |
| **`revenue_operations_specialist`** | Que `PipelineAnalytics` muestra métricas inventadas. El pipeline configurable por organización |
| **`product_surfaces`** | Las trampas de cada pantalla: debounce, localStorage, invitaciones por código. *(absorbe `dashboard_analytics_agent`, `content_desk_agent`, `client_portal_agent`)* |

Eliminados por duplicar skills globales mejor mantenidas: `ai_product_director`,
`frontend_architect`, `fullstack_engineer`.

Análisis completo del porqué: [docs/ANALISIS_AGENTES_SKILLS.md](../docs/ANALISIS_AGENTES_SKILLS.md)
