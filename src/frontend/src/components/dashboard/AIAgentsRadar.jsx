// src/frontend/src/components/dashboard/AIAgentsRadar.jsx
import React from 'react';
import { Bot, Play, ArrowRight } from 'lucide-react';

export function AIAgentsRadar({ language = 'es', onNavigate }) {
  const isEs = language === 'es';

  const agents = [
    {
      id: 'personal-agent',
      name: isEs ? 'Morning Briefing' : 'Morning Briefing',
      category: isEs ? 'Agenda & Correo' : 'Calendar & Email',
      status: 'active',
      latency: '28ms',
      tab: 'personal-agent',
    },
    {
      id: 'pre-call-agent',
      name: isEs ? 'Pre-Call Intelligence' : 'Pre-Call Intelligence',
      category: isEs ? 'Preparación de Ventas' : 'Sales Prep',
      status: 'active',
      latency: '34ms',
      tab: 'pre-call-agent',
    },
    {
      id: 'weekly-digest',
      name: isEs ? 'Weekly Digest' : 'Weekly Digest',
      category: isEs ? 'Resumen de Rendimiento' : 'Performance Digest',
      status: 'active',
      latency: '41ms',
      tab: 'weekly-digest',
    },
    {
      id: 'evening-summary',
      name: isEs ? 'Evening Summary' : 'Evening Summary',
      category: isEs ? 'Cierre Diario' : 'Daily Close',
      status: 'active',
      latency: '31ms',
      tab: 'evening-summary',
    },
    {
      id: 'prospect',
      name: isEs ? 'Prospect Analyzer' : 'Prospect Analyzer',
      category: isEs ? 'Calificación de Leads' : 'Lead Scoring',
      status: 'active',
      latency: '26ms',
      tab: 'prospect',
    },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEs ? 'Radar de Agentes IA' : 'AI Agents Radar'}
          </h3>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('agents-hub')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-ink, var(--accent))',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          <span>{isEs ? 'Ver Catálogo' : 'View Catalog'}</span>
          <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onNavigate && onNavigate(agent.tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-root)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.background = 'var(--bg-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-root)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--good, #22c55e)',
                  boxShadow: '0 0 5px var(--good, #22c55e)',
                  display: 'inline-block',
                }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {agent.category}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-muted)',
                }}
              >
                {agent.latency}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) onNavigate(agent.tab);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-ink, var(--accent))',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Play size={10} />
                <span>{isEs ? 'Abrir' : 'Open'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
