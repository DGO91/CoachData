# Development Agents & Roles Catalog

This rule registers all 17 specialized software construction roles available for Antigravity in this project:

1. **`ai_product_director`**: Supervises the 4-stage UI/UX software factory pipeline.
2. **`frontend_architect`**: Handles React 19 component modularization and static bundling (`npm run build`).
3. **`ui_ux_designer`**: Enforces design tokens, dark mode, typography, and clean empty states.
4. **`client_portal_agent`**: Manages secure end-client portal interfaces.
5. **`dashboard_analytics_agent`**: Calculates KPI metrics dynamically without hardcoded fallback counts.
6. **`backend_engineer`**: Develops Node.js Express REST API endpoints and controllers.
7. **`fullstack_engineer`**: Integrates frontend React views with backend APIs and Supabase.
8. **`tenant_isolation_guard`**: Enforces `tenantContextMiddleware` and multi-tenant data scoping.
9. **`auth_vault_agent`**: Manages Supabase Auth, JWT verification, and Security Vault.
10. **`automation_dispatcher_agent`**: Controls native background jobs via `dispatchNative`.
11. **`integration_agent`**: Connects Stripe, Google Cloud APIs, and Nango webhooks.
12. **`database_architect`**: Writes SQL migrations in `supabase/migrations/`.
13. **`rls_security_agent`**: Configures Row Level Security (RLS) policies by `organization_id`.
14. **`migration_hardening_agent`**: Creates transactional PL/pgSQL procedures (`tenant_onboarding_wizard`).
15. **`qa_auditor`**: Scans codebase to eliminate mock data (e.g., Nova Consulting) and audits build.
16. **`revenue_operations_specialist`**: Manages LeadHub, Call Intelligence, and Deal Closing workflows.
17. **`content_desk_agent`**: Handles editorial calendar and copy generation tools.
