// src/frontend/src/components/revenue/RevenueChiefAI.jsx
import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAutomationDispatcher } from '../../hooks/useAutomationDispatcher';
import AutomationStatusToast from './AutomationStatusToast';

export default function RevenueChiefAI({ language = 'es', leadData, onNextStep, setChiefResult }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';

  // Fallback to null or state message if no lead selected to prevent mock data leak
  const lead = leadData;

  const [emailText, setEmailText] = useState('');
  const { dispatch, status, result, error, reset } = useAutomationDispatcher();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (lead) {
      setEmailText(
        isEs
          ? `Hola ${lead.name},\n\nVi tu perfil en ${lead.source} y noté el crecimiento de ${lead.company}. En CoachData Media ayudamos a optimizar pipelines. ¿Te interesaría agendar una llamada breve de 15 minutos esta semana?\n\nSaludos,\nEquipo CoachData`
          : `Hi ${lead.name},\n\nI came across your profile on ${lead.source} and noticed ${lead.company}'s recent growth. At CoachData Media, we specialize in pipeline optimizations. Would you be open to a quick 15-minute call this week?\n\nBest regards,\nCoachData Team`
      );
    }
  }, [lead, isEs]);

  const handleAction = async () => {
    if (!lead) return;
    const r = await dispatch('revenue_chief_approved', {
      lead,
      emailDraft: emailText,
      notes: ''
    });

    if (r.success) {
      setSuccess(true);
      if (setChiefResult) {
        setChiefResult({ emailSent: true, emailDraft: emailText, lead, task_id: r.data?.task_id });
      }
      setTimeout(() => {
        if (onNextStep) onNextStep('call');
      }, 1500);
    }
  };

  if (!lead) {
    return (
      <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-surface)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          {isEs 
            ? 'Por favor, selecciona un prospecto en la pestaña Lead Hub antes de iniciar el triage inteligente.'
            : 'Please select a prospect in the Lead Hub tab before starting intelligent triage.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Info */}
      <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          AI Revenue Chief
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {isEs
            ? 'El núcleo inteligente de IA pre-califica leads, prepara borradores y conecta con ProjectDesk.'
            : 'The intelligent AI core pre-qualifies leads, drafts outreach and logs follow-ups with ProjectDesk.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Lead Summary */}
        <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {isEs ? 'Prospecto Seleccionado' : 'Selected Prospect'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Nombre: ' : 'Name: '}</span>
              <strong style={{ color: 'var(--text-primary)' }}>{lead.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Empresa: ' : 'Company: '}</span>
              <strong style={{ color: 'var(--text-primary)' }}>{lead.company}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Fuente: ' : 'Source: '}</span>
              <span style={{ background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-ink, var(--accent))', fontWeight: 600 }}>{lead.source}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Prioridad IA: ' : 'AI Priority: '}</span>
              <span style={{ color: lead.score >= 85 ? 'var(--good)' : 'var(--warn)', fontWeight: 700 }}>
                {lead.score >= 85 ? (isEs ? 'Alta' : 'High') : (isEs ? 'Media' : 'Medium')}
              </span>
            </div>
          </div>
        </div>

        {/* Email Draft Area */}
        <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={16} />
            {isEs ? 'Borrador de Contacto Generado por IA' : 'AI-Generated Contact Draft'}
          </h3>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            style={{
              width: '100%', minHeight: '120px',
              background: 'var(--bg-muted, rgba(255,255,255,0.02))',
              color: 'var(--text-primary)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px', fontSize: '13px',
              fontFamily: 'inherit', outline: 'none', resize: 'vertical'
            }}
          />
          <button
            onClick={handleAction}
            disabled={status === 'processing' || success}
            style={{
              height: '38px', borderRadius: '10px',
              background: success ? 'rgba(34, 197, 94, 0.12)' : 'var(--accent)',
              color: success ? 'var(--good)' : 'var(--accent-text, #ffffff)',
              border: 'none', fontWeight: 700, fontSize: '13px',
              cursor: (status === 'processing' || success) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {success ? (
              <><CheckCircle size={16} />{isEs ? 'Borrador Guardado & Tarea Creada' : 'Draft Saved & Task Logged'}</>
            ) : status === 'processing' ? (
              isEs ? 'Procesando…' : 'Processing…'
            ) : (
              <><Send size={16} />{isEs ? 'Aprobar Contacto & Log en ProjectDesk' : 'Approve Contact & Log to ProjectDesk'}</>
            )}
          </button>
        </div>
      </div>

      {/* Automation Status Toast */}
      {status !== 'idle' && (
        <AutomationStatusToast
          status={status}
          error={error}
          result={result}
          language={language}
          onRetry={handleAction}
          onDismiss={reset}
          autoDismissMs={status === 'completed' ? 4000 : null}
        />
      )}
    </div>
  );
}
