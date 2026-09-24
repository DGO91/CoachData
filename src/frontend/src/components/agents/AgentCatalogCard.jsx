// src/frontend/src/components/agents/AgentCatalogCard.jsx
import React from 'react';
import { Bot, Play, Settings, Shield, Clock, ChevronRight } from 'lucide-react';

export function AgentCatalogCard({
  agent,
  language = 'es',
  onExecute,
  onConfigure,
}) {
  const isEs = language === 'es';

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-root)',
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
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {agent.name}
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {agent.category}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: agent.status === 'active' ? 'var(--good, #22c55e)' : 'var(--text-muted)',
                boxShadow: agent.status === 'active' ? '0 0 5px var(--good, #22c55e)' : 'none',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {agent.status === 'active' ? (isEs ? 'Activo' : 'Active') : (isEs ? 'Pausa' : 'Paused')}
            </span>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          {agent.description}
        </p>
      </div>

      {/* Footer Info & Action */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-root)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginBottom: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={12} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <span>{agent.model || 'Claude Sonnet 5'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={12} />
            <span>~{agent.latency || '30ms'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onExecute && onExecute(agent)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--accent)',
              border: 'none',
              color: 'var(--accent-text, #ffffff)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Play size={12} fill="currentColor" />
            <span>{isEs ? 'Generar Informe' : 'Generate Report'}</span>
          </button>

          {onConfigure && (
            <button
              onClick={() => onConfigure(agent)}
              title={isEs ? 'Configuración' : 'Configuration'}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
