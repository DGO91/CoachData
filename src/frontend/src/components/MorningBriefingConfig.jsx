import React, { useState, useEffect } from 'react';
import { Clock, CheckSquare, Settings2, Play, AlertCircle, Save, Loader2, CheckCircle2 } from 'lucide-react';
import ActionModal from './common/ActionModal';
import { authFetch } from '../core/api/authFetch';

export default function MorningBriefingConfig({ language, userProfile }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    active: false,
    hour: '08',
    minute: '00',
    includeCalendar: true,
    includeTasks: true,
    includeEmails: true
  });

  const [testStatus, setTestStatus] = useState(null); // 'loading', 'success', 'error'
  const [popupState, setPopupState] = useState(null);

  useEffect(() => {
    // In a real app, fetch from /api/personal-agent/config
    const fetchConfig = async () => {
      try {
        const res = await authFetch('/api/agents/personal-agent-status');
        const data = await res.json();
        if (data.schedule) {
          setConfig({
            active: data.schedule.active || false,
            hour: data.schedule.hour ? data.schedule.hour.toString().padStart(2, '0') : '08',
            minute: data.schedule.minute ? data.schedule.minute.toString().padStart(2, '0') : '00',
            includeCalendar: data.schedule.includeCalendar ?? true,
            includeTasks: data.schedule.includeTasks ?? true,
            includeEmails: data.schedule.includeEmails ?? true
          });
        }
      } catch (err) {
        console.error('Error fetching config', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authFetch('/api/agents/set-personal-agent-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setTimeout(() => setSaving(false), 800);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const [liveData, setLiveData] = useState(null);

  const handleTestNow = async () => {
    setTestStatus('loading');
    setLiveData(null);
    try {
      const tenantId = userProfile?.id || 'default_tenant';
      
      // 1. Fetch live data for the UI
      const liveRes = await authFetch(`/api/agents/morning-briefing/live/${tenantId}`);
      const liveData = await liveRes.json();
      
      if (liveData.connected) {
        setLiveData(liveData);
        
        // 2. Trigger the WhatsApp test message
        const waRes = await authFetch(`/api/agents/morning-briefing/test-whatsapp/${tenantId}`, {
          method: 'POST'
        });
        const waData = await waRes.json();
        
        if (waData.success) {
          setTestStatus('success');
          setPopupState({ type: 'success', text: t('WhatsApp message sent successfully! Please check your phone.', '¡Mensaje de WhatsApp enviado con éxito! Revisa tu celular.') });
        } else {
          setTestStatus('error');
          setPopupState({ type: 'error', text: t('Error sending WhatsApp message: ' + (waData.error || 'Unknown'), 'Error al enviar WhatsApp: ' + (waData.error || 'Desconocido')) });
        }
      } else {
        setTestStatus('error');
        setPopupState({ type: 'error', text: t('Google account not connected.', 'Cuenta de Google no conectada.') });
      }
      setTimeout(() => setTestStatus(null), 4000);
    } catch (err) {
      console.error(err);
      setTestStatus('error');
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const t = (en, es) => language === 'es' ? es : en;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* Header Info */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2 agent-section-title">
          {t('WhatsApp Briefing Hub', 'Conexión de Briefing WhatsApp')}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">
          {t('Automated morning routines & daily summaries via WhatsApp.', 'Rutinas matutinas automatizadas y resúmenes diarios por WhatsApp.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="glass-panel-inner flex flex-col gap-6 p-6" style={{ position: 'relative', zIndex: 10 }}>
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Settings2 size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-textMain text-xl agent-section-title">{t('Data Sources', 'Fuentes de Datos')}</h2>
          </div>

          <div className="flex flex-col gap-5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 rounded border-borderColor text-accent focus:ring-accent" checked={config.includeCalendar} onChange={(e) => setConfig({...config, includeCalendar: e.target.checked})} />
              <span className="text-sm font-medium text-textMain group-hover:text-accent transition-colors">{t("Google Calendar (Today's Events)", "Google Calendar (Eventos de Hoy)")}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 rounded border-borderColor text-accent focus:ring-accent" checked={config.includeTasks} onChange={(e) => setConfig({...config, includeTasks: e.target.checked})} />
              <span className="text-sm font-medium text-textMain group-hover:text-accent transition-colors">{t('Google Tasks (Pending)', 'Google Tasks (Tareas Pendientes)')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 rounded border-borderColor text-accent focus:ring-accent" checked={config.includeEmails} onChange={(e) => setConfig({...config, includeEmails: e.target.checked})} />
              <span className="text-sm font-medium text-textMain group-hover:text-accent transition-colors">{t('Gmail (Urgent/Important Emails)', 'Gmail (Correos Urgentes/Importantes)')}</span>
            </label>
          </div>
          
          {/* Live Briefing Data inside Left Col */}
          <div className="mt-4 pt-6 border-t border-borderColor">
             <h3 className="font-bold text-textMain text-lg mb-4 flex items-center gap-2">
                {t('Live Briefing Result', 'Resultado del Briefing en Vivo')}
             </h3>
             {liveData ? (
               <div className="flex flex-col gap-4">
                 <div className="bg-bgMain/40 p-4 rounded-xl border border-borderColor/40">
                   <h4 className="text-sm font-bold text-textMain mb-2">📅 Google Calendar ({liveData.events.length})</h4>
                   {liveData.events.length > 0 ? (
                     liveData.events.map(ev => (
                       <div key={ev.id} className="text-sm text-textMuted mb-2 border-b border-borderColor/50 pb-2">
                         <div className="font-semibold text-textMain">{ev.summary}</div>
                         <div className="text-xs">{new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       </div>
                     ))
                   ) : (
                     <div className="text-sm text-textMuted">{t('No events scheduled for today.', 'No hay eventos programados para hoy.')}</div>
                   )}
                 </div>
                 <div className="bg-bgMain/40 p-4 rounded-xl border border-borderColor/40">
                   <h4 className="text-sm font-bold text-textMain mb-2">📬 Gmail Unread ({liveData.unreadEmails.length})</h4>
                   {liveData.unreadEmails.length > 0 ? (
                     liveData.unreadEmails.map(msg => (
                       <div key={msg.id} className="text-sm text-textMuted mb-2 border-b border-borderColor/50 pb-2">
                         <div className="font-semibold text-textMain">{msg.subject}</div>
                         <div className="text-xs">From: {msg.from}</div>
                       </div>
                     ))
                   ) : (
                     <div className="text-sm text-textMuted">{t('No unread priority emails.', 'Sin correos prioritarios no leídos.')}</div>
                   )}
                 </div>
               </div>
             ) : (
               <div className="flex items-center justify-center h-32 text-textMuted text-sm text-center border border-dashed border-borderColor rounded-xl bg-bgMain/20">
                 {t('Click "Test Now" to fetch live data.', 'Haz clic en "Probar Ahora" para obtener datos en vivo.')}
               </div>
             )}
          </div>
        </div>

        {/* RIGHT COLUMN: Automation & Actions */}
        <div className="flex flex-col gap-6">
          
          {/* Scheduler Card */}
          <div className="glass-panel-inner flex flex-col gap-5 p-6" >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                <span className="font-bold text-textMain text-lg agent-section-title">{t('Agent Status', 'Estado del Agente')}</span>
              </div>
              
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ marginRight: '0.75rem', fontSize: '0.8rem', color: config.active ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                  {config.active ? 'ON' : 'OFF'}
                </span>
                <div style={{
                  width: '44px', height: '24px', borderRadius: '12px', 
                  background: config.active ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  boxShadow: config.active ? '0 0 10px rgba(197, 168, 128, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '2px', left: config.active ? '22px' : '2px', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={config.active} 
                    onChange={(e) => setConfig({...config, active: e.target.checked})} 
                  />
                </div>
              </label>
            </div>
            
            <p className="text-sm text-textMuted leading-relaxed m-0">{t('Turn the scheduled briefings on or off.', 'Enciende o apaga los resúmenes programados.')}</p>
            
            <div className="flex items-center justify-between mt-1 text-sm bg-bgMain/40 p-4 rounded-xl border border-borderColor/40">
              <span className="text-textMuted font-medium">{t('Delivery Schedule', 'Horario de Entrega')}</span>
              <div className="flex items-center gap-2">
                <select
                  value={config.hour}
                  onChange={(e) => setConfig({...config, hour: e.target.value})}
                  disabled={!config.active}
                  className="rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-40 font-bold"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF' }}
                >
                  {Array.from({length: 24}).map((_, i) => {
                    const val = i.toString().padStart(2, '0');
                    return <option key={val} value={val}>{val}h</option>;
                  })}
                </select>
                <span className="text-textMuted font-bold">:</span>
                <select
                  value={config.minute}
                  onChange={(e) => setConfig({...config, minute: e.target.value})}
                  disabled={!config.active}
                  className="rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-40 font-bold"
                  style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF' }}
                >
                  {['00', '15', '30', '45'].map(val => (
                    <option key={val} value={val}>{val}m</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="glass-panel-inner flex flex-col gap-4 p-6">
            <button 
              className="py-3 px-6 text-sm rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2" 
              style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid #9CA3AF' }} 
              onClick={handleTestNow}
              disabled={testStatus === 'loading'}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {testStatus === 'loading' ? <Loader2 size={18} className="animate-spin text-accentSage" /> : <Play size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />}
              {t('Test Now (Send WhatsApp)', 'Probar Ahora (Enviar WhatsApp)')}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="py-3.5 px-6 text-sm w-full rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text, #fff)', border: 'none', boxShadow: '0 4px 14px rgba(197, 168, 128, 0.35)' }} 
              onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {t('Save Configuration', 'Guardar Configuración')}
            </button>
          </div>
        </div>

      </div>

      {/* CUSTOM MODAL POPUP */}
      {popupState && (
        <ActionModal
          title={popupState.type === 'success' ? t('Success', 'Éxito') : t('Error', 'Error')}
          message={popupState.text}
          isError={popupState.type !== 'success'}
          onClose={() => setPopupState(null)}
          buttonText={t('Got it', 'Entendido')}
        />
      )}
    </div>
  );
}
