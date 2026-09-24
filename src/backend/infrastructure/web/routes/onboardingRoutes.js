'use strict';

const express = require('express');
const { getSupabaseClient } = require('../../database/supabaseClient');
const { aplicarPackDeSector, sectoresDisponibles } = require('../../../application/industry-packs/aplicarPackDeSector');

const router = express.Router();

/**
 * Puesta en marcha de una organización.
 *
 * Responde a dos preguntas que hoy nadie contestaba: qué le falta a este cliente
 * para que el producto le sirva, y cómo dejarlo configurado sin tocar código.
 *
 * El primer día el panel está vacío, y ése es el momento de mayor abandono: sin
 * datos conectados no hay nada que enseñar, y sin saber qué falta el coach no
 * sabe por dónde empezar.
 */

// Qué hace falta para que cada zona del panel deje de estar vacía. El orden es el
// de impacto: sin cobros no hay panel de finanzas, que es lo primero que mira.
const PASOS = [
  {
    id: 'cobros',
    titulo: 'Conecta por dónde cobras',
    porque: 'Sin esto el panel no puede decirte cuánto has facturado.',
    proveedores: ['stripe'],
  },
  {
    id: 'agenda',
    titulo: 'Conecta tu agenda',
    porque: 'De aquí salen las sesiones del día y los briefs previos a cada llamada.',
    proveedores: ['calendly', 'google_calendar_oauth'],
  },
  {
    id: 'formularios',
    titulo: 'Conecta tus formularios',
    porque: 'Es por donde entran los leads que el calificador puntúa.',
    proveedores: ['tally'],
  },
  {
    id: 'mensajes',
    titulo: 'Conecta WhatsApp',
    porque: 'Por ahí te llegan los avisos y los resúmenes.',
    proveedores: ['whatsapp_cloud', 'evolution'],
  },
];

router.get('/estado', async (req, res) => {
  const organizationId = req.tenant?.id;
  if (!organizationId) return res.status(403).json({ error: 'Sin contexto de organización' });

  const supabase = getSupabaseClient();
  if (!supabase) return res.status(503).json({ error: 'Base de datos no configurada' });

  try {
    // Se considera conectado un proveedor del que ya han entrado eventos: es la
    // única señal que no miente. Tener la credencial guardada no significa que
    // los datos estén llegando — de hecho hay credenciales guardadas que ya no
    // se pueden ni descifrar.
    const { data: eventos } = await supabase
      .from('webhook_inbox')
      .select('provider')
      .eq('organization_id', organizationId);
    const conDatos = new Set((eventos || []).map(e => e.provider));

    const { data: canonicos } = await supabase
      .from('canonical_payment')
      .select('source_provider')
      .eq('organization_id', organizationId)
      .limit(50);
    for (const c of canonicos || []) conDatos.add(c.source_provider);

    const pasos = PASOS.map(p => ({
      id: p.id,
      titulo: p.titulo,
      porque: p.porque,
      hecho: p.proveedores.some(prov => conDatos.has(prov)),
    }));

    const { data: org } = await supabase
      .from('organizations')
      .select('settings_json')
      .eq('id', organizationId)
      .single();
    const packAplicado = !!(org?.settings_json || {}).sector_pack;

    const hechos = pasos.filter(p => p.hecho).length;
    res.json({
      packAplicado,
      sectoresDisponibles: sectoresDisponibles(),
      completado: pasos.length ? Math.round((hechos / pasos.length) * 100) : 0,
      pasos,
      // Lo que el coach debería hacer ahora, uno solo: una lista de cuatro cosas
      // pendientes paraliza más que una sola instrucción.
      siguiente: pasos.find(p => !p.hecho) || null,
    });
  } catch (err) {
    console.error('[Onboarding] Error calculando el estado:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/aplicar-pack', async (req, res) => {
  const organizationId = req.tenant?.id;
  if (!organizationId) return res.status(403).json({ error: 'Sin contexto de organización' });
  if (!['owner', 'admin'].includes(req.tenant?.role)) {
    return res.status(403).json({ error: 'Solo propietarios o administradores pueden aplicar un pack de sector' });
  }

  try {
    const resumen = await aplicarPackDeSector(organizationId, req.body?.sector || 'business_coach_consulting');
    res.json({ success: true, ...resumen });
  } catch (err) {
    console.error('[Onboarding] Error aplicando el pack:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
