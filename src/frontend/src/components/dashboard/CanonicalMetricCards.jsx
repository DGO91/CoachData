// src/frontend/src/components/dashboard/CanonicalMetricCards.jsx
import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, FileText, RefreshCw, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../common/Notifications';
import { authFetch } from '../../core/api/authFetch';

export function CanonicalMetricCards({ organizationId, language = 'es', onNavigate }) {
  const { notify } = useNotifications();
  const [stats, setStats] = useState({
    contacts: 0,
    paymentsCount: 0,
    paymentsTotal: 0,
    currency: 'EUR',
    sessions: 0,
    forms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isEs = language === 'es';

  const loadStats = async () => {
    try {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      // Query real canonical counts
      const [contactsRes, paymentsRes, sessionsRes, formsRes] = await Promise.all([
        supabase.from('canonical_contact').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('canonical_payment').select('amount_cents, currency').eq('organization_id', organizationId),
        supabase.from('canonical_session').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('canonical_form_entry').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      ]);

      const paymentsData = paymentsRes.data || [];
      const totalCents = paymentsData.reduce((acc, p) => acc + (p.amount_cents || 0), 0);
      const currency = paymentsData[0]?.currency || 'EUR';

      setStats({
        contacts: contactsRes.count || 0,
        paymentsCount: paymentsData.length,
        paymentsTotal: totalCents / 100,
        currency,
        sessions: sessionsRes.count || 0,
        forms: formsRes.count || 0,
      });
    } catch (err) {
      console.warn('[CanonicalMetricCards] Error loading canonical counts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [organizationId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await authFetch('/api/integrations/backfill/all', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify(
          isEs
            ? `Sincronización completada: ${data.totalIngested || 0} eventos actualizados.`
            : `Sync completed: ${data.totalIngested || 0} events updated.`,
          { type: 'success' }
        );
        await loadStats();
      } else {
        notify(data.message || (isEs ? 'Sincronización finalizada' : 'Sync completed'), { type: 'info' });
      }
    } catch (err) {
      notify(isEs ? 'Error al sincronizar datos' : 'Error syncing data', { type: 'warning' });
    } finally {
      setSyncing(false);
    }
  };

  const cards = [
    {
      id: 'contacts',
      title: isEs ? 'Contactos & Leads' : 'Contacts & Leads',
      value: stats.contacts,
      formattedValue: stats.contacts.toLocaleString(),
      subtitle: isEs ? 'En Lead Hub' : 'In Lead Hub',
      icon: Users,
      target: 'phase1',
      sparklineColor: 'var(--accent-ink, var(--accent))',
      points: '0,20 15,16 30,18 45,12 60,15 75,8 90,4',
    },
    {
      id: 'payments',
      title: isEs ? 'Volumen Facturado' : 'Billed Volume',
      value: stats.paymentsTotal,
      formattedValue: `${stats.paymentsTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${stats.currency}`,
      subtitle: isEs ? `${stats.paymentsCount} cobros Stripe` : `${stats.paymentsCount} Stripe payments`,
      icon: DollarSign,
      target: 'phase7',
      sparklineColor: 'var(--good, #22c55e)',
      points: '0,22 15,20 30,14 45,15 60,9 75,6 90,2',
    },
    {
      id: 'sessions',
      title: isEs ? 'Sesiones Agendadas' : 'Booked Sessions',
      value: stats.sessions,
      formattedValue: stats.sessions.toLocaleString(),
      subtitle: isEs ? 'Calendly & Google' : 'Calendly & Google',
      icon: Calendar,
      target: 'phase6',
      sparklineColor: 'var(--accent-ink, var(--accent))',
      points: '0,18 15,22 30,12 45,16 60,8 75,10 90,5',
    },
    {
      id: 'forms',
      title: isEs ? 'Formularios Recibidos' : 'Forms Captured',
      value: stats.forms,
      formattedValue: stats.forms.toLocaleString(),
      subtitle: isEs ? 'Tally & Webhooks' : 'Tally & Webhooks',
      icon: FileText,
      target: 'phase1',
      sparklineColor: 'var(--warn, #f59e0b)',
      points: '0,20 15,18 30,19 45,13 60,11 75,7 90,3',
    },
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {isEs ? 'Centro Canónico de Datos' : 'Canonical Data Center'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {isEs ? 'Información unificada de Stripe, Calendly, Tally y WhatsApp en tiempo real' : 'Unified live metrics from Stripe, Calendly, Tally, and WhatsApp'}
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!syncing) e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            if (!syncing) e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{syncing ? (isEs ? 'Sincronizando...' : 'Syncing...') : (isEs ? 'Sincronizar Todo' : 'Sync All')}</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate && card.target && onNavigate(card.target)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: card.target ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'var(--bg-root)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-ink, var(--accent))',
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {card.title}
                  </span>
                </div>

                <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      lineHeight: 1.1,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {loading ? '—' : card.formattedValue}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {card.subtitle}
                  </div>
                </div>

                {/* Micro SVG Sparkline */}
                <svg width="60" height="24" viewBox="0 0 90 24" style={{ overflow: 'visible' }}>
                  <polyline
                    fill="none"
                    stroke={card.sparklineColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={card.points}
                    style={{ opacity: 0.8 }}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
