// src/frontend/src/components/settings/AgentSchedulesSettings.jsx
import React, { useState, useEffect } from 'react';
import { Bot, Clock, Calendar, Mail, CheckCircle2, Play, AlertCircle, RefreshCw, PhoneCall, Sunset, Cpu } from 'lucide-react';
import { authFetch } from '../../core/api/authFetch';

export function AgentSchedulesSettings({ language = 'es', onNavigate }) {
  const isEs = language === 'es';

  // Schedule States
  const [morningActive, setMorningActive] = useState(true);
  const [morningHour, setMorningHour] = useState(8);
  const [morningMinute, setMorningMinute] = useState(0);

  const [precallActive, setPrecallActive] = useState(true);
  const [precallLeadMinutes, setPrecallLeadMinutes] = useState(45);

  const [eveningActive, setEveningActive] = useState(true);
  const [eveningHour, setEveningHour] = useState(20);
  const [eveningMinute, setEveningMinute] = useState(0);

  const [weeklyActive, setWeeklyActive] = useState(true);
  const [weeklyDay, setWeeklyDay] = useState(5); // Friday
  const [weeklyHour, setWeeklyHour] = useState(18);

  const [savingKey, setSavingKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [runningKey, setRunningKey] = useState(null);

  // Load existing schedules
  useEffect(() => {
    // 1. Precall status
    authFetch('/api/agents/precall-schedule-status')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setPrecallActive(!!data.scheduleActive);
          if (data.cronMinute !== undefined && data.cronMinute !== 0) {
            setPrecallLeadMinutes(data.cronMinute);
          }
        }
      })
      .catch(err => console.warn('Failed to load precall schedule', err));

    // 2. Evening summary status
    authFetch('/api/agents/evening-summary-status')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setEveningActive(!!data.scheduleActive);
          if (data.cronHour !== undefined) setEveningHour(data.cronHour);
          if (data.cronMinute !== undefined) setEveningMinute(data.cronMinute);
        }
      })
      .catch(err => console.warn('Failed to load evening summary status', err));
  }, []);

  const savePrecallSchedule = async (active, leadMin) => {
    setSavingKey('precall');
    try {
      await authFetch('/api/agents/set-precall-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, hour: 8, minute: leadMin })
      });
      setPrecallActive(active);
      setPrecallLeadMinutes(leadMin);
      setSuccessMsg(isEs ? 'Configuración de Pre-Call guardada.' : 'Pre-Call schedule saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const saveEveningSchedule = async (active, hr, min) => {
    setSavingKey('evening');
    try {
      await authFetch('/api/agents/set-evening-summary-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, hour: hr, minute: min })
      });
      setEveningActive(active);
      setEveningHour(hr);
      setEveningMinute(min);
      setSuccessMsg(isEs ? 'Configuración de Cierre Diario guardada.' : 'Daily Closure schedule saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  const handleManualTrigger = async (key) => {
    setRunningKey(key);
    try {
      if (key === 'morning') {
        await authFetch('/api/agents/morning-briefing/trigger', { method: 'POST' });
      } else if (key === 'precall') {
        await authFetch('/svc/pre-call-agent/api/trigger-precall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'manual_trigger' })
        });
      } else if (key === 'evening') {
        await authFetch('/api/agents/run-evening-summary', { method: 'POST' });
      }
      setSuccessMsg(isEs ? '¡Informe generado y depositado en el Buzón de Reportes!' : 'Report generated and deposited in Reports Inbox!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningKey(null);
    }
  };

  const agentsConfig = [
    {
      id: 'morning',
      title: isEs ? '🌅 Morning Briefing · Agenda & Prioridades Matutinas' : '🌅 Morning Briefing · Daily Agenda & Priorities',
      desc: isEs 
        ? 'Escanea Google Calendar y Gmail a primera hora y deposita el foco operativo del día en el Dashboard.' 
        : 'Scans Google Calendar and Gmail early morning and deposits daily priorities into the Dashboard.',
      active: morningActive,
      onToggle: () => setMorningActive(!morningActive),
      controls: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isEs ? 'Hora de entrega:' : 'Delivery Time:'}</span>
          <select
            value={morningHour}
            onChange={(e) => setMorningHour(parseInt(e.target.value, 10))}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-root)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value={7}>07:00 AM</option>
            <option value={8}>08:00 AM</option>
            <option value={9}>09:00 AM</option>
            <option value={10}>10:00 AM</option>
          </select>
        </div>
      ),
      depositTarget: isEs ? 'Dashboard Hero & Buzón de Reportes' : 'Dashboard Hero & Reports Inbox',
    },
    {
      id: 'precall',
      title: isEs ? '📞 Preparador de Reuniones · Dossier Pre-Call' : '📞 Meeting Preparation Brief · Pre-Call Dossier',
      desc: isEs
        ? 'Investiga en CRM y Gmail antes de cada reunión agendada y genera un dossier táctico con debilidades y oportunidades.'
        : 'Researches participants in CRM and Gmail before meetings and generates tactical dossier with leaks and angles.',
      active: precallActive,
      onToggle: () => savePrecallSchedule(!precallActive, precallLeadMinutes),
      controls: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isEs ? 'Antelación del informe:' : 'Report Lead Time:'}</span>
          <select
            value={precallLeadMinutes}
            onChange={(e) => savePrecallSchedule(precallActive, parseInt(e.target.value, 10))}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-root)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value={15}>15 {isEs ? 'minutos antes' : 'minutes before'}</option>
            <option value={30}>30 {isEs ? 'minutos antes' : 'minutes before'}</option>
            <option value={45}>45 {isEs ? 'minutos antes' : 'minutes before'}</option>
            <option value={60}>1 {isEs ? 'hora antes' : 'hour before'}</option>
            <option value={120}>2 {isEs ? 'horas antes' : 'hours before'}</option>
          </select>
        </div>
      ),
      depositTarget: isEs ? 'Buzón de Reportes & Sidebar de Dashboard' : 'Reports Inbox & Dashboard Feed',
    },
    {
      id: 'evening',
      title: isEs ? '🌆 Reportero Operativo Diario · Cierre de Jornada' : '🌆 Daily Performance Reporter · Day Close',
      desc: isEs
        ? 'Calcula las métricas de cierre del día (reuniones realizadas, correos clasificados, facturas Stripe) y tiempo liberado.'
        : 'Calculates day closing metrics (meetings completed, emails processed, Stripe revenue) and saved hours.',
      active: eveningActive,
      onToggle: () => saveEveningSchedule(!eveningActive, eveningHour, eveningMinute),
      controls: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isEs ? 'Hora de cierre:' : 'Close Time:'}</span>
          <select
            value={eveningHour}
            onChange={(e) => saveEveningSchedule(eveningActive, parseInt(e.target.value, 10), eveningMinute)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-root)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value={18}>18:00 PM</option>
            <option value={19}>19:00 PM</option>
            <option value={20}>20:00 PM</option>
            <option value={21}>21:00 PM</option>
            <option value={22}>22:00 PM</option>
          </select>
        </div>
      ),
      depositTarget: isEs ? 'Buzón de Reportes (Filtro Cierre Diario)' : 'Reports Inbox (Daily Close Filter)',
    },
    {
      id: 'weekly',
      title: isEs ? '📊 Resumen Semanal de Métricas · Weekly Digest' : '📊 Weekly Digest · Executive Metrics',
      desc: isEs
        ? 'Consolida los 7 días de rendimiento de toda la organización, ahorro de tiempo total y estado de salud operativa.'
        : 'Consolidates 7-day organization performance, total hours saved, and operational health score.',
      active: weeklyActive,
      onToggle: () => setWeeklyActive(!weeklyActive),
      controls: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isEs ? 'Frecuencia:' : 'Schedule:'}</span>
          <select
            value={weeklyDay}
            onChange={(e) => setWeeklyDay(parseInt(e.target.value, 10))}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-root)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <option value={5}>{isEs ? 'Viernes al final del día (18:00 PM)' : 'Friday EOD (18:00 PM)'}</option>
            <option value={0}>{isEs ? 'Domingo por la noche (20:00 PM)' : 'Sunday Evening (20:00 PM)'}</option>
            <option value={1}>{isEs ? 'Lunes por la mañana (08:00 AM)' : 'Monday Morning (08:00 AM)'}</option>
          </select>
        </div>
      ),
      depositTarget: isEs ? 'Buzón de Reportes & Analytics Semanal' : 'Reports Inbox & Weekly Analytics',
    }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ textAlign: 'left' }}>
      <div>
        <h3 className="text-lg font-bold text-textMain" style={{ margin: '0 0 4px 0' }}>
          {isEs ? 'Programación & Automatización de Reportes IA' : 'AI Report Agents & Schedules'}
        </h3>
        <p className="text-sm text-textMuted" style={{ margin: 0 }}>
          {isEs
            ? 'Configura los horarios en los que tus agentes de IA ejecutan sus tareas en segundo plano y depositan sus informes unificados en el Dashboard y Buzón de Reportes.'
            : 'Configure schedules when your AI agents run background tasks and deposit unified deliverables into the Dashboard and Reports Inbox.'}
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.12)', border: '1px solid #4ade80', borderRadius: '10px', color: '#4ade80', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {agentsConfig.map((agent) => (
          <div
            key={agent.id}
            style={{
              background: 'var(--bg-root)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '650px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {agent.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {agent.desc}
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: agent.active ? 'var(--accent-ink, var(--accent))' : 'var(--text-muted)' }}>
                  {agent.active ? (isEs ? 'ACTIVO' : 'ACTIVE') : (isEs ? 'PAUSADO' : 'PAUSED')}
                </span>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agent.active}
                    onChange={agent.onToggle}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: agent.active ? 'var(--accent)' : 'var(--border-strong)',
                      transition: '0.2s',
                      borderRadius: '22px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '',
                        height: '16px',
                        width: '16px',
                        left: agent.active ? '20px' : '3px',
                        bottom: '3px',
                        background: '#ffffff',
                        transition: '0.2s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>{agent.controls}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {isEs ? 'Depósito:' : 'Target:'} <strong style={{ color: 'var(--text-secondary)' }}>{agent.depositTarget}</strong>
                </span>

                <button
                  onClick={() => handleManualTrigger(agent.id)}
                  disabled={runningKey === agent.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {runningKey === agent.id ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>{runningKey === agent.id ? (isEs ? 'Generando...' : 'Generating...') : (isEs ? 'Ejecutar Ahora' : 'Run Now')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
