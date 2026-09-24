/**
 * test-lead-scoring.js
 * Verification Test Suite for Configurable AI Lead Scoring — CoachData Operational OS v2
 *
 * Las dos organizaciones son de coaches efímeros. Antes la organización A era
 * una real de producción escrita a mano, y el arranque le borraba su
 * `lead_scoring_config` en cada pasada: el criterio de calificación de una
 * cuenta viva desaparecía por ejecutar un test.
 */

require('dotenv').config();
const { crearEntorno } = require('./lib/coaches-efimeros');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const executionPipeline = require('../src/backend/application/orchestrator/ExecutionPipeline');
// Importar el índice del orquestador ejecuta bootAIOrchestrator(), que es quien
// registra 'lead_qualifier' en el AgentRegistry. server.js lo hace al arrancar,
// pero el test no: sin esta línea el agente no existe en este proceso y cada
// calificación falla con "Agente 'lead_qualifier' no encontrado", devolviendo
// scores de 0 que algún caso llegaba a interpretar como éxito.
require('../src/backend/application/orchestrator');
const { dispatchNative } = require('../src/backend/services/automation/AutomationDispatcher');

async function runLeadScoringTests() {
  console.log("====================================================");
  console.log("COACHDATA CONFIGURABLE LEAD SCORING TEST SUITE");
  console.log("====================================================");

  const adminSupabase = getSupabaseClient();
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client not configured.");
    process.exit(1);
  }

  // Pre-flight check: Verify if the lead_scoring_config table exists in Supabase
  const { error: preFlightError } = await adminSupabase.from('lead_scoring_config').select('id').limit(1);
  if (preFlightError && preFlightError.message.includes("Could not find the table")) {
    console.error("\n❌ Error: La tabla 'lead_scoring_config' no existe en tu base de datos de Supabase.");
    console.error("👉 Por favor, ejecuta el contenido de la migración en tu SQL Editor de Supabase:");
    console.error("   [021_lead_scoring_config.sql](file:///Users/diogenesg.o/CLIENTES%20SAAS/supabase/migrations/021_lead_scoring_config.sql)\n");
    process.exit(1);
  }

  let passed = true;

  // ── Identifiers declared OUTSIDE try for safe cleanup in finally ──
  const entorno = await crearEntorno(['a', 'b']);
  const userA_ID = entorno.coaches.a.userId;
  const userB_ID = entorno.coaches.b.userId;
  const orgA_ID  = entorno.coaches.a.organizationId;
  const orgB_ID  = entorno.coaches.b.organizationId;
  const ephemeralTenantA = require('crypto').randomUUID();
  const ephemeralTenantB = require('crypto').randomUUID();

  const emailLeadGood = 'goodlead@example.com';
  const emailLeadBad = 'badlead@example.com';

  let leadGoodId = null;
  let leadBadId = null;
  let leadNoConfigId = null;
  let leadLlmDownId = null;

  try {
    // Las dos organizaciones vienen del entorno efímero, recién creadas y
    // vacías: no hay nada que borrar antes de empezar.
    const { error: tAErr } = await adminSupabase.from('tenants').insert({
      id: ephemeralTenantA,
      company_name: 'Lead Scoring Coach Corp A',
      primary_contact_email: entorno.coaches.a.email,
      active_package: 'pro',
      auth_user_id: userA_ID,
      organization_id: orgA_ID
    });
    if (tAErr) throw new Error(`Tenant A Setup Failed: ${tAErr.message}`);

    const { error: tBErr } = await adminSupabase.from('tenants').insert({
      id: ephemeralTenantB,
      company_name: 'Lead Scoring Coach Corp B',
      primary_contact_email: entorno.coaches.b.email,
      active_package: 'pro',
      auth_user_id: userB_ID,
      organization_id: orgB_ID
    });
    if (tBErr) throw new Error(`Tenant B Setup Failed: ${tBErr.message}`);

    console.log("[Setup] Ephemeral tenants initialized.");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DISCRIMINACIÓN REAL (Lead A vs Lead B)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n1. REAL AI DISCRIMINATION TEST:");

    // Coach A settings: Needs high budget and fast start
    const { error: confErr } = await adminSupabase.from('lead_scoring_config').insert({
      organization_id: orgA_ID,
      criterio_texto: "Me interesan únicamente leads que tengan un presupuesto alto de más de 5000 euros y que tengan urgencia de empezar en menos de 30 días. Si no tienen dinero o el proyecto es a largo plazo, puntúa muy bajo.",
      senales: { "presupuesto_alto": 60, "urgencia": 40 },
      umbral_alto: 75,
      umbral_medio: 40,
      activo: true
    });
    if (confErr) throw new Error(`Scoring Config A Failed: ${confErr.message}`);

    // Create contacts
    const { data: leadGood, error: gErr } = await adminSupabase.from('crm_contacts').insert({
      organization_id: orgA_ID,
      first_name: 'Marcos',
      last_name: 'HighValue',
      email: emailLeadGood,
      source: 'web',
      status: 'new'
    }).select().single();
    if (gErr) throw gErr;
    leadGoodId = leadGood.id;

    const { data: leadBad, error: bErr } = await adminSupabase.from('crm_contacts').insert({
      organization_id: orgA_ID,
      first_name: 'Toby',
      last_name: 'LowBudget',
      email: emailLeadBad,
      source: 'web',
      status: 'new'
    }).select().single();
    if (bErr) throw bErr;
    leadBadId = leadBad.id;

    // Seed canonical responses to enrich prompts
    await adminSupabase.from('canonical_form_entry').delete()
      .eq('organization_id', orgA_ID)
      .in('respondent_email', [emailLeadGood, emailLeadBad]);
    await adminSupabase.from('canonical_form_entry').insert([
      {
        organization_id: orgA_ID,
        source_provider: 'tally',
        source_id: 'tally_good',
        respondent_email: emailLeadGood,
        respondent_name: 'Marcos HighValue',
        form_name: 'Lead Capture Form',
        answers: { "presupuesto": "8500 euros", "urgencia": "Queremos arrancar esta misma semana" }
      },
      {
        organization_id: orgA_ID,
        source_provider: 'tally',
        source_id: 'tally_bad',
        respondent_email: emailLeadBad,
        respondent_name: 'Toby LowBudget',
        form_name: 'Lead Capture Form',
        answers: { "presupuesto": "No tenemos presupuesto en este momento", "urgencia": "Tal vez el año que viene" }
      }
    ]);

    // Dispatch lead_qualification natively (this triggers the lead_qualifier AI Agent)
    console.log("  Qualifying Good Lead (Marcos)...");
    const resGood = await dispatchNative(orgA_ID, 'lead_qualification', { leadId: leadGoodId });
    
    console.log("  Qualifying Bad Lead (Toby)...");
    const resBad = await dispatchNative(orgA_ID, 'lead_qualification', { leadId: leadBadId });

    // Retrieve scoring results
    const { data: scoredGood } = await adminSupabase.from('crm_contacts').select('*').eq('id', leadGoodId).single();
    const { data: scoredBad } = await adminSupabase.from('crm_contacts').select('*').eq('id', leadBadId).single();

    console.log(`  Good Lead Score: ${scoredGood.lead_score} (Status: ${scoredGood.status})`);
    console.log(`  Bad Lead Score:  ${scoredBad.lead_score} (Status: ${scoredBad.status})`);

    if (scoredGood.lead_score > 70 && scoredBad.lead_score < 40) {
      console.log("  [PASS] AI correctly discriminated high-value lead from low-value lead based on custom coach criteria.");
    } else {
      console.error("  [FAIL] AI scoring failed to discriminate properly. Both scores are too close or wrong.");
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. SIN CONFIGURACIÓN (Should stay 'new' with score = null)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. NO CONFIGURATION TEST:");

    // Create a new lead
    const { data: leadNoConfig, error: ncErr } = await adminSupabase.from('crm_contacts').insert({
      organization_id: orgB_ID, // Org B has no configuration seeded yet
      first_name: 'Alice',
      last_name: 'NoConfig',
      email: 'alice@example.com',
      source: 'web',
      status: 'new'
    }).select().single();
    if (ncErr) throw ncErr;
    leadNoConfigId = leadNoConfig.id;

    // Run qualification
    await dispatchNative(orgB_ID, 'lead_qualification', { leadId: leadNoConfigId });

    const { data: checkedNoConfig } = await adminSupabase.from('crm_contacts').select('*').eq('id', leadNoConfigId).single();
    if (checkedNoConfig.lead_score === null && checkedNoConfig.status === 'new' && checkedNoConfig.score_reason.includes('No existe configuración')) {
      console.log("  [PASS] Correctly left lead unrated/new and logged missing configuration reason.");
    } else {
      console.error("  [FAIL] Lead score was mutated or default score was falsely injected:", checkedNoConfig);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. LLM CAÍDO (Should keep previous state, no mutation)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. LLM DISCONNECTION TEST:");

    const { data: leadLlmDown, error: ldErr } = await adminSupabase.from('crm_contacts').insert({
      organization_id: orgA_ID,
      first_name: 'Broken',
      last_name: 'LLM',
      email: 'brokenllm@example.com',
      source: 'web',
      status: 'new'
    }).select().single();
    if (ldErr) throw ldErr;
    leadLlmDownId = leadLlmDown.id;

    // Simulate LLM failure by temporarily breaking provider completion
    const originalProvider = executionPipeline.providers[executionPipeline.defaultProvider];
    executionPipeline.providers[executionPipeline.defaultProvider] = {
      generate: async () => { throw new Error('API connection timed out'); }
    };

    let didThrow = false;
    try {
      await dispatchNative(orgA_ID, 'lead_qualification', { leadId: leadLlmDownId });
    } catch (err) {
      if (err.message.includes('API connection timed out') || err.message.includes('Lead qualification agent failed')) {
        didThrow = true;
      }
    }

    // Restore original provider
    executionPipeline.providers[executionPipeline.defaultProvider] = originalProvider;

    const { data: checkedLlmDown } = await adminSupabase.from('crm_contacts').select('*').eq('id', leadLlmDownId).single();
    if (didThrow && checkedLlmDown.lead_score === null && checkedLlmDown.status === 'new') {
      console.log("  [PASS] Lead state was preserved without corrupt default values when LLM was unreachable.");
    } else {
      console.error("  [FAIL] Expected throw and unchanged database fields, got status:", checkedLlmDown.status, "score:", checkedLlmDown.lead_score);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. AISLAMIENTO MULTI-TENANT
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4. MULTI-TENANT ISOLATION:");

    // Seed Config B for Org B (Opposite criteria: only interested in Low budget leads)
    const { error: confBErr } = await adminSupabase.from('lead_scoring_config').insert({
      organization_id: orgB_ID,
      criterio_texto: "Me interesan únicamente leads con poco presupuesto (bajo o nulo). Si tienen mucho presupuesto, califícalos con 0.",
      senales: { "bajo_presupuesto": 100 },
      umbral_alto: 75,
      activo: true
    });
    if (confBErr) throw new Error(`Scoring Config B Failed: ${confBErr.message}`);

    const { data: leadAOrgB, error: aBErr } = await adminSupabase.from('crm_contacts').insert({
      organization_id: orgB_ID,
      first_name: 'RichClient',
      email: emailLeadGood, // Marcos' email (High budget)
      source: 'web',
      status: 'new'
    }).select().single();
    if (aBErr) throw aBErr;

    // Qualify in Tenant B
    await dispatchNative(orgB_ID, 'lead_qualification', { leadId: leadAOrgB.id });
    const { data: scoredRichInB } = await adminSupabase.from('crm_contacts').select('*').eq('id', leadAOrgB.id).single();

    console.log(`  Tenant B (Opposite Criteria) Lead Score: ${scoredRichInB.lead_score}`);
    
    // In Org A, he had high score (>70). In Org B, he gets low score (<30) because of opposite criteria
    if (scoredRichInB.lead_score < 30) {
      console.log("  [PASS] Tenant B configuration successfully isolated. Same contact profile scored completely differently.");
    } else {
      console.error(`  [FAIL] Cross-tenant leak or scoring criteria bleed. Got score: ${scoredRichInB.lead_score}`);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. PERSISTENCIA DE JUSTIFICACIÓN
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n5. PERSISTENCE OF JUSTIFICATION:");
    if (scoredGood.score_reason && scoredGood.score_reason.length > 10) {
      console.log("  [PASS] AI score justification persisted successfully (score_reason field filled).");
    } else {
      console.error("  [FAIL] score_reason is missing or empty.");
      passed = false;
    }

  } finally {
    // ─────────────────────────────────────────────────────────────────────────────
    // 6. CLEANUP
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n6. CLEANUP:");

    // Clean leads
    if (leadGoodId) await adminSupabase.from('crm_contacts').delete().eq('id', leadGoodId);
    if (leadBadId) await adminSupabase.from('crm_contacts').delete().eq('id', leadBadId);
    if (leadNoConfigId) await adminSupabase.from('crm_contacts').delete().eq('id', leadNoConfigId);
    if (leadLlmDownId) await adminSupabase.from('crm_contacts').delete().eq('id', leadLlmDownId);

    // Delete canonical forms
    await adminSupabase.from('canonical_form_entry').delete()
      .in('organization_id', [orgA_ID, orgB_ID])
      .in('respondent_email', [emailLeadGood, emailLeadBad]);

    // Clean tenants
    await adminSupabase.from('tenants').delete().in('id', [ephemeralTenantA, ephemeralTenantB]);

    // Las configuraciones, los contactos y las dos organizaciones se van con
    // los coaches efímeros.
    await entorno.limpiar();
    console.log("  Cleaned: all ephemeral test data.");
  }

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("COACHDATA LEAD SCORING VERDICT: ALL TESTS PASSED — PASS");
  } else {
    console.log("COACHDATA LEAD SCORING VERDICT: FAILED");
    process.exit(1);
  }
}

runLeadScoringTests();
