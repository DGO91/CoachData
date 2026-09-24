// src/frontend/src/components/dashboard/ProductivitySignalsPanel.jsx
import React from 'react';
import { TrendingUp, Gauge, Cpu, Award } from 'lucide-react';
import { useProductivitySignals } from '../../hooks/useProductivitySignals';
import { TRANSLATIONS } from '../../i18n/translations';

export function ProductivitySignalsPanel({ organizationId, language = 'es' }) {
  const {
    completionTrend,
    resolutionVelocity,
    aiAdoptionLevel,
    operationalConsistency,
    momentumScore,
    loading
  } = useProductivitySignals(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  const getAdoptionText = (level) => {
    switch (level) {
      case 'high': return t.high_level;
      case 'medium': return t.medium_level;
      default: return t.low_level;
    }
  };

  return (
    <div className="ogd-panel ogd-executive-productivity-panel">
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.productivity_signals}</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {t.momentum_score}: <strong style={{ color: 'var(--accent-ink, var(--accent))' }}>{momentumScore}/100</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* Signal 1: Weekly Completion Rate */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.weekly_completion_rate}</span>
            <TrendingUp size={16} style={{ color: 'var(--good, #22c55e)' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {completionTrend}%
          </div>
          <div style={{ height: '4px', background: 'var(--bg-muted)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionTrend}%`, background: 'var(--good, #22c55e)' }} />
          </div>
        </div>

        {/* Signal 2: Resolution Velocity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.resolution_velocity}</span>
            <Gauge size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {resolutionVelocity} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>{t.tasks_per_day}</span>
          </div>
        </div>

        {/* Signal 3: AI Adoption */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.ai_adoption}</span>
            <Cpu size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {getAdoptionText(aiAdoptionLevel)}
          </div>
        </div>

        {/* Signal 4: Momentum & Consistency */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.operational_consistency}</span>
            <Award size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {operationalConsistency}%
          </div>
          <div style={{ height: '4px', background: 'var(--bg-muted)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${operationalConsistency}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
