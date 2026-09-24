// src/frontend/src/components/dashboard/ExecutiveInsightsPanel.jsx
import React from 'react';
import { ArrowUpRight, Target, TrendingUp, Lightbulb } from 'lucide-react';
import { useExecutiveInsights } from '../../hooks/useExecutiveInsights';
import { TRANSLATIONS } from '../../i18n/translations';

export function ExecutiveInsightsPanel({ organizationId, language = 'es', onNavigate }) {
  const { insights, loading } = useExecutiveInsights(organizationId, language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high':
        return {
          badgeBg: 'var(--crit-bg, rgba(239, 68, 68, 0.12))',
          badgeColor: 'var(--crit)',
        };
      case 'medium':
        return {
          badgeBg: 'var(--warn-bg, rgba(245, 158, 11, 0.12))',
          badgeColor: 'var(--warn)',
        };
      default:
        return {
          badgeBg: 'rgba(56, 189, 248, 0.12)',
          badgeColor: 'var(--accent)',
        };
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return t.high_level || 'Alta';
      case 'medium': return t.medium_level || 'Media';
      case 'low': return t.low_level || 'Baja';
      default: return priority;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'focus': return <Target size={16} />;
      case 'growth': return <TrendingUp size={16} />;
      default: return <Lightbulb size={16} />;
    }
  };

  return (
    <div className="ogd-panel ogd-executive-insights-panel">
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.executive_insights}</span>
        </div>
        <span style={{ fontSize: '12px', background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>
          {insights.length} {t.active_insights_badge}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {insights.map((ins) => {
          const style = getPriorityStyle(ins.priority);
          return (
            <div
              key={ins.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: style.badgeColor, background: style.badgeBg, padding: '2px 6px', borderRadius: '4px' }}>
                    {getPriorityLabel(ins.priority)}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{getIcon(ins.type)}</span>
                </div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {ins.title}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {ins.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ins.action}
                </span>
                {onNavigate && ins.targetTab && (
                  <button
                    onClick={() => onNavigate(ins.targetTab)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-ink, var(--accent))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <span>{t.view_tasks}</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
