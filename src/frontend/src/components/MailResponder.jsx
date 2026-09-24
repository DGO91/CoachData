import React, { useState, useEffect } from 'react';
import { Send, Play, Mail, Bot, Settings, Activity } from 'lucide-react';
import { useAuth } from '../infrastructure/auth/AuthProvider';
import { authFetch } from '../core/api/authFetch';

const TRANSLATIONS = {
  es: {
    title: "Asistente de Respuestas de Email",
    subtitle: "Redacta respuestas automatizadas inteligentes y precisas a tus clientes por Gmail.",
    btnRun: "Ejecutar Agente",
    btnRunning: "Ejecutando…",
    statusReady: "Listo para iniciar",
    statusRunning: "Analizando correos…",
    statusDone: "Análisis Completado",
    statusError: "Error de Ejecución",
    catConfig: "Configuración de Respuesta",
    catStats: "Estadísticas de Hoy",
    statsRead: "Correos Analizados",
    statsDrafts: "Borradores Creados",
    successBanner: "Ciclo completado. Los borradores están listos en tu bandeja de Gmail para revisión.",
    noPendingBanner: "Sin correos prioritarios pendientes por ahora. El agente continuará vigilando.",
    errorBanner: "Error de red al intentar ejecutar el agente.",
    noGoogle: "Cuenta de Google no conectada. Conecta tu cuenta desde la sección de Credenciales.",
    liveConsole: "Consola de Ejecución"
  },
  en: {
    title: "AI Mail Assistant",
    subtitle: "Draft intelligent and precise email replies to your clients via Gmail.",
    btnRun: "Run Agent",
    btnRunning: "Running…",
    statusReady: "Ready to start",
    statusRunning: "Analyzing emails…",
    statusDone: "Analysis Completed",
    statusError: "Execution Error",
    catConfig: "Response Configuration",
    catStats: "Today's Statistics",
    statsRead: "Emails Analyzed",
    statsDrafts: "Drafts Created",
    successBanner: "Cycle complete. Drafts are ready in your Gmail inbox for review.",
    noPendingBanner: "No priority emails pending right now. The agent will keep watching.",
    errorBanner: "Network error while trying to run the agent.",
    noGoogle: "Google account not connected. Connect your account in the Credentials section.",
    liveConsole: "Execution Console"
  }
};

const RULES_DB = [
  {
    id: 'drafts',
    icon: '📝',
    name: { es: 'Solo Borradores', en: 'Drafts Only' },
    desc: { es: 'Guarda las respuestas generadas como borradores en Gmail en lugar de enviarlas automáticamente.', en: 'Saves generated responses as Gmail drafts instead of sending them automatically.' },
    defaultActive: true
  },
  {
    id: 'filter',
    icon: '🎯',
    name: { es: 'Filtrar Correos Importantes', en: 'Filter Important Emails' },
    desc: { es: 'Analiza el contexto para ignorar newsletters, promociones y correos no accionables.', en: 'Analyzes context to ignore newsletters, promotions, and non-actionable emails.' },
    defaultActive: true
  },
  {
    id: 'tone',
    icon: '👔',
    name: { es: 'Tono Profesional', en: 'Professional Tone' },
    desc: { es: 'Mantiene un estilo formal, conciso y orientado a la acción en todas las respuestas.', en: 'Maintains a formal, concise, and action-oriented style in all responses.' },
    defaultActive: true
  },
  {
    id: 'lang',
    icon: '🌐',
    name: { es: 'Auto-Detección de Idioma', en: 'Auto Language Detection' },
    desc: { es: 'Responde automáticamente en el mismo idioma en el que se escribió el correo original.', en: 'Automatically responds in the same language the original email was written in.' },
    defaultActive: false
  }
];

