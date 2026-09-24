# Pre-Execution AI Safety Directives

1. **Read-Only Safety Audit**: Completed read-only inventory (`docs/AI_AGENT_INVENTORY_v1.0.md`), hardcoded branding scan (`docs/AI_HARDCODED_BRANDING_AUDIT.md`), and WhatsApp delivery audit (`docs/WHATSAPP_DELIVERY_AUDIT.md`).
2. **Experimental Migration**: Migration `011_organization_ai_settings_experimental.sql` is marked as non-breaking experimental and requires the `TEMPORARY_COMPATIBILITY_LAYER` (`getEffectiveAISettings(orgId)`).
3. **Single Pilot Agent Refactor Restriction**: During initial implementation, only `ProspectAnalyzerAgent.js` is authorized for dynamic prompt builder refactoring. All other active agents (`WeeklyDigestAgent`, `EveningSummaryAgent`, `PreCallAgent`, `KnowledgeSearchAgent`) remain protected.
