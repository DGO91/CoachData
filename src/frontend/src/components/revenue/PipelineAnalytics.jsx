// src/frontend/src/components/revenue/PipelineAnalytics.jsx
import React from 'react';
import { BarChart3, TrendingUp, Bot, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePipelineAnalytics } from '../../hooks/usePipelineAnalytics';
import EmptyState from '../common/EmptyState';
import { CardSkeleton } from '../common/SkeletonLoader';

const CARD_STYLE = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-sm)',
};

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
};

function formatCurrency(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export default function PipelineAnalytics({ language = 'es' }) {
  const isEs = language === 'es';
  const { loading, error, metrics, hasAnyData, reload } = usePipelineAnalytics();

  if (loading) {
    return (
      <div style={GRID_STYLE}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
        <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEs ? 'No se pudieron cargar las métricas' : 'Could not load metrics'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '32rem' }}>{error}</div>
        <button
          type="button"
          onClick={reload}
          style={{
            marginTop: '0.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} />
          {isEs ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!metrics || !hasAnyData) {
    return (
      <EmptyState
        icon="users"
        title={isEs ? 'Todavía no hay actividad en el pipeline' : 'No pipeline activity yet'}
        description={
          isEs
            ? 'Cuando entren leads, llamadas o propuestas, aquí verás las métricas reales de tu negocio. No mostramos cifras de ejemplo.'
            : 'Once leads, calls or proposals come in, you will see your real metrics here. We do not show sample figures.'
        }
      />
    );
  }

  const locale = isEs ? 'es-ES' : 'en-US';

  const metricCards = [
    {
      label: isEs ? 'Leads Captados (30d)' : 'Captured Leads (30d)',
      value: String(metrics.leadsLast30d),
      icon: <TrendingUp size={16} />,
      color: 'var(--accent-ink, var(--accent))',
    },
    {
      label: isEs ? 'Leads Cualificados' : 'Qualified Leads',
      value: String(metrics.leadsQualified),
      icon: <Bot size={16} />,
      color: 'var(--info)',
    },
    {
      label: isEs ? 'Llamadas Registradas' : 'Calls Recorded',
      value: String(metrics.callsRecorded),
      icon: <BarChart3 size={16} />,
      color: 'var(--accent-ink, var(--accent))',
    },
    {
      label: isEs ? 'Propuestas Aprobadas' : 'Approved Proposals',
      value: String(metrics.proposalsApproved),
      icon: <CheckCircle size={16} />,
      color: 'var(--good, var(--success))',
    },
  ];

  const subMetrics = [
    {
      label: isEs ? 'Tasa de Cualificación' : 'Qualification Rate',
      value: metrics.qualificationRate === null ? '—' : `${metrics.qualificationRate.toFixed(1)}%`,
      detail: isEs
        ? `${metrics.leadsQualified} de ${metrics.leadsTotal} leads`
        : `${metrics.leadsQualified} of ${metrics.leadsTotal} leads`,
    },
    {
      label: isEs ? 'Propuestas Enviadas' : 'Proposals Created',
      value: String(metrics.proposalsTotal),
      detail: isEs
        ? `${metrics.proposalsApproved} aprobadas`
        : `${metrics.proposalsApproved} approved`,
    },
    {
      label: isEs ? 'Valor en Pipeline' : 'Pipeline Value',
      value: formatCurrency(metrics.pipelineValue, metrics.currency, locale),
      detail: isEs
        ? `${metrics.openDealsCount} operaciones abiertas`
        : `${metrics.openDealsCount} open deals`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Métricas principales */}
      <div style={GRID_STYLE}>
        {metricCards.map((m) => (
          <div
            key={m.label}
            style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.label}</span>
              <span style={{ color: m.color }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Métricas derivadas */}
      <div style={{ ...GRID_STYLE, gap: '1.25rem' }}>
        {subMetrics.map((sm) => (
          <div key={sm.label} style={CARD_STYLE}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {sm.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {sm.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
              {sm.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
