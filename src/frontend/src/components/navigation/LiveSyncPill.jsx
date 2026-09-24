// src/frontend/src/components/navigation/LiveSyncPill.jsx
import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export function LiveSyncPill({ language = 'es' }) {
  const [status, setStatus] = useState('connected'); // 'connected' | 'syncing' | 'offline'

  useEffect(() => {
    // Monitor online/offline events
    const handleOnline = () => setStatus('connected');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isEs = language === 'es';
  const label = status === 'connected' 
    ? (isEs ? 'En vivo' : 'Live') 
    : status === 'syncing' 
      ? (isEs ? 'Sincronizando' : 'Syncing') 
      : (isEs ? 'Sin conexión' : 'Offline');

  const tooltipText = status === 'connected'
    ? (isEs ? 'Conectado a la red de datos en tiempo real' : 'Connected to real-time data network')
    : (isEs ? 'Intentando reconectar con la base de datos' : 'Attempting to reconnect with database');

  return (
    <div
      title={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '999px',
        background: 'var(--bg-root)',
        border: '1px solid var(--border)',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        cursor: 'default',
        userSelect: 'none',
        transition: 'border-color 0.2s ease',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: status === 'connected' ? 'var(--good, #22c55e)' : status === 'syncing' ? 'var(--warn, #f59e0b)' : 'var(--danger, #ef4444)',
          boxShadow: status === 'connected' ? '0 0 6px var(--good, #22c55e)' : 'none',
          display: 'inline-block',
        }}
      />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
    </div>
  );
}
