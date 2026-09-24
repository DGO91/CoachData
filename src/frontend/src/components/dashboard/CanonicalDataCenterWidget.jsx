// src/frontend/src/components/dashboard/CanonicalDataCenterWidget.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Users, CreditCard, CalendarDays, FileText, RefreshCw, Layers } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export function CanonicalDataCenterWidget({ language = 'es' }) {
  const isEs = language === 'es';
  const [stats, setStats] = useState({ contacts: 0, payments: 0, sessions: 0, forms: 0 });
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/integrations/status', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('[CanonicalDataCenterWidget] Error fetching status:', err);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const headers = await authHeaders();
      let totalSynced = 0;

      for (const prov of ['stripe', 'calendly', 'tally', 'kajabi']) {
        const res = await fetch('/api/integrations/trigger-backfill', {
          method: 'POST',
          headers,
          body: JSON.stringify({ providerId: prov, sinceDays: 90 }),
        });
        if (res.ok) {
          const d = await res.json();
          totalSynced += (d.ingested || 0);
        }
      }

      await fetchStats();
      setFeedback({
        isError: false,
        text: isEs
          ? `Sincronización completada: ${totalSynced} registros actualizados en la plataforma.`
          : `Sync completed: ${totalSynced} records updated in the platform.`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({ isError: true, text: `Error: ${err.message}` });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '16px',
      padding: '20px 24px', borderRadius: '16px',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'var(--bg-muted)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-ink, var(--accent))',
          }}>
            <Layers size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{isEs ? 'Centro de Datos Unificado (La Cabeza del Pulpo)' : 'Unified Data Center (The Head)'}</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success, #22c55e)' }} />
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {isEs
                ? 'Todos los datos de tus clientes, cobros, citas y formularios conectados en un solo lugar.'
                : 'All your customer data, payments, appointments, and forms unified in one place.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--bg-muted)',
            color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
          {syncing
            ? (isEs ? 'Sincronizando Todo…' : 'Syncing All…')
            : (isEs ? 'Sincronizar Todo' : 'Sync All')}
        </button>
      </div>

      {feedback && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
          background: feedback.isError ? 'var(--crit-bg, rgba(239, 68, 68, 0.12))' : 'rgba(74, 222, 128, 0.12)',
          color: feedback.isError ? 'var(--crit, #ef4444)' : 'var(--success, #22c55e)',
          border: `1px solid ${feedback.isError ? 'var(--crit, #ef4444)' : '#4ade80'}`,
        }}>
          {feedback.text}
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
      }}>
        <div style={{ padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <Users size={15} style={{ color: 'var(--accent)' }} />
            <span>{isEs ? 'Contactos CRM' : 'CRM Contacts'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {stats.contacts}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEs ? 'Clientes y prospectos centralizados' : 'Centralized leads & clients'}
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <CreditCard size={15} style={{ color: 'var(--success, #22c55e)' }} />
            <span>{isEs ? 'Cobros & Pagos' : 'Payments & Revenue'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {stats.payments}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEs ? 'Transacciones de Stripe y plataformas' : 'Transactions from Stripe & gateways'}
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <CalendarDays size={15} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <span>{isEs ? 'Sesiones & Citas' : 'Booked Sessions'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {stats.sessions}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEs ? 'Calendly & Google Calendar' : 'Calendly & Google Calendar'}
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <FileText size={15} style={{ color: 'var(--accent)' }} />
            <span>{isEs ? 'Formularios' : 'Forms & Leads'}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {stats.forms}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEs ? 'Respuestas de Tally y WhatsApp' : 'Tally & WhatsApp responses'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanonicalDataCenterWidget;
