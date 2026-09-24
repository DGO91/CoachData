import React, { useState, useEffect } from 'react';
import { Activity, ShieldOff, ShieldCheck, Trash2, Cpu, Settings, Terminal } from 'lucide-react';

const TRANSLATIONS = {
  es: {
    disable: 'Desactivar Auto-Healing',
    enable: 'Activar Auto-Healing',
    clear: 'Limpiar Consola',
    title: 'Auditor de Salud del Sistema',
    subtitle: 'Monitoreo continuo del tiempo de actividad y capacidades de auto-recuperación de los nodos IA.',
    sysLog: '[SISTEMA] Consola del Auditor inicializada...',
    controls: 'Panel de Control',
    terminal: 'Terminal Técnica'
  },
  en: {
    disable: 'Disable Auto-Healing',
    enable: 'Enable Auto-Healing',
    clear: 'Clear Logs',
    title: 'System Health Auditor',
    subtitle: 'Continuous uptime monitoring and auto-healing capabilities of AI nodes.',
    sysLog: '[SYSTEM] Auditor Console initialized...',
    controls: 'Control Panel',
    terminal: 'Technical Terminal'
  }
};

export default function AuditorAgent({ language }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [isHealingActive, setIsHealingActive] = useState(true);
  const [logs, setLogs] = useState([]);
  
  const fetchLogs = async () => {
    try {
      const res = await fetch('/svc/auditor/api/logs');
      const data = await res.json();
      setIsHealingActive(data.isAutoHealingActive);
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Cannot fetch auditor logs', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleHealing = async () => {
    try {
      const res = await fetch('/svc/auditor/api/toggle-healing', { method: 'POST' });
      const data = await res.json();
      setIsHealingActive(data.isAutoHealingActive);
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/svc/auditor/api/clear-logs', { method: 'POST' });
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('title')}
        </h1>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: 'var(--muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Controls */}
        <aside className="glass-panel-inner p-6 flex flex-col gap-6 sticky top-6">
          <div className="border-b pb-4 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
            <Settings size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-xl agent-section-title">{t('controls')}</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--hair)' }}>
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                <Cpu size={14} /> System Status
              </span>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <span className={`agent-status-dot ${isHealingActive ? 'good pulse' : 'crit'}`}></span>
                <span style={{ color: isHealingActive ? 'var(--good)' : 'var(--crit)' }}>
                  {isHealingActive ? 'AUTO-HEALING ACTIVE' : 'SYSTEM DEGRADED'}
                </span>
              </div>
            </div>

            <button 
              onClick={handleToggleHealing}
              className={`w-full py-4 flex items-center justify-center gap-2 font-bold rounded-xl transition-all ${
                isHealingActive ? 'agent-btn-danger' : 'agent-btn-primary'
              }`}
              style={{ width: '100%' }}
            >
              {isHealingActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
              {isHealingActive ? t('disable') : t('enable')}
            </button>
            
            <button 
              onClick={handleClearLogs}
              className="agent-btn-secondary w-full text-sm"
            >
              <Trash2 size={16} />
              {t('clear')}
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Terminal Console */}
        <main className="agent-terminal flex flex-col h-[600px]">
          <div className="agent-terminal-header">
            <div className="flex items-center gap-3">
              <Terminal size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <h2>{t('terminal')}</h2>
            </div>
            <div className="agent-terminal-dots">
              <span className="dot-red"></span>
              <span className="dot-yellow"></span>
              <span className="dot-green"></span>
            </div>
          </div>
          
          <div className="agent-terminal-body flex-1">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                <Terminal size={48} style={{ opacity: 0.2 }} />
                <span className="italic">{t('sysLog')}</span>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`mb-3 pb-3 ${
                  log.type === 'error' ? 'agent-log-error' : 
                  log.type === 'success' ? 'agent-log-success' : 
                  log.type === 'warning' ? 'agent-log-warning' : 
                  ''
                }`} style={{ borderBottom: '1px solid var(--hair-soft)' }}>
                  {log.timestamp && <span style={{ opacity: 0.5, marginRight: '0.75rem', color: 'var(--muted)' }}>[{log.timestamp}]</span>}
                  <strong className="agent-log-system mr-3">SYSTEM</strong>
                  <span style={{ opacity: 0.9 }}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
