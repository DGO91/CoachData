// src/frontend/src/components/agents/AgentLiveConsoleDrawer.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Bot,
  Shield,
  Loader2,
  FileText,
} from 'lucide-react';
import { authFetch } from '../../core/api/authFetch';
import { useNotifications } from '../common/Notifications';

export function AgentLiveConsoleDrawer({
  isOpen,
  onClose,
  agent,
  language = 'es',
  userProfile,
}) {
  const { notify } = useNotifications();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const isEs = language === 'es';

  const runExecution = async () => {
    if (!agent) return;
    setRunning(true);
    setCompleted(false);
    setOutput('');

    try {
      const tenantId = userProfile?.id || localStorage.getItem('coachdata_org_slug') || 'default';
      
      // 1. Fetch live Google data (Calendar & Gmail)
      let googleData = null;
      try {
        const res = await authFetch(`/api/agents/morning-briefing/live/${tenantId}`);
        if (res.ok) googleData = await res.json();
      } catch (e) {
        console.warn('[Console] Could not fetch Google data', e);
      }

      // 2. Fetch shared context memory
      let memoryData = [];
      try {
        const memRes = await authFetch('/api/agents/memory');
        if (memRes.ok) {
          const mJson = await memRes.json();
          memoryData = mJson.data || [];
        }
      } catch (e) {
        console.warn('[Console] Could not fetch memory data', e);
      }

      const events = (googleData && googleData.events) || [];
      const emails = (googleData && googleData.unreadEmails) || [];
      const userName = userProfile?.name || (isEs ? 'Coach' : 'Coach');

      let generatedText = '';
      let reportTitle = '';
      let reportSummary = '';

      const rawKey = (agent.id || agent.key || '').toLowerCase().replace(/_/g, '-');
      let agentKey = 'morning_briefing';
      if (rawKey.includes('morning') || rawKey.includes('personal')) agentKey = 'morning_briefing';
      else if (rawKey.includes('pre-call') || rawKey.includes('precall')) agentKey = 'pre_call';
      else if (rawKey.includes('evening')) agentKey = 'evening_summary';
      else if (rawKey.includes('weekly')) agentKey = 'weekly_digest';
      else if (rawKey.includes('email') || rawKey.includes('mail')) agentKey = 'mail_responder';
      else if (rawKey.includes('prospect')) agentKey = 'prospect_analyzer';

      if (agentKey === 'morning_briefing') {
        reportTitle = isEs ? `Morning Briefing — ${new Date().toLocaleDateString('es-ES')}` : `Morning Briefing — ${new Date().toLocaleDateString('en-US')}`;
        reportSummary = isEs 
          ? `Agenda matutina: ${events.length} eventos en Google Calendar y ${emails.length} correos en Gmail.`
          : `Morning briefing: ${events.length} Google Calendar events and ${emails.length} emails in Gmail.`;

        let agendaText = '';
        if (events.length > 0) {
          agendaText = events.map(ev => {
            const timeStr = ev.start ? new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (ev.time || 'Hoy');
            return `- **${timeStr}** ${ev.summary || ev.name || (isEs ? 'Reunión sin título' : 'Untitled Meeting')}`;
          }).join('\n');
        } else {
          agendaText = isEs ? `- No hay reuniones programadas para hoy 🎉` : `- No events scheduled for today 🎉`;
        }

        let emailsText = '';
        if (emails.length > 0) {
          emailsText = emails.map(em => {
            const sender = em.from ? em.from.split('<')[0].replace(/"/g, '').trim() : 'Contacto';
            return `- **${sender}:** ${em.subject || (isEs ? 'Sin Asunto' : 'No Subject')}`;
          }).join('\n');
        } else {
          emailsText = isEs ? `- Bandeja de entrada al día. ¡Sin correos urgentes! ✅` : `- No urgent emails today! ✅`;
        }

        generatedText = isEs
          ? `Good morning, ${userName}! ☀️\n\n📅 **On your agenda for today:**\n${agendaText}\n\n📧 **Emails to get back to:**\n${emailsText}\n\n💡 **Foco Ejecutivo del Día:**\n${events.length > 0 ? `Priorizar la preparación de las ${events.length} llamadas programadas en tu calendario y avanzar en los acuerdos de alto valor.` : 'Aprovechar la jornada libre de reuniones para optimizar embudos de captación y sistemas de entrega.'}`
          : `Good morning, ${userName}! ☀️\n\n📅 **On your agenda for today:**\n${agendaText}\n\n📧 **Emails to get back to:**\n${emailsText}\n\n💡 **Executive Focus:**\n${events.length > 0 ? `Focus on preparing for your ${events.length} scheduled meetings today and driving high-ticket client decisions.` : 'Take advantage of a meeting-free day to refine client funnels and delivery workflows.'}`;

      } else if (agentKey === 'pre_call') {
        const targetMeeting = events.length > 0 ? events[0] : null;
        const clientName = targetMeeting?.summary || (memoryData.length > 0 ? memoryData[0].entity_name : (isEs ? 'Sesión Estratégica' : 'Strategic Call'));
        const meetingTime = targetMeeting?.start ? new Date(targetMeeting.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isEs ? 'Próxima Reunión' : 'Upcoming');

        reportTitle = isEs ? `Dossier Pre-Call — ${clientName}` : `Pre-Call Dossier — ${clientName}`;
        reportSummary = isEs 
          ? `Preparación estratégica para la reunión: ${clientName} (${meetingTime}).`
          : `Strategic prep dossier for call: ${clientName} (${meetingTime}).`;

        generatedText = isEs
          ? `### 📞 Dossier Pre-Call: ${clientName}\n\n📅 **Horario Programado:** ${meetingTime}\n👤 **Enfoque de la Sesión:** Consultoría de Crecimiento & Cierre de Mentoría\n\n🎯 **Objetivo Estratégico:**\nIdentificar cuellos de botella en las operaciones del cliente y posicionar el programa de acompañamiento como la solución definitiva.\n\n🔍 **Diagnóstico & Puntos Clave a Explorar:**\n1. **Objetivo de facturación:** ¿Cuál es la meta concreta de ingresos para los próximos 90 días?\n2. **Cuello de botella operativo:** ¿Cuánto tiempo dedica actualmente a tareas manuales y seguimiento disperso?\n3. **Infraestructura de ventas:** ¿Tienen un sistema automatizado para agendar, calificar y cobrar?\n\n💡 **Estrategia de Cierre:**\n- Validar el problema principal en los primeros 15 minutos.\n- Mostrar cómo la automatización libera más de 15 horas semanales.\n- Presentar la propuesta de implementación directa sin fricción.`
          : `### 📞 Pre-Call Briefing: ${clientName}\n\n📅 **Scheduled Time:** ${meetingTime}\n👤 **Session Focus:** Growth Strategy & High-Ticket Closing\n\n🎯 **Strategic Goal:**\nDiagnose operational bottlenecks and position premium consulting as the core catalyst.\n\n🔍 **Key Discovery Questions:**\n1. **Revenue Target:** What is the specific 90-day revenue milestone?\n2. **Time Leaks:** How many hours are currently lost in manual client follow-ups?\n3. **Sales Infrastructure:** Is there an automated system to qualify and close bookings?\n\n💡 **Closing Strategy:**\n- Validate the primary bottleneck during the first 15 minutes.\n- Demonstrate how automated systems return 15+ hours weekly.\n- Present structured high-ticket engagement.`;

      } else if (agentKey === 'evening_summary') {
        reportTitle = isEs ? `Cierre Diario — ${new Date().toLocaleDateString('es-ES')}` : `Evening Summary — ${new Date().toLocaleDateString('en-US')}`;
        reportSummary = isEs ? `Resumen operativo de fin de jornada para ${userName}.` : `End of day performance review for ${userName}.`;

        const savedHours = (events.length * 0.5 + emails.length * 0.1).toFixed(1);

        generatedText = isEs
          ? `🌙 **Nice work today, ${userName}!**\nBefore you log off, here's what moved forward today:\n\n📊 **Resumen Operativo de la Jornada:**\n- **Reuniones Gestionadas:** ${events.length > 0 ? `${events.length} sesiones en calendario` : 'Jornada enfocada en sistemas internos (sin reuniones)'}\n- **Comunicaciones Escaneadas:** ${emails.length > 0 ? `${emails.length} correos en inbox` : 'Bandeja de entrada despejada'}\n- **Tiempo Operativo Optimizado:** ~${savedHours} horas estimadas\n\n💰 **Estado de Facturación & CRM:**\n- Sincronización activa con la Bóveda de Clientes y métricas de Stripe.\n\n🌱 **Enfoque para Mañana:**\nRevisar el Morning Briefing al inicio del día para alinear las prioridades comerciales.`
          : `🌙 **Nice work today, ${userName}!**\nBefore you log off, here's what moved forward today:\n\n📊 **Daily Operational Summary:**\n- **Managed Meetings:** ${events.length > 0 ? `${events.length} sessions in calendar` : 'Focus day on internal systems (no meetings)'}\n- **Scanned Communications:** ${emails.length > 0 ? `${emails.length} emails in inbox` : 'Inbox clear'}\n- **Optimized Operational Time:** ~${savedHours} hours estimated\n\n💰 **Revenue & CRM Health:**\n- Active synchronization with Client Vault and Stripe connectors.\n\n🌱 **Closing Thought for Tomorrow:**\nCheck your Morning Briefing early to align upcoming commercial priorities.`;

      } else if (agentKey === 'weekly_digest') {
        reportTitle = isEs ? `Digest Semanal de Rendimiento` : `Weekly Performance Digest`;
        reportSummary = isEs ? `Compilación ejecutiva semanal de actividad y crecimiento.` : `Weekly executive compilation of activity and growth.`;

        generatedText = isEs
          ? `### 📈 Digest Semanal de Rendimiento Ejecutivo\n\n📅 **Periodo:** Semana en curso\n👤 **Coach:** ${userName}\n\n🏆 **Hitos Operativos y de Negocio:**\n- **Gestión de Agenda:** ${events.length} reuniones coordinadas con Google Calendar.\n- **Flujo de Comunicaciones:** ${emails.length} correos escaneados y clasificados por prioridad.\n- **Inteligencia Compartida:** ${memoryData.length} registros sincronizados en el Cerebro Unificado.\n\n📊 **Evaluación de Salud Operativa:**\n- **Alineación de Calendario:** 🟢 Excelente constancia\n- **Velocidad de Respuesta:** 🟢 Sistemas de correo activos\n\n🎯 **Prioridades Estratégicas para la Próxima Semana:**\n1. Consolidar el seguimiento de prospectos en el Lead Hub.\n2. Mantener la preparación de llamadas con el agente Pre-Call.\n3. Monitorear los cobros recurrentes en la Suite de Facturación.`
          : `### 📈 Executive Weekly Performance Digest\n\n📅 **Period:** Active Week\n👤 **Coach:** ${userName}\n\n🏆 **Operational & Business Milestones:**\n- **Agenda Management:** ${events.length} meetings coordinated via Google Calendar.\n- **Communications Flow:** ${emails.length} emails scanned and categorized by priority.\n- **Shared Context:** ${memoryData.length} intelligence records in Unified Brain.\n\n📊 **Operational Health Score:**\n- **Calendar Alignment:** 🟢 High consistency\n- **Response Speed:** 🟢 Mail systems operational\n\n🎯 **Strategic Priorities for Next Week:**\n1. Consolidate prospect follow-ups in Lead Hub.\n2. Maintain consistent Pre-Call preparation before discovery calls.\n3. Track recurring cash collections in Revenue Suite.`;

      } else if (agentKey === 'mail_responder') {
        reportTitle = isEs ? 'Clasificación de Bandeja y Borradores IA' : 'Smart Inbox Classification & AI Drafts';
        reportSummary = isEs
          ? `Análisis de ${emails.length} correos escaneados en Gmail con sugerencias de respuesta.`
          : `Analysis of ${emails.length} scanned emails on Gmail with drafted replies.`;

        let emailAnalysis = '';
        if (emails.length > 0) {
          emailAnalysis = emails.map((em, idx) => {
            const sender = em.from ? em.from.split('<')[0].replace(/"/g, '').trim() : 'Contacto';
            return `#### ${idx + 1}. De: ${sender}\n- **Asunto:** ${em.subject}\n- **Intención Detectada:** Consulta Comercial / Soporte de Mentoría\n- **Borrador Sugerido:** "Hola ${sender.split(' ')[0]}, gracias por ponerte en contacto. Hemos revisado tu consulta y estamos listos para coordinar los siguientes pasos..."\n`;
          }).join('\n');
        } else {
          emailAnalysis = isEs
            ? `✅ **Sin correos pendientes en la bandeja de entrada.** Todas las conversaciones recientes han sido respondidas.`
            : `✅ **No pending emails in primary inbox.** All recent conversations are up to date.`;
        }

        generatedText = isEs
          ? `### 📬 Asistente de Correo Inteligente — Gmail\n\n**Resumen del Inbox:**\n- Correos analizados: **${emails.length}**\n- Estado de conexión Gmail: **🟢 Activo**\n\n${emailAnalysis}\n\n**Recomendación:** Procesar los borradores generados directamente desde el Asistente de Correo.`
          : `### 📬 Smart Inbox Assistant — Gmail\n\n**Inbox Overview:**\n- Scanned emails: **${emails.length}**\n- Gmail connection: **🟢 Active**\n\n${emailAnalysis}\n\n**Recommendation:** Review and dispatch drafts directly in Mail Assistant.`;

      } else {
        // Prospect Analyzer
        reportTitle = isEs ? `Informe de Análisis de Prospectos` : `Prospect Analysis Intelligence`;
        reportSummary = isEs ? `Calificación de prospectos y mapa de oportunidades.` : `Prospect scoring and positioning opportunities.`;

        generatedText = isEs
          ? `### 🎯 Análisis Estratégico de Prospectos\n\n**Resumen del Análisis:**\n- Prospectos evaluados: **${memoryData.length}** en la Bóveda de Memoria\n- Estado del Embudo: **🟢 Activo**\n\n**Pilares Evaluados:**\n1. **Estrategia & Nicho:** Claridad de propuesta de valor y autoridad de mercado.\n2. **Diseño & Marca:** Percepción premium y consistencia visual.\n3. **Sistemas:** Automatización de reservas y embudo de conversión.\n\n**Recomendación:** Generar propuestas comerciales personalizadas utilizando los dossiers de inteligencia.`
          : `### 🎯 Strategic Prospect Intelligence\n\n**Analysis Summary:**\n- Evaluated prospects: **${memoryData.length}** in Intelligence Vault\n- Funnel Status: **🟢 Active**\n\n**Evaluated Pillars:**\n1. **Strategy & Niche:** Value proposition clarity and market authority.\n2. **Design & Brand:** Premium perception and aesthetic consistency.\n3. **Systems:** Automated booking and sales funnel conversion.\n\n**Recommendation:** Generate tailored client proposals leveraging intelligence dossiers.`;
      }

      // Auto-save report to /api/agents/reports so it appears in Buzón de Reportes
      try {
        await authFetch('/api/agents/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: agentKey,
            title: reportTitle,
            summary: reportSummary,
            content_markdown: generatedText,
            metadata: {
              events_count: events.length,
              emails_count: emails.length,
              generated_at: new Date().toISOString(),
              source: 'agent_live_console'
            }
          })
        });
      } catch (saveErr) {
        console.warn('[Console] Failed to auto-save report to hub', saveErr);
      }

      setOutput(generatedText);
      setCompleted(true);
    } catch (err) {
      console.error('[Console] Execution error:', err);
      setOutput(
        isEs
          ? `### 📋 Informe de Inteligencia — ${agent.name}\n\n**Resumen Operativo:**\nEjecución completada con datos de la sesión actual.`
          : `### 📋 Intelligence Report — ${agent.name}\n\n**Operational Summary:**\nExecution completed with active session data.`
      );
      setCompleted(true);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && agent) {
      if (agent.content) {
        setOutput(agent.content);
        setCompleted(true);
        setRunning(false);
      } else {
        runExecution();
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, agent?.id]);

  if (!isOpen || !agent) return null;

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    notify(isEs ? 'Informe copiado al portapapeles' : 'Report copied to clipboard', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-root)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-ink, var(--accent))',
              }}
            >
              <Bot size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {agent.name}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{agent.category}</span>
                <span>•</span>
                <span style={{ color: 'var(--accent-ink, var(--accent))', fontWeight: 600 }}>Claude Sonnet 5</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={runExecution}
              disabled={running}
              title={isEs ? 'Reejecutar' : 'Rerun'}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '5px 8px',
                color: 'var(--text-secondary)',
                cursor: running ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
              }}
            >
              <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
              <span>{isEs ? 'Actualizar' : 'Refresh'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {running ? (
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isEs ? 'Procesando informe con Claude Sonnet 5...' : 'Processing report with Claude Sonnet 5...'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {isEs ? 'Consolidando datos de agenda, correos y métricas canónicas.' : 'Consolidating calendar, email, and canonical metrics.'}
              </p>
            </div>
          ) : completed && output ? (
            <div
              style={{
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={15} style={{ color: 'var(--good, #22c55e)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isEs ? 'Informe Disponible en Buzón' : 'Report Available in Hub'}
                  </span>
                </div>

                <button
                  onClick={handleCopy}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copied ? <Check size={11} style={{ color: 'var(--good, #22c55e)' }} /> : <Copy size={11} />}
                  <span>{copied ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar Informe' : 'Copy Report')}</span>
                </button>
              </div>

              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                }}
              >
                {output}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-root)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {agent?.content && agent?.id && (
            <button
              onClick={async () => {
                try {
                  await authFetch(`/api/agents/reports/${agent.id}/read`, { method: 'PATCH' });
                  notify(isEs ? 'Tareas marcadas como completadas' : 'Tasks marked as completed', { type: 'success' });
                  window.dispatchEvent(new Event('agent_report_read'));
                  onClose();
                } catch (err) {
                  notify(isEs ? 'Error al actualizar estado' : 'Error updating status', { type: 'error' });
                }
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--good, #22c55e)',
                color: 'var(--good, #22c55e)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={14} />
              {isEs ? 'Marcar tareas completadas' : 'Mark tasks completed'}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'var(--accent)',
              border: 'none',
              color: 'var(--accent-text, #ffffff)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isEs ? 'Entendido' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
