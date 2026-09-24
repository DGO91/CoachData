// src/frontend/src/components/dashboard/HealthTrendMiniChart.jsx
import React from 'react';

export function HealthTrendMiniChart({ trend = 'stable' }) {
  let strokeColor = '#94a3b8';
  let pathD = 'M2 10 L10 10 L18 10'; // Horizontal / Stable

  if (trend === 'up') {
    strokeColor = '#22c55e';
    pathD = 'M2 14 L8 8 L14 11 L20 4'; // Upwards
  } else if (trend === 'down') {
    strokeColor = '#ef4444';
    pathD = 'M2 4 L8 10 L14 7 L20 16'; // Downwards
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: strokeColor }}>
      <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d={pathD} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontWeight: 600 }}>{trend === 'up' ? '↗ +Activo' : trend === 'down' ? '↘ Atención' : '→ Estable'}</span>
    </div>
  );
}
