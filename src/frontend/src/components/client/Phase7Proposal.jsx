// src/frontend/src/components/client/Phase7Proposal.jsx
import React, { useState } from 'react';
import { Send, FileText, CheckCircle, Clock, DollarSign, Eye, Download } from 'lucide-react';
import { TRANSLATIONS } from '../../core/constants/app.constants';

export default function Phase7Proposal({ language }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', color: 'var(--accent-ink, var(--accent))', textTransform: 'uppercase' }}>
            {t.phase7_badge}
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {t.phase7_title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', fontSize: '0.95rem' }}>
            {t.phase7_desc}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Estado:</div>
            <div style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'var(--warn-bg, rgba(245, 158, 11, 0.12))', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
              <Clock size={14} /> {t.action_req}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <button 
            onClick={handleSend}
            disabled={isSending || isSent}
            style={{ 
              padding: '0.75rem 1.5rem', 
              fontSize: '1rem', 
              borderRadius: '10px', 
              background: isSent ? 'var(--good-bg, rgba(34, 197, 94, 0.12))' : 'var(--accent)', 
              border: 'none', 
              color: isSent ? 'var(--good)' : 'var(--accent-text)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              cursor: (isSending || isSent) ? 'default' : 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            {isSending ? (
              <><div className="pulse-dot" style={{ background: 'var(--accent-text)' }}></div> {t.sending}</>
            ) : isSent ? (
              <><CheckCircle size={18} /> {t.sent}</>
            ) : (
              <><Send size={18} /> {t.send_btn}</>
            )}
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {t.webhook_hint}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Contract Preview Modal Canónico Oro Operativo */}
        <div style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', position: 'relative' }}>
          {/* Editor Header Simulation */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={14} /> contrato_martinez_v1.pdf
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Eye size={16} /></button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Download size={16} /></button>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', fontFamily: 'sans-serif' }}>
              {t.contract_title}
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Este documento establece los términos formales de la colaboración entre <strong style={{ color: 'var(--text-primary)' }}>CoachData Media</strong> y <strong style={{ color: 'var(--text-primary)' }}>{t.prospect_name}</strong> para la implementación de la infraestructura de automatización con Inteligencia Artificial.
            </p>

            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', marginTop: '2rem' }}>{t.c_deliverables}</h4>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
              <li>{t.c_d1}</li>
              <li>{t.c_d2}</li>
              <li>{t.c_d3}</li>
            </ul>

            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem', marginTop: '2rem' }}>{t.c_timeline}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {t.c_timeline_val} a partir del pago del Setup Fee inicial.
            </p>

            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
              <div style={{ width: '40%' }}>
                <div style={{ borderBottom: '1px solid var(--border)', height: '2rem', marginBottom: '0.5rem' }}></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Firma CoachData Media</div>
              </div>
              <div style={{ width: '40%' }}>
                <div style={{ borderBottom: '1px solid var(--border)', height: '2rem', marginBottom: '0.5rem' }}></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Firma {t.prospect_name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Breakdown */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', position: 'sticky', top: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <DollarSign size={20} color="var(--accent)" /> {t.invoice_title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t.i_setup}</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>$2,500 USD</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t.i_maint}</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>$500 USD/mes</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{t.i_total}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-ink, var(--accent))', fontSize: '1.4rem' }}>$2,500 USD</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
