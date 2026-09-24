// src/frontend/src/components/client/Phase2Chief.jsx
import React from 'react';
import { Mail, Calendar, Clock, Inbox, CheckCircle, AlertTriangle } from 'lucide-react';
import { TRANSLATIONS } from '../../core/constants/app.constants';

export default function Phase2Chief({ language }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', color: 'var(--accent-ink, var(--accent))', textTransform: 'uppercase' }}>
              {t.phase2_badge}
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {t.phase2_title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', fontSize: '0.95rem' }}>
              {t.phase2_desc}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ padding: '0.8rem 1.2rem', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.status_label}</div>
              <div style={{ fontWeight: '600', color: 'var(--good)', marginTop: '0.2rem' }}>{t.status_active}</div>
            </div>
            <div style={{ padding: '0.8rem 1.2rem', background: 'var(--bg-muted)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.autonomy_label}</div>
              <div style={{ fontWeight: '600', color: 'var(--accent-ink, var(--accent))', marginTop: '0.2rem' }}>{t.autonomy_val}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[
          { icon: <Clock size={24} color="var(--accent)" />, label: t.time_saved, value: '4.2 hrs', trend: t.trend_today },
          { icon: <Mail size={24} color="var(--good)" />, label: t.emails_drafted, value: '47', trend: t.trend_autopilot },
          { icon: <Calendar size={24} color="var(--accent)" />, label: t.meetings_booked, value: '3', trend: t.trend_new },
        ].map((kpi, idx) => (
          <div key={idx} style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: '12px' }}>{kpi.icon}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{kpi.trend}</span>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Inbox Triage */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Inbox size={20} color="var(--accent)" /> {t.inbox_triage}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* VIP Card */}
            <div style={{ padding: '1.2rem', background: 'var(--crit-bg, rgba(239, 68, 68, 0.08))', borderLeft: '4px solid var(--crit)', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--crit)', marginBottom: '0.2rem' }}>{t.inbox_vip}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inbox_vip_desc}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>2</div>
            </div>

            {/* Auto Replied Card */}
            <div style={{ padding: '1.2rem', background: 'var(--good-bg, rgba(34, 197, 94, 0.08))', borderLeft: '4px solid var(--good)', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--good)', marginBottom: '0.2rem' }}>{t.inbox_auto}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inbox_auto_desc}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>47</div>
            </div>

            {/* Low Priority Card */}
            <div style={{ padding: '1.2rem', background: 'var(--bg-muted)', borderLeft: '4px solid var(--border)', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{t.inbox_low}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inbox_low_desc}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>18</div>
            </div>
          </div>
        </div>

        {/* Smart Agenda */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Calendar size={20} color="var(--accent)" /> {t.smart_agenda}
          </h3>

          <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border)' }}>
            
            {/* Event 1 */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', left: '-1.85rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-primary)' }}></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-ink, var(--accent))', fontWeight: '600', marginBottom: '0.2rem' }}>10:00 AM</div>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.event1_title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--good)" /> {t.pre_call_ready}
                </div>
              </div>
            </div>

            {/* Event 2 */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', left: '-1.85rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)', border: '2px solid var(--bg-primary)' }}></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.2rem' }}>01:30 PM</div>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.event2_title}</div>
              </div>
            </div>

            {/* Event 3 */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-1.85rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-primary)' }}></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-ink, var(--accent))', fontWeight: '600', marginBottom: '0.2rem' }}>04:00 PM</div>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.event3_title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--good)" /> {t.pre_call_ready}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
