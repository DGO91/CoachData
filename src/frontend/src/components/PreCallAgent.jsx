import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Phone } from 'lucide-react';
import { useNotifications } from './common/Notifications';
import { authFetch } from '../core/api/authFetch';

const TRANSLATIONS = {
  es: {
    desc: "Dossier automático de tus próximas reuniones conectando CRM y Gmail.",
    scheduleTitle: "Programación Automática (Auto Schedule)",
    scheduleDesc: "El agente revisa tu calendario automáticamente cada 15 minutos para programar y enviar reportes de WhatsApp antes de cada reunión.",
    timeLabel: "Antelación del reporte:",
    connectionsTitle: "🔌 Conexión de Google",
    googleLabel: "Cuenta de Google (Gmail, Sheets y Calendar):",
    connectButton: "Conectar Cuenta de Google",
    connectedBadge: "Conectado",
    disconnectedBadge: "Desconectado",
    dbTitle: "🗄️ CRM Bases de Datos",
    notionSection: "Integración con Notion:",
    sheetsSection: "Google Sheets IDs:",
    saveButton: "Guardar Configuración",
    savingButton: "Guardando…",
    saveSuccess: "Configuración guardada exitosamente.",
    saveError: "Error al guardar la configuración.",
    titleSettings: "Preparador de Reuniones",
    
    // Help Section
    helpTitle: "📘 Guía de Configuración Rápida",
    helpNotionTitle: "Configuración de Notion:",
    helpNotionStep1: "1. Ve a Notion Integrations (https://www.notion.so/my-integrations) y crea una integración interna para obtener tu Notion Token.",
    helpNotionStep2: "2. Abre tu base de datos en Notion, haz clic en los 3 puntos (...) y agrega la integración en la sección de conexiones.",
    helpNotionStep3: "3. El ID de la base de datos es la cadena de 32 caracteres que aparece en la URL después de tu espacio de trabajo (antes del signo de interrogación '?').",
    helpSheetsTitle: "Configuración de Google Sheets:",
    helpSheetsStep1: "1. Abre la hoja de cálculo de LinkedIn o Instagram en tu navegador.",
    helpSheetsStep2: "2. Copia el ID del documento, que es el código largo en la URL entre '/d/' y '/edit'.",
    
    // Mockup & Pipeline
    waLivePreview: "T-45 MINUTES LIVE PREVIEW",
    waLivePreviewTitle: "Previsualización",
    waPipelineTitle: "Proceso del Sistema",
    waPipelineSync: "Sincronización de Calendario",
    waPipelineSyncDesc: "Monitoreando eventos próximos",
    waPipelineCrm: "Bases de Datos CRM",
    waPipelineCrmDesc: "Notion y Sheets conectados",
    waPipelineEngine: "Motor de Inteligencia",
    waPipelineEngineStandby: "En espera de la próxima reunión",
    waPipelineEngineOffline: "Desconectado. Activar Auto Schedule",
    waOnline: "En línea",
    waToday: "HOY",
    waMeetingIn: "Reunión en 45 min con:",
    waCompany: "Empresa:",
    waRole: "Cargo:",
    waInterest: "Interés:",
    waAngle: "Ángulo Sugerido:",
    waAngleDesc: "Mencionó en su último post de LinkedIn que están teniendo problemas reteniendo usuarios. Enfócate en presentar la infraestructura de retención de CoachData OS.",
    waFooter: "Este reporte se genera automáticamente usando inteligencia recopilada de tu CRM y LinkedIn, entregando contexto justo cuando lo necesitas.",
    scanNow: "Escanear Agenda Ahora",
    noMeeting: "{t('noMeeting')}",
    scanAction: 'Haz clic en "Escanear Agenda Ahora" para ver tus reuniones reales.',
    unknown: "Desconocido",
    notSpec: "No especificada",
    notSpecRole: "No especificado",
    pending: "Pendiente",
    noSubject: "Sin asunto"
  },
  en: {
    desc: "Automatic dossiers for upcoming meetings by connecting CRM and Gmail.",
    scheduleTitle: "Auto Schedule",
    scheduleDesc: "The agent automatically checks your calendar every 15 minutes to schedule and send WhatsApp reports before each meeting.",
    timeLabel: "Report Lead Time:",
    connectionsTitle: "🔌 Google Connection",
    googleLabel: "Google Account (Gmail, Sheets & Calendar):",
    connectButton: "Connect Google Account",
    connectedBadge: "Connected",
    disconnectedBadge: "Disconnected",
    dbTitle: "🗄️ CRM Databases",
    notionSection: "Notion Integration:",
    sheetsSection: "Google Sheets IDs:",
    saveButton: "Save Configuration",
    savingButton: "Saving…",
    saveSuccess: "Configuration saved successfully.",
    saveError: "Error saving configuration.",
    titleSettings: "Meeting Preparation Brief",
    
    // Help Section
    helpTitle: "📘 Quick Configuration Guide",
    helpNotionTitle: "Notion Setup:",
    helpNotionStep1: "1. Create a Notion integration to get your token from",
    helpNotionStep2: "2. Make sure to share your database with the integration inside Notion.",
    helpNotionStep3: "3. The Database ID is the 32-character code in the URL after your workspace name (before the '?' mark).",
    helpSheetsTitle: "Google Sheets Setup:",
    helpSheetsStep1: "1. Open your LinkedIn or Instagram spreadsheet in your browser.",
    helpSheetsStep2: "2. Copy the long code in the URL between '/d/' and '/edit'. This is the document ID.",
    
    // Mockup & Pipeline
    waLivePreview: "T-45 MINUTES LIVE PREVIEW",
    waLivePreviewTitle: "Live Preview",
    waPipelineTitle: "System Pipeline",
    waPipelineSync: "Calendar Sync",
    waPipelineSyncDesc: "Monitoring upcoming events",
    waPipelineCrm: "CRM Database",
    waPipelineCrmDesc: "Notion & Sheets connected",
    waPipelineEngine: "Intelligence Engine",
    waPipelineEngineStandby: "Standing by for next meeting",
    waPipelineEngineOffline: "Offline. Enable Auto Schedule",
    waOnline: "Online",
    waToday: "TODAY",
    waMeetingIn: "Meeting in 45 min with:",
    waCompany: "Company:",
    waRole: "Role:",
    waInterest: "Interest:",
    waAngle: "Suggested Angle:",
    waAngleDesc: "Mentioned in their last LinkedIn post they are struggling with user retention. Focus on presenting CoachData OS retention infrastructure.",
    waFooter: "This report is automatically generated using intelligence gathered from your CRM and LinkedIn, delivering context right when you need it.",
    scanNow: "Scan Now",
    noMeeting: "There are no meetings scheduled for today.",
    scanAction: 'Click "Scan Now" to see your real meetings.',
    unknown: "Unknown",
    notSpec: "Not specified",
    notSpecRole: "Not specified",
    pending: "Pending",
    noSubject: "No subject"
  }
};

