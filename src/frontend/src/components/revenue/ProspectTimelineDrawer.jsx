// src/frontend/src/components/revenue/ProspectTimelineDrawer.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Building,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Bot,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../common/Notifications';
import { authFetch } from '../../core/api/authFetch';

export function ProspectTimelineDrawer({
  isOpen,
  onClose,
  lead,
  language = 'es',
  onStageChange,
  onRequalify,
  onNavigate,
}) {
  const { notify } = useNotifications();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'details'
  const [recalculating, setRecalculating] = useState(false);

  const isEs = language === 'es';

  useEffect(() => {
    if (!isOpen || !lead?.id) return;

    let isMounted = true;

    async function fetchTimeline() {
      setLoading(true);
      setTimeline([]);
      try {
        const orgSlug = localStorage.getItem('coachdata_org_slug') || 'default';
        const res = await authFetch(`/api/revenue/clients/timeline?contact_id=${lead.id}&email=${encodeURIComponent(lead.email || '')}`, {
          headers: {
            'x-organization-slug': orgSlug,
          },
        });
        const data = await res.json();
        if (isMounted) {
          if (data.success && Array.isArray(data.timeline)) {
            setTimeline(data.timeline);
          } else {
            setTimeline([]);
          }
        }
      } catch (err) {
        console.warn('[ProspectTimelineDrawer] Error fetching timeline:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTimeline();

    // Close on ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const leadScore = lead.lead_score;
  const isScored = leadScore !== null && leadScore !== undefined;

  const getScoreBadge = () => {
    if (!isScored) {
      return {
        label: isEs ? 'Sin Calificar' : 'Unrated',
        bg: 'var(--bg-muted)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border)',
      };
    }
    if (leadScore >= 80) {
      return {
        label: `${leadScore}/100 · ${isEs ? 'Alta Intención' : 'High Intent'}`,
        bg: 'rgba(34, 197, 94, 0.12)',
        color: 'var(--good, #22c55e)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
      };
    }
    if (leadScore >= 60) {
      return {
        label: `${leadScore}/100 · ${isEs ? 'Interés Medio' : 'Medium Intent'}`,
        bg: 'rgba(184, 152, 90, 0.15)',
        color: 'var(--accent-ink, var(--accent))',
        border: '1px solid rgba(184, 152, 90, 0.35)',
      };
    }
    return {
      label: `${leadScore}/100 · ${isEs ? 'Bajo Encaje' : 'Low Fit'}`,
      bg: 'rgba(239, 68, 68, 0.12)',
      color: 'var(--danger, #ef4444)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  };

  const scoreBadge = getScoreBadge();
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email || 'Prospecto';
  const companyName = lead.company?.name || lead.company_name || 'Particular';

  const handleManualRequalify = async () => {
    setRecalculating(true);
    try {
      if (onRequalify) {
        await onRequalify(lead);
      }
      notify(isEs ? 'Calificación de IA recalculada con éxito' : 'AI qualification recalculated successfully', { type: 'success' });
    } catch (err) {
      notify(isEs ? 'Error al recalcular puntuación' : 'Error recalculating score', { type: 'warning' });
    } finally {
      setRecalculating(false);
    }
  };

  const renderTimelineEventIcon = (provider, type) => {
    const p = (provider || type || '').toLowerCase();
    if (p.includes('stripe') || p.includes('payment')) return <DollarSign size={14} style={{ color: 'var(--good, #22c55e)' }} />;
    if (p.includes('calendly') || p.includes('session')) return <Calendar size={14} style={{ color: 'var(--accent-ink, var(--accent))' }} />;
    if (p.includes('tally') || p.includes('form')) return <FileText size={14} style={{ color: 'var(--warn, #f59e0b)' }} />;
    if (p.includes('whatsapp')) return <MessageSquare size={14} style={{ color: 'var(--good, #22c55e)' }} />;
    return <Clock size={14} style={{ color: 'var(--text-muted)' }} />;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-root)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(184, 152, 90, 0.15)',
                border: '1px solid rgba(184, 152, 90, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--accent-ink, var(--accent))',
              }}
            >
              {fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {fullName}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{companyName}</span>
                <span>•</span>
                <span>{lead.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead Score Hero Banner */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={15} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isEs ? 'Puntuación de Inteligencia' : 'AI Lead Qualification'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  ...scoreBadge,
                }}
              >
                {scoreBadge.label}
              </span>

              <button
                onClick={handleManualRequalify}
                disabled={recalculating}
                title={isEs ? 'Recalcular con IA' : 'Re-score with AI'}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  color: 'var(--text-secondary)',
                  cursor: recalculating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                }}
              >
                <RefreshCw size={11} className={recalculating ? 'animate-spin' : ''} />
                <span>{recalculating ? '...' : (isEs ? 'Recalcular' : 'Recalculate')}</span>
              </button>
            </div>
          </div>

          {/* AI Justification text */}
          <div
            style={{
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              background: 'var(--bg-root)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            {lead.score_reason || (
              isEs
                ? 'El prospecto aún no ha sido analizado por el algoritmo de scoring. Haz clic en Recalcular para evaluar su perfil.'
                : 'This prospect has not yet been analyzed by the scoring algorithm. Click Recalculate to evaluate profile.'
            )}
          </div>
        </div>

        {/* Tabs: Timeline vs Details */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            padding: '0 20px',
            background: 'var(--bg-root)',
          }}
        >
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isEs ? 'Timeline Canónico' : 'Canonical Timeline'}
          </button>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'details' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'details' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isEs ? 'Detalles de Contacto' : 'Contact Details'}
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'timeline' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {isEs ? 'Eventos registrados del pulpo de datos' : 'Recorded events from data octopus'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {timeline.length} {isEs ? 'eventos' : 'events'}
                </span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      style={{
                        height: '56px',
                        background: 'var(--bg-root)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    background: 'var(--bg-root)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border)',
                  }}
                >
                  <Clock size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isEs ? 'Sin eventos canónicos asociados' : 'No associated canonical events'}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {isEs
                      ? 'Cuando este contacto complete un formulario en Tally, agende en Calendly o realice un cobro en Stripe, aparecerá aquí.'
                      : 'When this contact completes a Tally form, books in Calendly, or pays via Stripe, events will appear here.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {timeline.map((evt, idx) => (
                    <div
                      key={evt.id || idx}
                      style={{
                        background: 'var(--bg-root)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {renderTimelineEventIcon(evt.source_provider, evt.type)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {evt.title || evt.type || 'Evento'}
                          </span>
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
                            {evt.source_provider || 'Canónico'}
                          </span>
                        </div>

                        {evt.details && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)}
                          </div>
                        )}

                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          {evt.occurred_at ? new Date(evt.occurred_at).toLocaleString() : 'Recientemente'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isEs ? 'Email de Contacto' : 'Contact Email'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{lead.email || '—'}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isEs ? 'Teléfono' : 'Phone'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{lead.phone || '—'}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isEs ? 'Empresa / Organización' : 'Company / Organization'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Building size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{companyName}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {isEs ? 'Etapa en el Pipeline' : 'Pipeline Stage'}
                </label>
                <select
                  value={lead.status || 'lead'}
                  onChange={(e) => onStageChange && onStageChange(lead.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="lead">Lead (Nuevo)</option>
                  <option value="contacted">Contactado</option>
                  <option value="qualified">Calificado</option>
                  <option value="proposal_sent">Propuesta Enviada</option>
                  <option value="won">Ganado (Cerrado)</option>
                  <option value="lost">Perdido</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-root)',
            display: 'flex',
            gap: '10px',
          }}
        >
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                background: 'var(--good, #22c55e)',
                color: '#10231A',
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </a>
          )}

          <button
            onClick={() => {
              onClose();
              if (onNavigate) onNavigate('phase7');
            }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'var(--accent-text, #ffffff)',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <DollarSign size={14} />
            <span>{isEs ? 'Crear Propuesta' : 'Create Proposal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
