// src/frontend/src/components/dashboard/LiveActivityStream.jsx
import React, { useState, useEffect } from 'react';
import { Activity, DollarSign, Calendar, FileText, UserPlus, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export function LiveActivityStream({ organizationId, language = 'es', onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const isEs = language === 'es';

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      if (!organizationId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Fetch recent payments, sessions, forms, and lead activities in parallel
        const [paymentsRes, sessionsRes, formsRes, contactsRes] = await Promise.all([
          supabase
            .from('canonical_payment')
            .select('id, amount_cents, currency, status, occurred_at, raw_payload')
            .eq('organization_id', organizationId)
            .order('occurred_at', { ascending: false })
            .limit(5),
          supabase
            .from('canonical_session')
            .select('id, session_type, attendee_email, starts_at, occurred_at')
            .eq('organization_id', organizationId)
            .order('occurred_at', { ascending: false })
            .limit(5),
          supabase
            .from('canonical_form_entry')
            .select('id, form_name, respondent_email, occurred_at')
            .eq('organization_id', organizationId)
            .order('occurred_at', { ascending: false })
            .limit(5),
          supabase
            .from('crm_contacts')
            .select('id, first_name, last_name, email, lead_score, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const combined = [];

        (paymentsRes.data || []).forEach((p) => {
          combined.push({
            id: `pay_${p.id}`,
            type: 'payment',
            title: isEs ? 'Cobro Procesado' : 'Payment Processed',
            description: `${(p.amount_cents / 100).toFixed(0)} ${p.currency || 'EUR'} · ${p.status || 'Completado'}`,
            provider: 'Stripe',
            timestamp: p.occurred_at || p.created_at,
            icon: DollarSign,
            color: 'var(--good, #22c55e)',
          });
        });

        (sessionsRes.data || []).forEach((s) => {
          combined.push({
            id: `sess_${s.id}`,
            type: 'session',
            title: isEs ? 'Sesión Agendada' : 'Session Booked',
            description: `${s.session_type || (isEs ? 'Reunión' : 'Meeting')} (${s.attendee_email || ''})`,
            provider: 'Calendly',
            timestamp: s.occurred_at || s.starts_at,
            icon: Calendar,
            color: 'var(--accent-ink, var(--accent))',
          });
        });

        (formsRes.data || []).forEach((f) => {
          combined.push({
            id: `form_${f.id}`,
            type: 'form',
            title: isEs ? 'Formulario Captado' : 'Form Captured',
            description: `${f.form_name || 'Formulario'} · ${f.respondent_email || ''}`,
            provider: 'Tally',
            timestamp: f.occurred_at,
            icon: FileText,
            color: 'var(--warn, #f59e0b)',
          });
        });

        (contactsRes.data || []).forEach((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Prospecto';
          combined.push({
            id: `lead_${c.id}`,
            type: 'lead',
            title: isEs ? 'Nuevo Prospecto' : 'New Lead',
            description: `${name} ${c.lead_score !== null && c.lead_score !== undefined ? `(Score: ${c.lead_score}/100)` : ''}`,
            provider: 'CRM Lead Hub',
            timestamp: c.created_at,
            icon: UserPlus,
            color: 'var(--accent-ink, var(--accent))',
          });
        });

        // Sort by timestamp desc
        combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (isMounted) {
          setEvents(combined.slice(0, 10));
          setLoading(false);
        }
      } catch (err) {
        console.warn('[LiveActivityStream] Error fetching stream:', err.message);
        if (isMounted) setLoading(false);
      }
    }

    loadActivity();
    return () => { isMounted = false; };
  }, [organizationId]);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return isEs ? 'Recientemente' : 'Recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return isEs ? 'Hace un momento' : 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return isEs ? `Hace ${diffMins}m` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return isEs ? `Hace ${diffHours}h` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return isEs ? 'Ayer' : 'Yesterday';
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
  };

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
          <Activity size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEs ? 'Flujo de Actividad en Vivo' : 'Live Activity Stream'}
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {events.length} {isEs ? 'eventos recientes' : 'recent events'}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                height: '48px',
                borderRadius: '8px',
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            background: 'var(--bg-root)',
            borderRadius: '8px',
            border: '1px dashed var(--border)',
          }}
        >
          <Clock size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {isEs ? 'Sin actividad reciente registrada' : 'No recent activity recorded'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
            {isEs
              ? 'Los cobros de Stripe, sesiones de Calendly y formularios de Tally aparecerán aquí automáticamente.'
              : 'Stripe payments, Calendly sessions, and Tally forms will appear here automatically.'}
          </p>
          <button
            onClick={() => onNavigate && onNavigate('settings')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--accent-ink, var(--accent))',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isEs ? 'Ver Bóveda de Conexiones' : 'View Connections Vault'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((evt) => {
            const Icon = evt.icon;
            return (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border)',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: evt.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {evt.description}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {evt.provider}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(evt.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