export default function PreCallAgent({ language }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  // Auto-Schedule States
  const [scheduleActive, setScheduleActive] = useState(false);
  const [cronHour, setCronHour] = useState(8);
  const [cronMinute, setCronMinute] = useState(0);

  // Connection States
  const [gmailConnected, setGmailConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Database / Token States
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [sheetsLinkedinId, setSheetsLinkedinId] = useState('');
  const [sheetsInstagramId, setSheetsInstagramId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    // 1. Fetch schedule status and Google connections
    authFetch('/api/agents/precall-schedule-status')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setScheduleActive(!!data.scheduleActive);
          setCronHour(data.cronHour !== undefined ? data.cronHour : 8);
          setCronMinute(data.cronMinute !== undefined ? data.cronMinute : 0);
          setGmailConnected(!!data.gmailConnected);
          setCalendarConnected(!!data.calendarConnected);
        }
      })
      .catch(err => console.warn('Failed to load precall schedule status', err));

    // 2. Fetch Notion & Sheets settings
    fetch('/svc/pre-call-agent/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setNotionToken(data.notionToken || '');
          setNotionDatabaseId(data.notionDatabaseId || '');
          setSheetsLinkedinId(data.sheetsLinkedinId || '');
          setSheetsInstagramId(data.sheetsInstagramId || '');
        }
      })
      .catch(err => console.warn('Failed to load settings', err));
  }, []);

  const handleSetSchedule = async (active, hour, minute) => {
    try {
      await authFetch('/api/agents/set-precall-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, hour, minute })
      });
      setScheduleActive(active);
      if (hour !== undefined) setCronHour(hour);
      if (minute !== undefined) setCronMinute(minute);
    } catch (err) {
      console.warn('Failed to update precall schedule', err);
    }
  };



  const handleTestWhatsApp = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/svc/pre-call-agent/api/test-whatsapp', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({ type: 'success', msg: data.message });
      } else {
        setScanResult({ type: 'error', msg: `Error: ${data.error || 'No se pudo enviar el WhatsApp'}` });
      }
    } catch (err) {
      setScanResult({ type: 'error', msg: 'Error de conexión con el servidor.' });
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanResult(null), 8000);
    }
  };

  const handleRunNow = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/svc/pre-call-agent/api/trigger-precall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'manual_trigger' })
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({ 
          type: 'success', 
          msg: `¡Escaneo completado! ${data.matchedEventsCount || 0} reuniones procesadas/programadas para hoy.`,
          matchedEvents: data.matchedEvents || []
        });
      } else {
        setScanResult({ type: 'error', msg: `Error: ${data.error || 'Problema al escanear'}` });
      }
    } catch (err) {
      setScanResult({ type: 'error', msg: 'Error de conexión con el servidor.' });
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanResult(null), 8000);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/svc/pre-call-agent/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken,
          notionDatabaseId,
          sheetsLinkedinId,
          sheetsInstagramId
        })
      });
      const data = await res.json();
      if (data.success) {
        notify(t('saveSuccess'));
      } else {
        notify(t('saveError') + ": " + data.error);
      }
    } catch (err) {
      console.error(err);
      notify(t('saveError'));
    } finally {
      setSavingSettings(false);
    }
  };

  const isConnected = gmailConnected && calendarConnected;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* Header Info */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2 agent-section-title">
          <Phone className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('titleSettings')}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{t('desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Live Data & Pipeline */}
        <div className="glass-panel-inner flex flex-col gap-6 p-6">
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <h2 className="font-bold text-textMain text-xl agent-section-title">{t('Live Pre-Call Brief', 'Briefing Pre-Llamada en Vivo')}</h2>
          </div>
          
          <div className="bg-[var(--bg-muted)] border border-[rgba(45,74,58,0.2)] rounded-xl p-5 overflow-y-auto text-sm text-textMain shadow-inner flex flex-col gap-4 min-h-[300px]">
            {!scanResult || scanResult.type !== 'success' ? (
                <div className="flex items-center justify-center h-full min-h-[250px] text-textMuted border border-dashed border-borderColor rounded-lg">
                  {t('scanAction')}
                </div>
            ) : scanResult.matchedEvents && scanResult.matchedEvents.length > 0 ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  {scanResult.matchedEvents.map((ev, idx) => (
                    <div key={idx} className="bg-bgMain p-5 rounded-lg border border-borderColor">
                      <p className="text-xs font-bold mb-3 tracking-widest uppercase flex items-center gap-1.5" style={{ color: 'var(--accent-ink, var(--accent))' }}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span> PRE-CALL BRIEF
                      </p>
                      <h4 className="font-bold text-textMain text-sm mb-1">{t('waMeetingIn', 'Reunión detectada con:')}</h4>
                      <p className="text-2xl font-bold text-textMain mb-4 agent-section-title">{ev.prospect?.name || t('unknown')}</p>
                      
                      <div className="bg-black/20 dark:bg-white/5 rounded-xl p-4 mb-4 border border-borderColor/50">
                        <p className="text-sm text-textMuted mb-2">📍 <strong className="text-textMain">{t('waCompany', 'Company:')}</strong> {ev.prospect?.company || t('notSpec')}</p>
                        <p className="text-sm text-textMuted mb-2">💼 <strong className="text-textMain">{t('waRole', 'Role:')}</strong> {ev.prospect?.role || t('notSpecRole')}</p>
                        <p className="text-sm text-textMuted">💰 <strong className="text-textMain">{t('waInterest', 'Status:')}</strong> {ev.prospect?.status || t('pending')}</p>
                      </div>

                      <p className="text-sm text-textMain leading-relaxed">
                        <strong>💡 {t('waAngle', 'Detalles:')}</strong><br/>
                        <span className="text-textMuted mt-1 block">
                          {ev.event?.summary || t('noSubject')} 
                          {ev.event?.description ? ` - ${ev.event.description.substring(0, 100)}...` : ''}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full min-h-[250px] text-textMuted border border-dashed border-borderColor rounded-lg">
                  {t('noMeeting')} 
                </div>
            )}
          </div>

          {/* AGENT PIPELINE STATUS */}
          <div className="mt-4 pt-6 border-t border-borderColor flex flex-col gap-5">
            <h3 className="font-bold text-textMain text-sm uppercase tracking-wider">{t('waPipelineTitle')}</h3>
            <div className="flex flex-col gap-4 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-borderColor"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 text-green-500 shadow-sm">✓</div>
                <div>
                  <p className="text-sm font-bold text-textMain">{t('waPipelineSync')}</p>
                  <p className="text-xs text-textMuted">{t('waPipelineSyncDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 text-green-500 shadow-sm">✓</div>
                <div>
                  <p className="text-sm font-bold text-textMain">{t('waPipelineCrm')}</p>
                  <p className="text-xs text-textMuted">{t('waPipelineCrmDesc')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${scheduleActive ? 'bg-accentSage/20 border-accentSage/30 text-accentSage animate-pulse' : 'bg-bgMain border-borderColor text-textMuted'}`}>
                  <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                </div>
                <div>
                  <p className="text-sm font-bold text-textMain">{t('waPipelineEngine')}</p>
                  <p className="text-xs text-textMuted">{scheduleActive ? t('waPipelineEngineStandby') : t('waPipelineEngineOffline')}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Actions */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel-inner flex flex-col gap-5 p-6" >
            <div className="flex justify-between items-center">
              <span className="font-bold text-textMain text-lg agent-section-title">{t('scheduleTitle')}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="mr-2 text-xs font-bold" style={{ color: scheduleActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {scheduleActive ? 'ON' : 'OFF'}
                </span>
                <input 
                  type="checkbox" 
                  checked={scheduleActive}
                  onChange={(e) => handleSetSchedule(e.target.checked, cronHour, cronMinute)}
                  className="sr-only peer"
                />
                <div style={{
                  width: '44px', height: '24px', borderRadius: '12px', 
                  background: scheduleActive ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  boxShadow: scheduleActive ? '0 0 10px rgba(197, 168, 128, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '2px', left: scheduleActive ? '22px' : '2px', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </label>
            </div>

            <p className="text-sm text-textMuted m-0 leading-relaxed">{t('scheduleDesc')}</p>

            <div className="flex items-center justify-between mt-1 text-sm bg-bgMain/40 p-4 rounded-xl border border-borderColor/40">
              <span className="text-textMuted font-medium">{t('timeLabel')}</span>
              <select 
                value={cronMinute === 0 ? 45 : cronMinute} 
                onChange={(e) => handleSetSchedule(scheduleActive, cronHour, parseInt(e.target.value, 10))}
                disabled={!scheduleActive}
                className="rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-40 font-bold"
                style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF' }}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hr</option>
                <option value={120}>2 hrs</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 mt-2">
                <button 
                    onClick={handleRunNow}
                    disabled={isScanning}
                    className="py-3.5 px-6 text-sm w-full rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text, #fff)', border: 'none', boxShadow: '0 4px 14px rgba(197, 168, 128, 0.35)' }} 
                    onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                    {isScanning ? <Loader2 size={18} className="animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>}
                    {t('scanNow')}
                </button>
            </div>
            
            {scanResult && (
              <div className={`text-xs font-bold px-4 py-3 rounded-lg text-center animate-fade-in border ${scanResult.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}`}>
                {scanResult.msg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