export default function MailResponder({ language, theme }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(t('statusReady'));
  const [activeRules, setActiveRules] = useState(
    RULES_DB.filter(r => r.defaultActive).map(r => r.id)
  );
  const [stats, setStats] = useState({ read: 0, drafts: 0 });
  const [banner, setBanner] = useState(null);
  const [intelVault, setIntelVault] = useState([]);
  const { userProfile } = useAuth();

  useEffect(() => {
    authFetch('/api/agents/memory?limit=5')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.memory)) {
          setIntelVault(data.memory);
        } else {
          setIntelVault([]);
        }
      })
      .catch(err => console.warn('Failed to load intelligence memory', err));
  }, []);

  const toggleRule = (id) => {
    setActiveRules(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    setBanner(null);
    setRunning(true);
    setStatus(t('statusRunning'));

    try {
      const tenantId = userProfile?.id || 'default_tenant';
      const res = await authFetch(`/api/agents/mail-responder/live/${tenantId}`);
      const data = await res.json();

      if (!data.connected) {
        setStatus(t('statusDone'));
        setBanner({ type: 'info', message: t('noGoogle') });
      } else if (data.threads && data.threads.length > 0) {
        setStatus(t('statusDone'));
        setStats({ read: data.threads.length, drafts: data.threads.length });
        setBanner({ type: 'success', message: t('successBanner') });
      } else {
        setStatus(t('statusDone'));
        setBanner({ type: 'info', message: t('noPendingBanner') });
      }
    } catch (err) {
      console.error('[MailResponder]', err);
      setStatus(t('statusError'));
      setBanner({ type: 'error', message: t('errorBanner') });
    } finally {
      setRunning(false);
      setTimeout(() => {
        setStatus(prev => prev === t('statusDone') ? t('statusReady') : prev);
      }, 5000);
    }
  };

  const bannerStyle = {
    success: { background: 'var(--good-bg)', border: '1px solid color-mix(in srgb, var(--good) 30%, transparent)', color: 'var(--good)', icon: '✅' },
    info:    { background: 'var(--bg-muted)', border: '1px solid var(--hair)', color: 'var(--ink)', icon: '📭' },
    error:   { background: 'var(--crit-bg)', border: '1px solid color-mix(in srgb, var(--crit) 30%, transparent)', color: 'var(--crit)', icon: '⚠️' },
  };

  const getStatusColors = () => {
    if (status === t('statusError'))   return { border: 'color-mix(in srgb, var(--crit) 30%, transparent)', text: 'var(--crit)', dot: 'var(--crit)' };
    if (status === t('statusRunning')) return { border: 'var(--accent)', text: 'var(--accent)', dot: 'var(--accent)' };
    if (status === t('statusDone'))    return { border: 'color-mix(in srgb, var(--good) 30%, transparent)', text: 'var(--good)', dot: 'var(--good)' };
    return                                    { border: 'var(--hair)', text: 'var(--muted)', dot: 'var(--muted)' };
  };
  const sc = getStatusColors();

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold flex items-center gap-2 agent-section-title">
          <Mail className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('title')}
        </h1>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: 'var(--muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Configuration & Stats */}
        <div className="flex flex-col gap-6">
          
          <div className="glass-panel-inner p-6 flex flex-col gap-6">
            <div className="border-b pb-4 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
              <Settings size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <h2 className="font-bold text-xl agent-section-title">{t('catConfig')}</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {RULES_DB.map(rule => {
                const isActive = activeRules.includes(rule.id);
                return (
                  <div 
                    key={rule.id}
                    onClick={() => toggleRule(rule.id)}
                    className="p-4 rounded-xl border flex items-start justify-between gap-4 cursor-pointer transition-all duration-200"
                    style={{
                      background: isActive ? 'var(--bg-surface)' : 'var(--bg-muted)',
                      borderColor: isActive ? 'var(--accent)' : 'var(--hair)',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl leading-none mt-0.5">{rule.icon}</span>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-textMain">{rule.name[lang]}</span>
                        <span className="text-xs text-textMuted leading-relaxed">{rule.desc[lang]}</span>
                      </div>
                    </div>

                    <div 
                      className="w-10 h-6 rounded-full flex items-center p-0.5 transition-colors duration-200 flex-shrink-0"
                      style={{ background: isActive ? 'var(--accent)' : 'var(--hair)' }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full bg-white transition-transform duration-200"
                        style={{ transform: isActive ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cerebro Unificado: Memoria Contextual */}
          <div className="glass-panel-inner p-6 flex flex-col gap-4">
            <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--hair)' }}>
              <h2 className="font-bold text-lg flex items-center gap-2 agent-section-title">
                <span className="text-base">🧠</span>
                {lang === 'es' ? 'Cerebro Unificado: Memoria de Prospectos' : 'Unified Brain: Prospect Memory'}
              </h2>
              <span className="text-[11px] font-bold" style={{ color: 'var(--accent-ink, var(--accent))' }}>
                {intelVault.length} {lang === 'es' ? 'registros' : 'records'}
              </span>
            </div>

            {intelVault.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-root)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                {lang === 'es' 
                  ? 'No hay inteligencia de clientes registrada aún en el Vault. Los prospectos analizados aparecerán aquí automáticamente.'
                  : 'No client intelligence saved in vault yet. Analyzed prospects will appear here automatically.'}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {intelVault.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-root)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.entity_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {lang === 'es' ? 'Fuente:' : 'Source:'} {item.source_agent} • {new Date(item.updated_at).toLocaleDateString()}
                      </div>
                    </div>

                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--good, #22c55e)' }}>
                      {lang === 'es' ? 'Sincronizado' : 'Synced'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STATS AREA */}
          <div className="glass-panel-inner p-6 flex flex-col gap-4">
            <div className="border-b pb-4 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
              <Activity size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <h2 className="font-bold text-xl agent-section-title">{t('catStats')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border flex items-center gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--hair)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" style={{ background: 'var(--bg-muted)', color: 'var(--accent-ink, var(--accent))' }}>
                  {stats.read}
                </div>
                <div className="flex flex-col">
                  <div className="text-xl font-bold text-textMain">{stats.read}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>{t('statsRead')}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl border flex items-center gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--hair)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" style={{ background: 'var(--bg-muted)', color: 'var(--good)' }}>
                  {stats.drafts}
                </div>
                <div className="flex flex-col">
                  <div className="text-xl font-bold text-textMain">{stats.drafts}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>{t('statsDrafts')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Execution Console */}
        <div className="glass-panel-inner p-6 flex flex-col gap-6 sticky top-6">
          <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--hair)' }}>
            <h2 className="font-bold text-xl flex items-center gap-2 agent-section-title">
              {t('liveConsole')}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-bgMuted border" style={{ borderColor: sc.border }}>
              <span className="text-xs font-bold uppercase tracking-wider text-textMain">Status</span>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: sc.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot, boxShadow: `0 0 8px ${sc.dot}` }}></span>
                {status}
              </div>
            </div>

            <button 
              onClick={handleRun}
              disabled={running}
              className="agent-btn-primary w-full py-4"
            >
              {running ? <span className="animate-pulse">{t('btnRunning')}</span> : <><Bot size={18}/> {t('btnRun')}</>}
            </button>
          </div>

          {banner && (
            <div className="animate-fade-in text-sm font-medium p-4 rounded-lg flex items-start gap-3 mt-4" style={{
              background: bannerStyle[banner.type].background,
              border: bannerStyle[banner.type].border,
              color: bannerStyle[banner.type].color
            }}>
              <span>{bannerStyle[banner.type].icon}</span>
              <span className="leading-relaxed">{banner.message}</span>
            </div>
          )}

          {/* Dummy visual log representation */}
          <div className="agent-console flex flex-col gap-2 min-h-[250px] mt-2" style={{ opacity: 0.8, fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--muted)' }}>{'>'} Inicializando MailResponder Agent...</span>
            <span style={{ color: 'var(--muted)' }}>{'>'} Verificando credenciales de Google Workspace...</span>
            {running && <span className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }}>{'>'} Escaneando bandeja de entrada en busca de hilos no leídos...</span>}
            {stats.read > 0 && !running && <span style={{ color: 'var(--accent-ink, var(--accent))' }}>{'>'} Se encontraron {stats.read} correos.</span>}
            {stats.drafts > 0 && !running && <span className="agent-log-success">{'>'} Se generaron {stats.drafts} borradores exitosamente.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
