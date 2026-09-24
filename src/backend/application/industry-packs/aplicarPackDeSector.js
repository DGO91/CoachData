'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');
const { businessCoachConsultingPack } = require('./businessCoachConsultingPack');

/**
 * Deja una organización nueva ya configurada para su sector.
 *
 * El pack de business coach existía como un objeto con valores por defecto y no
 * lo invocaba nadie: cada organización nacía sin criterio de calificación de
 * leads, sin horarios de agentes y sin preferencias de informe. Implantar un
 * cliente exigía configurarlo todo a mano, que es justo lo que impide entregar un
 * servicio hecho-para-ti en un rato.
 *
 * Escribe sólo en tablas que existen: lead_scoring_config, agent_schedules y
 * organizations.settings_json. La configuración de IA del pack vivía en
 * organization_ai_settings, cuya migración (011) no está aplicada, así que esa
 * parte se guarda en settings_json hasta que esa tabla exista.
 *
 * Es idempotente: aplicarlo dos veces no duplica nada ni pisa lo que el coach ya
 * haya cambiado a mano. Un pack es un punto de partida, no una imposición.
 */

const PACKS = {
  business_coach_consulting: businessCoachConsultingPack,
};

// Criterio de calificación por defecto para el sector. Son los umbrales con los
// que el LeadQualifierAgent decide 'qualified' / 'triage' / 'new'.
const SCORING_POR_SECTOR = {
  business_coach_consulting: {
    criterio_texto:
      'Prioriza a quien ya factura con clientes y busca sistematizar, por encima de quien aún no ha vendido. '
      + 'Penaliza a quien pide precio sin describir su situación.',
    senales: {
      positivas: [
        'menciona facturación o número de clientes actuales',
        'describe un problema operativo concreto',
        'ha asistido a una sesión o webinar previo',
        'pregunta por plazos de implantación',
      ],
      negativas: [
        'sólo pregunta el precio',
        'no describe su negocio',
        'busca formación gratuita',
      ],
    },
    umbral_alto: 70,
    umbral_medio: 40,
  },
};

// Agentes que se activan de salida, con su horario. El resto quedan disponibles
// pero apagados: encender todo el primer día llena el buzón antes de que el coach
// entienda qué hace cada uno.
const AGENTES_POR_SECTOR = {
  business_coach_consulting: [
    { agent_type: 'morning_briefing',  cron_schedule: '0 8 * * 1-5', is_active: true },
    { agent_type: 'evening_summary',   cron_schedule: '0 19 * * 1-5', is_active: true },
    { agent_type: 'weekly_digest',     cron_schedule: '0 9 * * 1',    is_active: true },
    { agent_type: 'pre_call',          cron_schedule: null,           is_active: true },
    { agent_type: 'prospect_analyzer', cron_schedule: null,           is_active: false },
  ],
};

async function aplicarPackDeSector(organizationId, sector = 'business_coach_consulting') {
  const pack = PACKS[sector];
  if (!pack) {
    const err = new Error(`No existe un pack para el sector '${sector}'`);
    err.statusCode = 400;
    throw err;
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const resumen = { sector, scoring: 'sin cambios', agentes: 0, ajustes: 'sin cambios' };

  // 1. Criterio de calificación de leads — sólo si no lo tiene ya.
  const { data: scoringExistente } = await supabase
    .from('lead_scoring_config')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!scoringExistente) {
    const s = SCORING_POR_SECTOR[sector];
    const { error } = await supabase.from('lead_scoring_config').insert({
      organization_id: organizationId,
      criterio_texto: s.criterio_texto,
      senales: s.senales,
      umbral_alto: s.umbral_alto,
      umbral_medio: s.umbral_medio,
      activo: true,
    });
    if (error) throw new Error(`No se pudo crear el criterio de leads: ${error.message}`);
    resumen.scoring = 'creado';
  }

  // 2. Horarios de agentes — se respetan los que el coach ya tenga.
  const { data: yaConfigurados } = await supabase
    .from('agent_schedules')
    .select('agent_type')
    .eq('organization_id', organizationId);
  const existentes = new Set((yaConfigurados || []).map(a => a.agent_type));

  const nuevos = (AGENTES_POR_SECTOR[sector] || [])
    .filter(a => !existentes.has(a.agent_type))
    .map(a => ({
      organization_id: organizationId,
      agent_type: a.agent_type,
      cron_schedule: a.cron_schedule,
      is_active: a.is_active,
      settings: {
        delivery_channel: pack.defaultReportingPreferences.delivery_channel,
        delivery_time: pack.defaultReportingPreferences.delivery_time,
        timezone: pack.defaultReportingPreferences.timezone,
      },
    }));

  if (nuevos.length) {
    const { error } = await supabase.from('agent_schedules').insert(nuevos);
    if (error) throw new Error(`No se pudieron crear los horarios de agentes: ${error.message}`);
    resumen.agentes = nuevos.length;
  }

  // 3. Perfil e identidad del asistente, en settings_json.
  const { data: org, error: errOrg } = await supabase
    .from('organizations')
    .select('settings_json')
    .eq('id', organizationId)
    .single();
  if (errOrg) throw new Error(`No se pudo leer la organización: ${errOrg.message}`);

  const settings = org.settings_json || {};
  if (!settings.sector_pack) {
    const { error } = await supabase.from('organizations').update({
      settings_json: {
        ...settings,
        industry: settings.industry || 'coaching',
        language: settings.language || pack.defaultCommunicationStyle.language,
        timezone: settings.timezone || pack.defaultReportingPreferences.timezone,
        sector_pack: {
          sector,
          aplicado_en: new Date().toISOString(),
          assistant_name: pack.defaultAssistantName,
          target_client_profile: pack.defaultTargetClientProfile,
          service_catalog: pack.defaultServiceCatalog,
          analysis_goals: pack.defaultAnalysisGoals,
          communication_style: pack.defaultCommunicationStyle,
          reporting_preferences: pack.defaultReportingPreferences,
        },
      },
      updated_at: new Date().toISOString(),
    }).eq('id', organizationId);
    if (error) throw new Error(`No se pudieron guardar los ajustes: ${error.message}`);
    resumen.ajustes = 'aplicados';
  }

  return resumen;
}

function sectoresDisponibles() {
  return Object.keys(PACKS);
}

module.exports = { aplicarPackDeSector, sectoresDisponibles, PACKS };
