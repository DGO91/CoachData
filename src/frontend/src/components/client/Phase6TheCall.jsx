// src/frontend/src/components/client/Phase6TheCall.jsx
import React, { useState } from 'react';
import { Phone, CheckCircle, BarChart3, AlertTriangle, MessageSquare, FastForward, Target } from 'lucide-react';
import { TRANSLATIONS } from '../../core/constants/app.constants';

export default function Phase6TheCall({ language }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [isApproved, setIsApproved] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', color: 'var(--accent-ink, var(--accent))', textTransform: 'uppercase' }}>
              {t.phase6_badge}
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {t.phase6_title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', fontSize: '0.95rem' }}>
              {t.phase6_desc}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsApproved(!isApproved)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                background: isApproved ? 'var(--good-bg, rgba(34, 197, 94, 0.12))' : 'var(--accent)',
                color: isApproved ? 'var(--good)' : 'var(--accent-text)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <CheckCircle size={18} />
              {isApproved ? t.approved_state : t.approve_call_btn}
            </button>
          </div>
        </div>
      </div>

      {/* Audio Player Card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.call_title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.call_subtitle}</div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>24:15 / 24:15</span>
        </div>

        {/* Fake Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px', padding: '0.5rem 0' }}>
          {[40, 70, 30, 85, 60, 90, 45, 30, 75, 100, 65, 40, 80, 95, 50, 30, 70, 85, 60, 40, 90, 75, 50, 30, 60, 80, 40, 70, 90, 50, 30].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                background: i < 20 ? 'var(--accent)' : 'var(--border)',
                borderRadius: '2px',
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Probability */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '50%', background: 'conic-gradient(var(--good) 85%, var(--border) 0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              85%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{t.kpi_probability}</div>
            <div style={{ fontWeight: '600', color: 'var(--good)' }}>{t.probability_high}</div>
          </div>
        </div>

        {/* Friction */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--good-bg, rgba(34, 197, 94, 0.1))', borderRadius: '50%' }}>
            <AlertTriangle size={24} color="var(--good)" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{t.kpi_friction}</div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.friction_low}</div>
          </div>
        </div>

        {/* Talk Ratio */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-muted)', borderRadius: '50%' }}>
            <BarChart3 size={24} color="var(--accent)" />
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t.kpi_talk_ratio}</div>
            <div style={{ display: 'flex', width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '60%', background: 'var(--accent)' }}></div>
              <div style={{ width: '40%', background: 'var(--border)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
              <span>{t.ratio_client}</span>
              <span>{t.ratio_you}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Extractions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Pain Points */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <Target size={18} color="var(--accent)" /> {t.pain_points}
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              <li>{t.pain_1}</li>
              <li>{t.pain_2}</li>
            </ul>
          </div>

          {/* Objections */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="var(--warn)" /> {t.objections}
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              <li>{t.obj_1}</li>
              <li>{t.obj_2}</li>
            </ul>
          </div>

        </div>

        {/* Highlights / Transcript */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', height: '100%' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <MessageSquare size={18} color="var(--accent)" /> {t.highlights}
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-muted)', color: 'var(--accent-ink, var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>C</div>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: '0 8px 8px 8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                {t.t_text1}
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--accent-ink, var(--accent))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FastForward size={12}/> 12:45</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row-reverse' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>V</div>
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px 0 8px 8px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {t.t_text2}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-muted)', color: 'var(--accent-ink, var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>C</div>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: '0 8px 8px 8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                {t.t_text3}
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={12}/> 18:20 {t.obj_detected}</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
