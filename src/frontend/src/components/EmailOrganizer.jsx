import React, { useState } from 'react';
import { Mail, Settings, CheckCircle, AlertTriangle, Play, Sliders, Database, ShieldCheck, UserPlus, Building2, X, UserCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../infrastructure/auth/AuthProvider';
import { useNotifications } from './common/Notifications';

const TRANSLATIONS = {
  es: {
    title: "Organizador de Bandeja CRM",
    desc: "Clasificación automática de correos entrantes verificados contra el CRM conectado del cliente (Notion / Sheets / CRM externo) en tiempo real.",
    btnRun: "Ejecutar Agente",
    processing: "Analizando correos y consultando CRM del cliente…",
    sandboxTitle: "Resultados del Análisis (CRM Conectado del Cliente)",
    liveConsole: "Consola de Organización CRM",
    crmMatch: "VERIFICADO EN CRM DEL CLIENTE",
    newContact: "NUEVO PROSPECTO / NO REGISTRADO",
    companyLabel: "COMPAÑÍA / ORGANIZACIÓN",
    applyBtn: "Aplicar Etiquetas Definitivas",
    taskReady: "¡Correos organizados y verificados con el CRM del cliente con éxito!",
    ephemeralNotice: "Memoria epímera creada: correos auditados en caché de 1 solo uso."
  },
  en: {
    title: "Client CRM Inbox Organizer",
    desc: "Automated classification of incoming emails verified against the client's connected CRM (Notion / Sheets / External CRM) in real time.",
    btnRun: "Run Agent",
    processing: "Analyzing emails and querying client CRM…",
    sandboxTitle: "Analysis Results (Client Connected CRM)",
    liveConsole: "CRM Organization Console",
    crmMatch: "VERIFIED IN CLIENT CRM",
    newContact: "NEW PROSPECT / UNREGISTERED",
    companyLabel: "COMPANY / ORGANIZATION",
    applyBtn: "Apply Final Labels",
    taskReady: "Emails organized and verified with client CRM successfully!",
    ephemeralNotice: "Ephemeral memory created: emails audited in 1-time cache."
  }
};

export default function EmailOrganizer({ theme, language }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const { userProfile } = useAuth();
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ processed: 0, crmMatches: 0, newContacts: 0, labeled: 0 });
  const [previewItems, setPreviewItems] = useState([]);
  const [newProspectsAlert, setNewProspectsAlert] = useState([]);
  const [showProspectsPopup, setShowProspectsPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setPreviewItems([]);
    setShowProspectsPopup(false);

    try {
      const tenantId = userProfile?.id || 'default_tenant';
      const res = await fetch('/svc/email-organizer/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: ['crm_verify', 'company_label', '50_emails_limit'],
          simulation: false, // Ejecución directa y limpia
          tenant_id: tenantId
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error procesando correos');

      setStats(data.stats || {});
      const items = data.previewItems || [];
      setPreviewItems(items);

      // Filtrar prospectos nuevos para el popup modal de alertas con cierre manual (X)
      const newones = items.filter(item => !item.crmVerified && !item.shouldDelete);
      if (newones.length > 0) {
        setNewProspectsAlert(newones);
        setShowProspectsPopup(true);
      } else {
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 5000);
      }

    } catch (err) {
      console.error('[EmailOrganizer UI] Error:', err);
      notify(err.message || 'Error al conectar con el servicio de organización.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20 relative">
      
      {/* POPUP DE ALERTA DE NUEVOS CLIENTES / PROSPECTOS CON BOTÓN "X" */}
      {showProspectsPopup && newProspectsAlert.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="agent-card max-w-xl w-full flex flex-col gap-5 p-6 animate-fade-in relative shadow-2xl" style={{ background: 'var(--glass-quiet)', border: '1px solid var(--warn)' }}>
            
            {/* Botón de cierre manual "X" */}
            <button 
              onClick={() => setShowProspectsPopup(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-textMuted hover:text-textMain"
              title="Cerrar modal de alertas"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--hair)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>
                <UserCheck size={22} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg agent-section-title" style={{ color: 'var(--heading)' }}>
                  {lang === 'es' ? 'Alerta: Nuevos Contactos Detectados' : 'Alert: New Prospect Contacts Detected'}
                </h3>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {lang === 'es' 
                    ? `Se encontraron ${newProspectsAlert.length} nuevos remitentes no registrados en tu CRM.` 
                    : `Found ${newProspectsAlert.length} new senders not registered in your CRM.`}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {newProspectsAlert.map((prospect, idx) => (
                <div key={idx} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-muted)', border: '1px solid var(--hair-soft)' }}>
                  <div className="flex flex-col truncate max-w-[320px]">
                    <span className="font-bold text-xs truncate" style={{ color: 'var(--heading)' }}>{prospect.from}</span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{prospect.subject}</span>
                  </div>
                  <span className="agent-status-badge warn text-[9px] whitespace-nowrap">
                    🏷️ {prospect.proposedLabels?.[0] || 'NUEVO PROSPECTO'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--hair)' }}>
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                {lang === 'es' ? 'Etiquetas de seguimiento aplicadas' : 'Follow-up labels assigned'}
              </span>
              <button 
                onClick={() => setShowProspectsPopup(false)}
                className="agent-btn-primary py-2 px-5 text-xs flex items-center gap-2"
              >
                <span> Entendido </span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HEADER INFO (SIN ICONO EXTRA DE CORREO REDUNDANTE) */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {t('title')}
        </h1>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: 'var(--muted)' }}>{t('desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Main Controls & Stats */}
        <div className="glass-panel-inner flex flex-col gap-6 p-6">
          <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--hair)' }}>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-xl agent-section-title">
                {lang === 'es' ? 'Reglas de Validación con CRM Conectado del Cliente' : 'Client Connected CRM Validation Rules'}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="agent-card flex flex-col gap-2">
              <div className="flex items-center gap-2" style={{ color: 'var(--good)' }}>
                <span className="font-bold text-sm">{t('crmMatch')}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {lang === 'es' 
                  ? 'Si el correo coincide con un cliente en su CRM conectado (Notion/Sheets/CRM en Vault), se crea la etiqueta [CRM] Nombre.' 
                  : 'If email matches a client in their connected CRM (Notion/Sheets/CRM in Vault), label [CRM] Name is created.'}
              </p>
            </div>

            <div className="agent-card flex flex-col gap-2 border-2" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--warn)' }}>
                <span className="font-bold text-sm">{t('newContact')}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                {lang === 'es' 
                  ? 'Si no existe en el CRM del cliente, resalta en amarillo y activa alerta modal de seguimiento con [NUEVO PROSPECTO].' 
                  : 'If missing in client CRM, highlights in yellow and triggers modal alert with [NEW PROSPECT].'}
              </p>
            </div>

            <div className="agent-card flex flex-col gap-2">
              <div className="flex items-center gap-2" style={{ color: 'var(--accent-ink, var(--accent))' }}>
                <span className="font-bold text-sm">{t('companyLabel')}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {lang === 'es' 
                  ? 'Si el correo proviene de un dominio corporativo, prioriza la etiqueta con el Nombre de la Empresa.' 
                  : 'If email is from a corporate domain, prioritizes label with Company Name.'}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          {stats.processed > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div className="agent-card text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>{stats.processed}</div>
                <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--muted)' }}>Analizados</div>
              </div>
              <div className="agent-card text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--good)' }}>{stats.crmMatches}</div>
                <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--good)' }}>Verificados CRM Cliente</div>
              </div>
              <div className="agent-card text-center relative border-2" style={{ borderColor: 'var(--warn)', background: 'var(--warn-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--warn)' }}>{stats.newContacts}</div>
                <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--warn)' }}>Nuevos Prospectos</div>
              </div>
              <div className="agent-card text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--accent-ink, var(--accent))' }}>{stats.labeled}</div>
                <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--muted)' }}>Etiquetados</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Execution Console */}
        <div className="glass-panel-inner p-6 flex flex-col gap-6 sticky top-6">
          <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--hair)' }}>
            <h2 className="font-bold text-xl flex items-center gap-2 agent-section-title">
              {t('liveConsole')}
            </h2>
          </div>

          {/* UN SOLO BOTÓN DE EJECUCIÓN DIRECTA DEL AGENTE */}
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleRun}
              disabled={running}
              className="agent-btn-primary w-full py-4"
            >
              {running ? <span className="animate-pulse">{t('processing')}</span> : t('btnRun')}
            </button>
          </div>

          {/* Console Output Area */}
          {(previewItems.length > 0 || running) && (
            <div className="agent-console flex flex-col gap-4 min-h-[150px]">
              {running && (
                <div className="flex flex-col items-center justify-center h-full min-h-[150px] gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                  <span className="text-xs font-mono animate-pulse">{t('processing')}</span>
                </div>
              )}

            {previewItems.length > 0 && !running && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <h4 className="font-bold text-xs tracking-widest uppercase flex items-center gap-1.5" style={{ color: 'var(--accent-ink, var(--accent))' }}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span> {t('sandboxTitle')}
                </h4>

                <div className="text-[11px] p-2.5 rounded-md font-mono" style={{ background: 'var(--bg-muted)', border: '1px solid var(--hair-soft)', color: 'var(--muted)' }}>
                  {t('ephemeralNotice')}
                </div>
                
                {previewItems.map((item) => {
                  const isNewProspect = !item.crmVerified && !item.shouldDelete;
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-lg flex flex-col gap-2 transition-all ${isNewProspect ? 'border-2 shadow-sm' : ''}`} 
                      style={{ 
                        background: isNewProspect ? 'var(--warn-bg)' : 'var(--bg-muted)', 
                        borderColor: isNewProspect ? 'var(--warn)' : 'var(--hair-soft)' 
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold truncate max-w-[200px]" style={{ color: 'var(--heading)' }}>{item.from}</span>
                          <span className="text-[10px] truncate max-w-[200px]" style={{ color: 'var(--muted)' }}>{item.subject}</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${item.crmVerified ? 'agent-status-badge good' : 'agent-status-badge warn'}`}>
                          {item.crmVerified ? `✓ ${item.crmData?.provider || 'CRM CLIENTE'}` : '★ NUEVO PROSPECTO'}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-medium mt-1">
                        <span style={{ color: item.crmVerified ? 'var(--good)' : 'var(--warn)' }}>
                          🏷️ Etiqueta: {item.proposedLabels?.join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
      
      {showSuccessPopup && (
        <div className="agent-toast">
          <CheckCircle size={20} />
          <span>{t('taskReady')}</span>
        </div>
      )}
    </div>
  );
}
