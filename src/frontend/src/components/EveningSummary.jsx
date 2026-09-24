import React, { useState, useEffect, useRef } from 'react';
import { Moon, Play, Square, Loader2, FileText, CheckCircle2 } from 'lucide-react';

const TRANSLATIONS = {
  es: {
    title: "Reportero Operativo Diario",
    subtitle: "Resumen de desempeño financiero y operativo al cierre del día.",
    btnRun: "Ejecutar Resumen",
    btnStop: "Detener",
    btnRunning: "Generando…",
    statusReady: "Listo",
    statusRunning: "Generando reporte…",
    statusDone: "Completado",
    statusError: "Error",
    catConfig: "⚙️ Configuración",
    catLogs: "💻 Consola de Actividad",
    logsWaiting: "Esperando ejecución…",
    alertSuccess: "¡Resumen generado y enviado con éxito!",
    alertError: "Hubo un problema: ",
    alertConnError: "No se pudo conectar con el servidor.",
    logStart: "Iniciando recopilación de datos…",
    logConnect: "Conectando con Notion y base de datos…",
    logComplete: "Ejecución completada.",
    logSent: "✅ Reporte enviado a WhatsApp.",
    logNetworkError: "Error de red al intentar ejecutar el agente.",
    logManualStop: "Ejecución detenida manualmente.",
    agentDescription: "Este agente extrae los datos de Stripe, Notion y GoHighLevel de forma automatizada. Las credenciales deben estar configuradas en \"Security Vault\".",
    agentState: "Estado del Agente",
    agentPrompt: "Inicia la ejecución manual del agente para recopilar métricas del día."
  },
  en: {
    title: "Daily Performance Reporter",
    subtitle: "Financial and operational performance summary at the end of the day.",
    btnRun: "Run Summary",
    btnStop: "Stop",
    btnRunning: "Generating…",
    statusReady: "Ready",
    statusRunning: "Generating report…",
    statusDone: "Completed",
    statusError: "Error",
    catConfig: "⚙️ Configuration",
    catLogs: "💻 Activity Console",
    logsWaiting: "Waiting for execution…",
    alertSuccess: "Summary generated and sent successfully!",
    alertError: "There was a problem: ",
    alertConnError: "Could not connect to the server.",
    logStart: "Starting data collection…",
    logConnect: "Connecting to Notion and database…",
    logComplete: "Execution completed.",
    logSent: "✅ Report sent to WhatsApp.",
    logNetworkError: "Network error when trying to run the agent.",
    logManualStop: "Execution manually stopped.",
    agentDescription: "This agent automatically extracts data from Stripe, Notion, and GoHighLevel. Credentials must be configured in \"Security Vault\".",
    agentState: "Agent Status",
    agentPrompt: "Start the manual execution of the agent to collect metrics for the day."
  }
};

import ActionModal from './common/ActionModal';
import { authFetch } from '../core/api/authFetch';

export default function EveningSummary({ language }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(t('statusReady'));
  const [logs, setLogs] = useState([t('logsWaiting')]);
  const logsEndRef = useRef(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', message: '', isError: false });

  const handleRun = async () => {
    setRunning(true);
    setStatus(t('statusRunning'));
    setLogs([t('logStart'), t('logConnect')]);

    try {
      const res = await authFetch('/api/agents/run-evening-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        setStatus(t('statusDone'));
        setLogs(prev => [...prev, data.output || t('logComplete'), t('logSent')]);
        setModalMessage({
            title: lang === 'en' ? 'Report Sent!' : '¡Reporte Enviado!',
            message: lang === 'en' ? 'Your evening report has been generated and sent successfully to your WhatsApp.' : 'Tu reporte vespertino se ha generado y enviado exitosamente a tu WhatsApp.',
            isError: false
        });
        setShowModal(true);
      } else {
        setStatus(t('statusError'));
        setLogs(prev => [...prev, `Error: ${data.message || data.error}`]);
        setModalMessage({
            title: lang === 'en' ? 'Error' : 'Error',
            message: data.message || data.error,
            isError: true
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error(err);
      setStatus(t('statusError'));
      setLogs(prev => [...prev, t('logNetworkError')]);
      setModalMessage({
          title: lang === 'en' ? 'Connection Error' : 'Error de Conexión',
          message: 'Error al conectar con el servidor.',
          isError: true
      });
      setShowModal(true);
    } finally {
      setRunning(false);
      setTimeout(() => {
        setStatus(prev => prev === t('statusDone') ? t('statusReady') : prev);
      }, 5000);
    }
  };

  const handleStop = async () => {
    try {
      await authFetch('/api/agents/stop-evening-summary', { method: 'POST' });
      setRunning(false);
      setStatus(t('statusReady'));
      setLogs(prev => [...prev, t('logManualStop')]);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getStatusBadgeClass = () => {
    if (status === t('statusError')) return 'agent-status-badge crit';
    if (status === t('statusRunning')) return 'agent-status-badge accent';
    if (status === t('statusDone')) return 'agent-status-badge good';
    return 'agent-status-badge neutral';
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* Success/Error Modal */}
      {showModal && (
        <ActionModal 
          title={modalMessage.title}
          message={modalMessage.message}
          isError={modalMessage.isError}
          onClose={() => setShowModal(false)}
          buttonText={lang === 'en' ? 'Got it' : 'Entendido'}
        />
      )}

      {/* Header Info */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Moon className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('title')}
        </h1>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: 'var(--muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Data & Logs */}
        <div className="glass-panel-inner flex flex-col gap-6 p-6">
          <div className="border-b pb-4 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
            <FileText size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-xl agent-section-title">{t('catLogs')}</h2>
          </div>
          
          <div className="agent-console flex flex-col gap-2 h-[350px]">
            {logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap leading-relaxed">{log}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
          
          <div className="agent-info-box mt-2">
            <CheckCircle2 size={18} style={{ color: 'var(--accent-ink, var(--accent))', marginTop: '0.125rem', flexShrink: 0 }} />
            <p>{t('agentDescription')}</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Actions */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel-inner flex flex-col gap-5 p-6" >
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg agent-section-title">{t('agentState')}</span>
              <div className={getStatusBadgeClass()}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {status}
              </div>
            </div>

            <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>{t('agentPrompt')}</p>

            <div className="flex flex-col gap-3 mt-2">
              {running ? (
                  <button 
                      onClick={handleStop}
                      className="agent-btn-danger w-full py-3.5"
                  >
                      <Square size={18} />
                      {t('btnStop')}
                  </button>
              ) : (
                  <button 
                      onClick={handleRun}
                      disabled={running}
                      className="agent-btn-primary w-full py-3.5"
                  >
                      <Play size={18} />
                      {t('btnRun')}
                  </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
