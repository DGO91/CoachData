// src/frontend/src/components/dashboard/OperationalGoldDashboard.jsx
import React from 'react';
import './dashboard.css';
import { GoldHeroHeader } from './GoldHeroHeader';
import { CanonicalMetricCards } from './CanonicalMetricCards';
import { LiveActivityStream } from './LiveActivityStream';
import { AIAgentsRadar } from './AIAgentsRadar';
import { ExecutiveBriefingHero } from './ExecutiveBriefingHero';
import { AgentReportsFeedWidget } from './AgentReportsFeedWidget';
import { AgentTelemetryPanel } from './AgentTelemetryPanel';
import { OnboardingGuia } from './OnboardingGuia';
import { AgentLiveConsoleDrawer } from '../agents/AgentLiveConsoleDrawer';
import { UpcomingSessionsPanel } from './UpcomingSessionsPanel';
import { FocusRecommendationsPanel } from './FocusRecommendationsPanel';
import { ExecutiveInsightsPanel } from './ExecutiveInsightsPanel';
import { ProductivitySignalsPanel } from './ProductivitySignalsPanel';
import { DailyWinsPanel } from './DailyWinsPanel';
import { TeamActivityPanel } from './TeamActivityPanel';
import { OnlineUsersAvatars } from '../OnlineUsersAvatars';
import { useOperationsTasks } from '../../hooks/useOperationsTasks';
import { useOrganizationPresence } from '../../hooks/useOrganizationPresence';
import { useActiveOrganizationId } from '../../hooks/useActiveOrganizationId';
import { TRANSLATIONS } from '../../i18n/translations';

export function OperationalGoldDashboard({ organizationId: organizationIdProp, theme = 'dark', language = 'es', userProfile, onNavigate }) {
  const { organizationId: resolvedOrgId, loading: orgLoading } = useActiveOrganizationId();
  const organizationId = organizationIdProp || resolvedOrgId;

  const [activeReportDrawer, setActiveReportDrawer] = React.useState(null);

  const { tasks, loading: tasksLoading } = useOperationsTasks(organizationId);
  const { onlineUsers, isConnected } = useOrganizationPresence(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const localUserName = userProfile?.name || localStorage.getItem('coachdata-user-name') || 'Coach';
  const loading = orgLoading || tasksLoading;

  if (loading) {
    return (
      <div className="ogd-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="ogd-shell">
      {/* Puesta en marcha. Va lo primero porque mientras falte algo por conectar,
          todo lo que hay debajo está vacío: enseñar paneles sin datos y no decir
          qué hacer es el momento en que la gente abandona. Desaparece sola en
          cuanto todo está conectado y configurado. */}
      <OnboardingGuia language={language} onNavigate={onNavigate} />

      {/* 1. Executive Briefing Hero (Foco y Prioridades del Día con Claude Sonnet 5) */}
      <ExecutiveBriefingHero
        language={language}
        userProfile={userProfile}
        onNavigate={onNavigate}
        onOpenReport={(rep) => setActiveReportDrawer({ name: rep.title, category: 'Briefing Diario', id: 'briefing', content: rep.content_markdown })}
      />

      {/* 2. Centro Canónico de Datos Unificado (4 KPI Cards con Sparklines & Sync) */}
      <CanonicalMetricCards organizationId={organizationId} language={language} onNavigate={onNavigate} />

      {/* Las dos preguntas restantes, una por columna: qué tengo hoy y qué
          requiere mi atención. El dinero ya lo responden las tarjetas de arriba.

          Antes esta rejilla apilaba doce paneles de igual peso, así que la
          pantalla no respondía nada: había que leerla entera para saber si algo
          iba mal. Lo que no contesta una de las tres preguntas se ha movido al
          desplegable de detalle, más abajo. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '20px',
          alignItems: 'start',
        }}
        className="ogd-main-grid"
      >
        {/* QUÉ TENGO HOY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <UpcomingSessionsPanel organizationId={organizationId} language={language} />
          <FocusRecommendationsPanel organizationId={organizationId} language={language} onNavigate={onNavigate} />
        </div>

        {/* QUÉ REQUIERE MI ATENCIÓN — incluidas las alertas de integración caída,
            que llegan como un reporte más al buzón. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AgentReportsFeedWidget
            language={language}
            onNavigate={onNavigate}
            onOpenReport={(rep) => setActiveReportDrawer({ name: rep.title, category: rep.agent_type || rep.category, id: rep.id, content: rep.content_markdown || rep.content })}
          />
          <AgentTelemetryPanel language={language} />
        </div>
      </div>

      {/* Todo lo que no responde a las tres preguntas vive aquí, cerrado por
          omisión. No se ha borrado nada: se retira del primer golpe de vista, que
          es lo que hacía ilegible la pantalla. */}
      <details className="ogd-detalle">
        <summary>
          {language === 'es' ? 'Ver más detalle' : 'More detail'}
        </summary>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
          <LiveActivityStream organizationId={organizationId} language={language} onNavigate={onNavigate} />
          <ExecutiveInsightsPanel organizationId={organizationId} language={language} onNavigate={onNavigate} />
          <AIAgentsRadar language={language} onNavigate={onNavigate} />
          <ProductivitySignalsPanel organizationId={organizationId} language={language} />
          <DailyWinsPanel organizationId={organizationId} tasks={tasks} language={language} />

          {/* Team Presence Panel */}
          <div className="ogd-panel" style={{ height: 'fit-content' }}>
            <div className="ogd-panel-header">
              <span>{t.onlineTeam}</span>
              <span style={{ fontSize: '12px', color: isConnected ? 'var(--good, #22c55e)' : 'var(--danger, #ef4444)' }}>
                {isConnected ? `● ${t.realtime || 'Realtime'}` : `○ ${t.reconnecting || 'Reconectando'}`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t.active_collaborators || (language === 'es' ? 'Colaboradores Activos:' : 'Active Collaborators:')}
                </span>
                <OnlineUsersAvatars onlineUsers={onlineUsers} isConnected={isConnected} maxDisplay={5} />
              </div>

              {onlineUsers.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {t.no_active_members || (language === 'es' ? 'No hay otros miembros activos en esta sesión.' : 'No other members are active in this session.')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {onlineUsers.map((usr, idx) => (
                    <div
                      key={usr.key || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '6px 10px',
                        background: 'var(--bg-root)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{usr.fullName}</span>
                      <span style={{ color: 'var(--accent-ink, var(--accent))', fontSize: '11px' }}>{usr.currentView}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* Slide-over Drawer for reading generated AI Reports */}
      {activeReportDrawer && (
        <AgentLiveConsoleDrawer
          isOpen={!!activeReportDrawer}
          onClose={() => setActiveReportDrawer(null)}
          agent={activeReportDrawer}
          language={language}
          userProfile={userProfile}
        />
      )}
    </div>
  );
}


export default OperationalGoldDashboard;
