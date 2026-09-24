// src/frontend/src/components/dashboard/ExecutiveBriefingHero.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Mail, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { authFetch } from '../../core/api/authFetch';

export function ExecutiveBriefingHero({ language = 'es', userProfile, onNavigate, onOpenReport }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isEs = language === 'es';

  const fetchLatestBriefing = async () => {
    try {
      const res = await authFetch('/api/agents/reports?agent_type=morning_briefing&limit=1&unread_only=true');
      const data = await res.json();
      if (data && data.success && data.reports && data.reports.length > 0) {
        setBriefing(data.reports[0]);
      } else {
        // Fallback live summary
        const tenantId = userProfile?.id || localStorage.getItem('coachdata_org_slug') || 'default';
        const liveRes = await authFetch(`/api/agents/morning-briefing/live/${tenantId}`);
        const liveData = await liveRes.json();
        
        const eventCount = (liveData.events || []).length;
        const emailCount = (liveData.unreadEmails || []).length;

        setBriefing({
          id: 'live-summary',
          title: isEs ? 'Briefing Matutino Ejecutivo' : 'Morning Executive Briefing',
          summary: isEs
            ? `Tienes ${eventCount} reuniones en agenda y ${emailCount} correos pendientes para hoy.`
            : `You have ${eventCount} scheduled meetings and ${emailCount} pending emails today.`,
          created_at: new Date().toISOString(),
          metadata: {
            meetings: eventCount,
            emails: emailCount,
          },
          content_markdown: isEs
            ? `### 🌅 Briefing Matutino — ${new Date().toLocaleDateString()}\n\n**Agenda y Foco Estratégico:**\n- **Reuniones:** ${eventCount} llamadas programadas.\n- **Bandeja de Entrada:** ${emailCount} mensajes por revisar.\n\n**Prioridad de Hoy:** Revisar los prospectos cualificados y atender las sesiones de consultoría.`
            : `### 🌅 Morning Briefing — ${new Date().toLocaleDateString()}\n\n**Schedule & Strategic Focus:**\n- **Meetings:** ${eventCount} scheduled calls.\n- **Inbox:** ${emailCount} unread emails.\n\n**Today's Priority:** Review qualified leads and attend strategy sessions.`,
        });
      }
    } catch (err) {
      console.warn('Error fetching latest executive briefing', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestBriefing();
    window.addEventListener('agent_report_read', fetchLatestBriefing);
    return () => window.removeEventListener('agent_report_read', fetchLatestBriefing);
  }, [userProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLatestBriefing();
  };

  const displayName = userProfile?.name?.split(' ')[0] || userProfile?.email?.split('@')[0] || 'Coach';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-root) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '22px 24px',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Jerarquía por contenido, no por etiqueta.
          Antes lo más grande era el título del panel —"Foco Operativo & Briefing
          Diario"— y el mensaje del día iba debajo en letra pequeña. Se lee
          primero el nombre del cajón y después lo que hay dentro.
          Ahora manda la frase del día; la fecha es contexto y el resto se aparta.

          Fuera el distintivo del modelo de IA: a un coach no le dice nada qué
          motor genera su resumen, y ocupaba el lugar más visible del panel. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
          {/* Sólo la inicial en mayúscula: `capitalize` de CSS afecta a cada
              palabra y en español deja "Miércoles, 19 De Agosto". */}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {(() => {
              const f = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                weekday: 'long', day: 'numeric', month: 'long',
              });
              return f.charAt(0).toUpperCase() + f.slice(1);
            })()}
          </span>

          <p style={{
            fontSize: '17px',
            lineHeight: 1.45,
            color: 'var(--text-primary)',
            margin: 0,
            maxWidth: '48ch',
          }}>
            {briefing?.summary || (isEs
              ? 'Preparando tu resumen del día…'
              : 'Preparing your daily summary…')}
          </p>

          {(briefing || onNavigate) && (
            <button
              type="button"
              onClick={() => {
                if (briefing && onOpenReport) onOpenReport(briefing);
                else if (onNavigate) onNavigate('reports-hub');
              }}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                background: 'none',
                border: 'none',
                color: 'var(--accent-ink, var(--accent))',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isEs ? 'Ver informe completo' : 'View full report'}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={isEs ? 'Actualizar resumen' : 'Refresh summary'}
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--bg-root)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: refreshing ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
