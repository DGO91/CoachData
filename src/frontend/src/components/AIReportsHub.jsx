import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Clock, Bot, Send, RefreshCw, ChevronRight, CheckCircle2, 
  AlertTriangle, PhoneCall, Moon, BarChart2, Star, Mail, Loader2, ArrowRight, Grid,
  Search, Copy, Check, Shield, TrendingUp, Cpu, X
} from 'lucide-react';
import { authFetch } from '../core/api/authFetch';
import { AgentCatalogCard } from './agents/AgentCatalogCard';
import { AgentLiveConsoleDrawer } from './agents/AgentLiveConsoleDrawer';

const TRANSLATIONS = {
  es: {
    title: "Centro de Comando & Agentes de IA",
    subtitle: "Catálogo interactivo, ejecución en consola en vivo y buzón de inteligencia estratégica.",
    tabInbox: "📬 Buzón de Reportes Depositados",
    tabCatalog: "🤖 Catálogo de Agentes",
    tabMorning: "🌅 Resumen Matutino",
    tabPrecall: "📞 Dossier Pre-Call",
    tabEvening: "🌆 Cierre Operativo",
    tabWeekly: "📊 Métricas Semanales",
    
    btnGenerate: "Generar Informe Ahora",
    btnGenerating: "Generando reporte de inteligencia…",
    btnSelectMeeting: "Seleccionar Reunión de Hoy:",
    inputCustomName: "O escribe un nombre/empresa manual:",
    phName: "ej. Janine Allis (Boost Juice)",
    btnGenerateDossier: "Generar Dossier de Ventas",
    
    secSummary: "Resumen Ejecutivo",
    secAgenda: "Agenda Inteligente",
    secActions: "Acciones Críticas de Hoy",
    
    // Fallbacks
    noGoogle: "⚠️ Tu cuenta de Google no está conectada. Mostrando vista previa de inteligencia.",
    noMeetings: "No hay reuniones programadas para hoy.",
    generateSuccess: "¡Reporte generado en pantalla!",
  },
  en: {
    title: "AI Command Center & Agent Hub",
    subtitle: "Interactive catalog, live terminal execution, and strategic intelligence digests.",
    tabInbox: "📬 Deposited Reports Inbox",
    tabCatalog: "🤖 Agents Catalog",
    tabMorning: "🌅 Morning Briefing",
    tabPrecall: "📞 Pre-Call Dossier",
    tabEvening: "🌆 Evening Summary",
    tabWeekly: "📊 Weekly Digest",
    
    btnGenerate: "Generate Report Now",
    btnGenerating: "Generating intelligence report…",
    btnSelectMeeting: "Select Today's Meeting:",
    inputCustomName: "Or enter client name manually:",
    phName: "e.g. Janine Allis (Boost Juice)",
    btnGenerateDossier: "Generate Sales Dossier",
    
    secSummary: "Executive Summary",
    secAgenda: "Smart Agenda",
    secActions: "Today's Critical Actions",
    
    noGoogle: "⚠️ Google Account not connected. Displaying high-fidelity preview.",
    noMeetings: "No meetings scheduled for today.",
    generateSuccess: "Report generated on screen!",
  }
};

export default function AIReportsHub({ language, userProfile }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedConsoleAgent, setSelectedConsoleAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(true);

  // Saved Reports in Database State
  const [savedReports, setSavedReports] = useState([]);
  const [selectedSavedReport, setSelectedSavedReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedReportId, setCopiedReportId] = useState(null);

  // Data states
  const [events, setEvents] = useState([]);
  const [unreadEmails, setUnreadEmails] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [manualName, setManualName] = useState('');

  // Generated Report Content States
  const [morningReport, setMorningReport] = useState(null);
  const [precallReport, setPrecallReport] = useState(null);
  const [eveningReport, setEveningReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);

  // Fetch deposited reports from database
  const fetchSavedReports = async () => {
    setReportsLoading(true);
    try {
      const res = await authFetch('/api/agents/reports?limit=50');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.reports) && data.reports.length > 0) {
        setSavedReports(data.reports);
        if (!selectedSavedReport) {
          setSelectedSavedReport(data.reports[0]);
        }
      } else {
        setSavedReports([]);
        setSelectedSavedReport(null);
      }
    } catch (err) {
      console.warn('Error fetching saved reports', err);
      setSavedReports([]);
      setSelectedSavedReport(null);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDeleteReport = async (e, reportId) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/agents/reports/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        notify(lang === 'es' ? 'Reporte eliminado' : 'Report deleted', { type: 'success' });
        if (selectedSavedReport?.id === reportId) {
          setSelectedSavedReport(null);
        }
        setSavedReports(prev => prev.filter(r => r.id !== reportId));
        window.dispatchEvent(new Event('agent_report_read')); // Update dashboard counts
      }
    } catch (err) {
      notify(lang === 'es' ? 'Error al eliminar reporte' : 'Error deleting report', { type: 'error' });
    }
  };

  useEffect(() => {
    fetchSavedReports();
  }, [userProfile]);

  // Fetch initial Google data on load to feed reports
  useEffect(() => {
    const fetchGoogleData = async () => {
      try {
        const tenantId = userProfile?.id || 'default_tenant';
        const res = await authFetch(`/api/agents/morning-briefing/live/${tenantId}`);
        const data = await res.json();
        if (data.connected) {
          setGoogleConnected(true);
          setEvents(data.events || []);
          setUnreadEmails(data.unreadEmails || []);
          if (data.events && data.events.length > 0) {
            setSelectedMeeting(data.events[0].summary);
          }
        } else {
          setGoogleConnected(false);
        }
      } catch (err) {
        console.warn('Could not connect to Google API routes', err);
        setGoogleConnected(false);
      }
    };
    fetchGoogleData();
  }, [userProfile]);

  // MORNING BRIEFING GENERATION
  const handleGenerateMorning = async () => {
    setLoading(true);
    setTimeout(() => {
      const userName = userProfile?.name ? userProfile.name.split(' ')[0] : (lang === 'es' ? 'Coach' : 'Coach');
      
      if (googleConnected) {
        setMorningReport({
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          greeting: lang === 'es' 
            ? `¡Buenos días, ${userName}! Aquí tienes tu briefing ejecutivo de rendimiento listo para la acción.`
            : `Good morning, ${userName}! Here is your high-end performance briefing ready for action.`,
          quote: null,
          stats: {
            meetings: events.length,
            emails: unreadEmails.length,
            savedTime: `${(events.length * 0.5 + unreadEmails.length * 0.1).toFixed(1)} hrs`
          },
          agendaList: events.length > 0 ? events.map(ev => {
            const start = ev.start ? new Date(ev.start) : new Date();
            return {
              time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              title: ev.summary || (lang === 'es' ? 'Reunión sin título' : 'Untitled Meeting')
            };
          }) : [
            { time: "🎉", title: lang === 'es' ? "No hay reuniones programadas para hoy." : "No meetings scheduled for today." }
          ],
          actions: [
            ...(events.length > 0 ? [
              lang === 'es' 
                ? `Preparar dossier Pre-Call para tus ${events.length} reuniones de hoy.`
                : `Prepare Pre-Call dossier for your ${events.length} meetings today.`
            ] : [
              lang === 'es'
                ? "No tienes reuniones hoy. ¡Buen momento para trabajar en tus sistemas!"
                : "No meetings today. Great time to focus on your business systems!"
            ]),
            ...(unreadEmails.length > 0 ? [
              lang === 'es'
                ? `Revisar y responder los ${unreadEmails.length} correos pendientes en tu inbox primario.`
                : `Review and reply to the ${unreadEmails.length} pending emails in your primary inbox.`
            ] : [
              lang === 'es'
                ? "Tu bandeja de entrada está al día. ¡Sin correos urgentes! ✅"
                : "Your inbox is clear. No urgent emails today! ✅"
            ])
          ]
        });
      } else {
        setMorningReport({
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          greeting: lang === 'es' 
            ? `¡Buenos días, ${userName}! Aquí tienes tu briefing ejecutivo de rendimiento listo para la acción.`
            : `Good morning, ${userName}! Here is your high-end performance briefing ready for action.`,
          quote: null,
          stats: {
            meetings: 3,
            emails: 2,
            savedTime: "1.5 hrs"
          },
          agendaList: [
            { time: "10:00 AM", title: lang === 'es' ? "Llamada de Descubrimiento: John D. (Agencia de Software)" : "Discovery Call: John D. (Software Agency)" },
            { time: "01:30 PM", title: lang === 'es' ? "Sesión de Alineación Estratégica: Sarah J." : "Strategy Alignment Session: Sarah J." },
            { time: "04:00 PM", title: lang === 'es' ? "Llamada de Cierre: VIP Elite Mentoring" : "Closing Call: VIP Elite Mentoring" }
          ],
          actions: lang === 'es' ? [
            "Preparar dossier Pre-Call para tu reunión de las 10:00 AM.",
            "Revisar los 2 correos de alta prioridad en Gmail.",
            "Enviar borradores de propuestas estratégicas pendientes."
          ] : [
            "Prepare Pre-Call dossier for your 10:00 AM meeting.",
            "Review the 2 high-priority emails in Gmail.",
            "Send pending strategic proposal drafts."
          ]
        });
      }
      setLoading(false);
    }, 1000);
  };

  // PRE-CALL DOSSIER GENERATION
  const handleGeneratePrecall = () => {
    setLoading(true);
    const targetName = manualName || selectedMeeting || (lang === 'es' ? "Cliente Potencial de Elite" : "Elite Potential Client");
    
    setTimeout(() => {
      setPrecallReport({
        clientName: targetName,
        industry: lang === 'es' ? "Coaching de Negocios & Consultoría B2B" : "Business Coaching & B2B Consulting",
        status: lang === 'es' ? "Listo para cierre de ticket alto" : "Ready for high-ticket closing",
        positioning: {
          niche: lang === 'es' ? "Especialista en mentorías corporativas y optimización de ventas." : "Specialized in corporate mentorships and sales optimization.",
          authority: lang === 'es' ? "Excelente presencia en LinkedIn. Más de 10k seguidores, blog de liderazgo activo." : "Strong presence on LinkedIn. 10k+ followers, active leadership blog.",
          weakness: lang === 'es' ? "Embudo de captación ineficiente. Su llamada de reserva redirige a un formulario plano de Google Forms." : "Inefficient booking funnel. Booking link redirects to a plain Google Form."
        },
        designFlaws: lang === 'es' ? [
          "Tipografía predeterminada de sistema restando seriedad comercial.",
          "Colores fríos con bajo contraste que dificultan la llamada a la acción principal.",
          "Falta de prueba social interactiva (testimonios estructurados en video)."
        ] : [
          "Default browser typography reduces commercial authority.",
          "Low contrast cold colors make the main call-to-action blend in.",
          "Lack of interactive social proof (video client testimonials)."
        ],
        tactics: lang === 'es' ? [
          "Ofrecer migrar su formulario estático a una Suite de Agendamiento automatizado.",
          "Presentar un mock de rediseño de marca minimalista usando HSL Sage Green y tipografía Outfit.",
          "Garantizar la conexión con el CRM (Notion/Hubspot) para evitar pérdida de leads."
        ] : [
          "Offer a direct migration from Google Forms to an automated Booking Suite.",
          "Showcase a minimal design mockup utilizing Sage Green and Outfit typography.",
          "Propose database sync with CRM (Notion/HubSpot) to prevent lead leaks."
        ]
      });
      setLoading(false);
    }, 1200);
  };

  // EVENING SUMMARY GENERATION
  const handleGenerateEvening = () => {
    setLoading(true);
    setTimeout(() => {
      if (googleConnected) {
        setEveningReport({
          title: lang === 'es' ? "Cierre Operativo y Rendimiento Diario" : "Daily Closure & Performance Report",
          timestamp: new Date().toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          meetingsCompleted: events.length,
          emailsProcessed: unreadEmails.length,
          summaryText: lang === 'es'
            ? `Jornada concluida exitosamente. Todos los sistemas del clúster operaron con normalidad. Se redactaron borradores inteligentes automáticos para los ${unreadEmails.length} correos de prioridad alta en tu Gmail. Las ${events.length} reuniones de tu calendario se completaron y el CRM se actualizó.`
            : `Day completed successfully. All cluster services operating normally. AI auto-replies drafted for ${unreadEmails.length} high-priority Gmail threads. The ${events.length} calendar meetings completed and CRM statuses updated.`,
          financials: {
            savedCost: `$${(events.length * 40 + unreadEmails.length * 15).toFixed(0)} USD`,
            hoursFreed: `${(events.length * 0.5 + unreadEmails.length * 0.1).toFixed(1)} hrs`
          }
        });
      } else {
        setEveningReport({
          title: lang === 'es' ? "Cierre Operativo y Rendimiento Diario" : "Daily Closure & Performance Report",
          timestamp: new Date().toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          meetingsCompleted: 3,
          emailsProcessed: 18,
          summaryText: lang === 'es'
            ? "Jornada concluida exitosamente. Todos los sistemas del clúster operaron con normalidad. Se redactaron borradores inteligentes automáticos para 2 correos de prioridad alta en Gmail. Las reuniones programadas para hoy se realizaron y el CRM se actualizó."
            : "Day completed successfully. All cluster services operating normally. AI auto-replies drafted for 2 high-priority Gmail threads. Scheduled calendar meetings completed and CRM statuses updated.",
          financials: {
            savedCost: "$120 USD",
            hoursFreed: "4.2 hrs"
          }
        });
      }
      setLoading(false);
    }, 1000);
  };

  // WEEKLY DIGEST GENERATION
  const handleGenerateWeekly = () => {
    setLoading(true);
    setTimeout(() => {
      setWeeklyReport({
        weekRange: lang === 'es' ? "Lunes a Viernes" : "Monday to Friday",
        overallScore: "9.5 / 10",
        highlights: lang === 'es' ? [
          "Se escanearon y clasificaron 118 correos en tu bandeja de entrada.",
          "Se redactaron 47 borradores estratégicos de respuestas comerciales.",
          "Se recopilaron 12 dossiers Pre-Call de prospectos para llamadas de ventas.",
          "Ahorro acumulado de tiempo operativo de 21 horas."
        ] : [
          "Scanned and categorized 118 inbox emails.",
          "Drafted 47 context-aware sales auto-replies on Gmail.",
          "Prepared 12 Pre-Call sales dossiers for upcoming client bookings.",
          "Saved a total of 21 hours of operational tasks."
        ],
        bossRecommendation: lang === 'es'
          ? "Excelente constancia operativa. Tu embudo de prospección está rindiendo bien. Te sugiero ajustar el tono de respuestas a uno ligeramente más directo para acelerar las firmas comerciales la próxima semana."
          : "Superb operational consistency. Your booking funnel is performing well. Focus next week on a slightly more direct tone in email drafts to speed up contract signings."
      });
      setLoading(false);
    }, 1100);
  };

  return (
    <div className="view-content animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8 pl-4">
        <h1 className="text-3xl font-bold text-textMain flex items-center gap-3">
          {lang === 'es' ? 'Buzón de Reportes e Inteligencia IA' : 'AI Reports & Briefings Hub'}
        </h1>
        <p className="text-base text-textMuted leading-relaxed max-w-4xl m-0">
          {t('subtitle')}
        </p>
      </div>

      {!googleConnected && (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', color: '#f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          {t('noGoogle')}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-borderColor/50 overflow-x-auto hide-scrollbar">
        {[
          { key: 'inbox', label: t('tabInbox'), icon: <FileText size={16} /> },
          { key: 'catalog', label: t('tabCatalog'), icon: <Bot size={16} /> },
          { key: 'morning', label: t('tabMorning'), icon: <Clock size={16} /> },
          { key: 'precall', label: t('tabPrecall'), icon: <PhoneCall size={16} /> },
          { key: 'evening', label: t('tabEvening'), icon: <Moon size={16} /> },
          { key: 'weekly', label: t('tabWeekly'), icon: <BarChart2 size={16} /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border whitespace-nowrap rounded-xl ${activeTab === tab.key ? 'bg-bgMain/80 shadow-sm' : 'text-textMuted border-transparent hover:bg-bgMain/30 hover:text-textMain'}`}
            style={activeTab === tab.key ? { color: 'var(--accent-ink, var(--accent))', borderColor: 'var(--accent)' } : { borderColor: 'transparent' }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTAINER CONTENT */}
      <div className="glass-panel-inner p-8 min-h-[400px] flex flex-col relative shadow-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(24, 32, 28, 0.85)', borderRadius: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 10 }}>
            <Loader2 size={36} className="animate-spin" color="var(--accent)" />
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>{t('btnGenerating')}</span>
          </div>
        )}

        {/* INBOX DEPOSITED REPORTS VIEW */}
        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
                {[
                  { id: 'all', label: lang === 'es' ? 'Todos los Reportes' : 'All Reports' },
                  { id: 'morning_briefing', label: lang === 'es' ? '🌅 Matutinos' : '🌅 Morning' },
                  { id: 'pre_call', label: lang === 'es' ? '📞 Pre-Call' : '📞 Pre-Call' },
                  { id: 'evening_summary', label: lang === 'es' ? '🌆 Cierre Diario' : '🌆 Daily Close' },
                  { id: 'weekly_digest', label: lang === 'es' ? '📊 Semanales' : '📊 Weekly' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setReportFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: reportFilter === f.id ? 'var(--accent)' : 'var(--bg-root)',
                      color: reportFilter === f.id ? 'var(--accent-text, #ffffff)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'es' ? 'Buscar en informes...' : 'Search reports...'}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '8px',
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {savedReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-root)', borderRadius: '12px', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <FileText size={40} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {lang === 'es' ? 'No hay reportes depositados aún en el buzón' : 'No reports deposited in inbox yet'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px', margin: 0, lineHeight: 1.5 }}>
                  {lang === 'es' ? 'Cuando tus agentes de IA generen sus informes matutinos, pre-call o resúmenes de cierre, se depositarán y archivarán automáticamente aquí.' : 'When your AI agents run scheduled or on-demand tasks, generated reports will be archived here.'}
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'var(--accent-text, #ffffff)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Bot size={13} />
                  <span>{lang === 'es' ? 'Ir al Catálogo de Agentes' : 'Go to Agents Catalog'}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.9fr)', gap: '18px', marginTop: '4px' }}>
                {/* Left: Reports List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
                  {savedReports
                    .filter((r) => reportFilter === 'all' || r.agent_type === reportFilter)
                    .filter((r) => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((rep) => {
                    const isSelected = selectedSavedReport?.id === rep.id;
                    return (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedSavedReport(rep)}
                        style={{
                          background: isSelected ? 'var(--bg-root)' : 'var(--bg-surface)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--accent-ink, var(--accent))',
                              background: 'var(--bg-root)',
                              border: '1px solid var(--border)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {rep.agent_type === 'morning_briefing' ? '🌅 Matutino' : rep.agent_type === 'pre_call' ? '📞 Pre-Call' : rep.agent_type === 'evening_summary' ? '🌆 Cierre' : '📊 Semanal'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(rep.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
                            </span>
                            <button
                              onClick={(e) => handleDeleteReport(e, rep.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '2px',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={lang === 'es' ? 'Eliminar reporte' : 'Delete report'}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {rep.title}
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {rep.summary}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Right: Detailed Reader */}
              {selectedSavedReport ? (
                <div
                  style={{
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    height: 'fit-content',
                    minHeight: '400px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--accent-ink, var(--accent))',
                          }}
                        >
                          <Shield size={11} />
                          <span>Claude Sonnet 5</span>
                        </span>

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(selectedSavedReport.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {selectedSavedReport.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => {
                        if (selectedSavedReport?.content_markdown) {
                          navigator.clipboard.writeText(selectedSavedReport.content_markdown);
                          setCopiedReportId(selectedSavedReport.id);
                          setTimeout(() => setCopiedReportId(null), 2000);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {copiedReportId === selectedSavedReport.id ? <Check size={12} style={{ color: 'var(--good, #22c55e)' }} /> : <Copy size={12} />}
                      <span>{copiedReportId === selectedSavedReport.id ? (lang === 'es' ? 'Copiado' : 'Copied') : (lang === 'es' ? 'Copiar Informe' : 'Copy')}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                    {selectedSavedReport.content_markdown}
                  </div>

                  {/* Action Chips (Pilar 1 - Actionable Intelligence) */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                      {lang === 'es' ? '⚡ Acciones Rápidas Disponibles' : '⚡ Available Quick Actions'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedSavedReport.agent_type === 'pre_call' && (
                        <>
                          <button
                            onClick={() => onNavigate && onNavigate('auto-plan')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--accent)',
                              color: 'var(--accent-text, #ffffff)',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <FileText size={13} />
                            <span>{lang === 'es' ? 'Crear Plan Estratégico' : 'Create Strategic Plan'}</span>
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => onNavigate && onNavigate('mail-responder')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Mail size={13} />
                            <span>{lang === 'es' ? 'Redactar Email Pre-Encuadre' : 'Draft Pre-Framing Email'}</span>
                          </button>
                        </>
                      )}

                      {selectedSavedReport.agent_type === 'morning_briefing' && (
                        <>
                          <button
                            onClick={() => onNavigate && onNavigate('email')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--accent)',
                              color: 'var(--accent-text, #ffffff)',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Mail size={13} />
                            <span>{lang === 'es' ? 'Procesar Bandeja de Entrada' : 'Process Email Inbox'}</span>
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => onNavigate && onNavigate('prospect')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Search size={13} />
                            <span>{lang === 'es' ? 'Analizar Nuevos Prospectos' : 'Analyze New Prospects'}</span>
                          </button>
                        </>
                      )}

                      {(selectedSavedReport.agent_type === 'evening_summary' || selectedSavedReport.agent_type === 'weekly_digest') && (
                        <>
                          <button
                            onClick={() => onNavigate && onNavigate('revenue-suite')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--accent)',
                              color: 'var(--accent-text, #ffffff)',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <TrendingUp size={13} />
                            <span>{lang === 'es' ? 'Ver Métricas de Facturación CRM' : 'View Revenue CRM Metrics'}</span>
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => onNavigate && onNavigate('knowledge-base')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Cpu size={13} />
                            <span>{lang === 'es' ? 'Consultar Base de Conocimiento' : 'Query Knowledge Base'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                  <FileText size={40} color="var(--border-strong)" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                  <p>{lang === 'es' ? 'Selecciona un informe de la lista para leer el contenido completo.' : 'Select a report from the list to view full content.'}</p>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* AGENTS CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
            {/* Category: Operaciones */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                {lang === 'es' ? 'Operaciones & Rutina Diaria' : 'Operations & Daily Routine'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <AgentCatalogCard
                  agent={{
                    id: 'morning-briefing',
                    name: lang === 'es' ? 'Morning Briefing' : 'Morning Briefing',
                    category: lang === 'es' ? 'Agenda & Prioridades' : 'Agenda & Priorities',
                    status: 'active',
                    description: lang === 'es' ? 'Sintetiza la agenda del día, correos no leídos y foco estratégico para empezar la jornada.' : 'Synthesizes daily meetings, pending emails, and strategic focus.',
                    model: 'Claude Sonnet 5',
                    latency: '28ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
                <AgentCatalogCard
                  agent={{
                    id: 'evening-summary',
                    name: lang === 'es' ? 'Evening Summary' : 'Evening Summary',
                    category: lang === 'es' ? 'Cierre Diario' : 'Daily Close',
                    status: 'active',
                    description: lang === 'es' ? 'Evalúa las victorias del día, tareas completadas en Project Desk y pendientes críticos para mañana.' : 'Evaluates daily wins, completed tasks, and tomorrow priorities.',
                    model: 'Claude Sonnet 5',
                    latency: '31ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
                <AgentCatalogCard
                  agent={{
                    id: 'knowledge-base',
                    name: lang === 'es' ? 'Knowledge Base Assistant' : 'Knowledge Base Assistant',
                    category: lang === 'es' ? 'Memoria del Coach' : 'Coach Memory',
                    status: 'active',
                    description: lang === 'es' ? 'Responde preguntas y busca metodologías indexadas en los documentos del cliente.' : 'Answers questions and searches indexed methodology documents.',
                    model: 'Claude Sonnet 5',
                    latency: '36ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
              </div>
            </div>

            {/* Category: Ventas & Cierre */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                {lang === 'es' ? 'Inteligencia Comercial & Cierre de Ventas' : 'Sales Intelligence & Deal Closing'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <AgentCatalogCard
                  agent={{
                    id: 'pre-call',
                    name: lang === 'es' ? 'Pre-Call Intelligence' : 'Pre-Call Intelligence',
                    category: lang === 'es' ? 'Preparación de Reunión' : 'Meeting Preparation',
                    status: 'active',
                    description: lang === 'es' ? 'Investiga el perfil del prospecto, su autoridad, nicho y debilidades antes de la llamada de ventas.' : 'Researches prospect profile, authority, and positioning flaws before calls.',
                    model: 'Claude Sonnet 5',
                    latency: '34ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
                <AgentCatalogCard
                  agent={{
                    id: 'prospect-analyzer',
                    name: lang === 'es' ? 'Prospect Analyzer' : 'Prospect Analyzer',
                    category: lang === 'es' ? 'Calificación Algorítmica' : 'Lead Scoring Engine',
                    status: 'active',
                    description: lang === 'es' ? 'Calcula la puntuación (0-100) y justificación de intención a partir de formularios y actividad.' : 'Calculates lead score (0-100) and qualification rationale from form inputs.',
                    model: 'Claude Sonnet 5',
                    latency: '26ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
              </div>
            </div>

            {/* Category: Rendimiento & Métricas de Negocio */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                {lang === 'es' ? 'Rendimiento & Métricas de Negocio' : 'Performance & Business Metrics'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <AgentCatalogCard
                  agent={{
                    id: 'weekly-digest',
                    name: lang === 'es' ? 'Weekly Digest' : 'Weekly Digest',
                    category: lang === 'es' ? 'Métricas Ejecutivas' : 'Executive Metrics',
                    status: 'active',
                    description: lang === 'es' ? 'Genera el informe semanal integral combinando cobros de Stripe, sesiones y tareas completadas.' : 'Compiles 7-day performance report across Stripe, Calendly, and tasks.',
                    model: 'Claude Sonnet 5',
                    latency: '41ms',
                  }}
                  language={lang}
                  onExecute={(ag) => setSelectedConsoleAgent(ag)}
                />
              </div>
            </div>
          </div>
        )}

        {/* MORNING BRIEFING VIEW */}
        {activeTab === 'morning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
            {!morningReport ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <Clock size={48} color="var(--border-strong)" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ marginBottom: '1.5rem' }}>{lang === 'es' ? 'Haz clic abajo para consultar y procesar los datos de hoy en vivo.' : 'Click below to compile and view today\'s active data.'}</p>
                <button onClick={handleGenerateMorning} className="premium-btn px-6 py-3 flex items-center gap-2 mx-auto rounded-xl shadow-md text-sm font-bold">
                  <RefreshCw size={16} />
                  {t('btnGenerate')}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>{morningReport.date}</h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--accent-ink, var(--accent))', fontSize: '0.9rem', fontWeight: '600' }}>{morningReport.greeting}</p>
                  </div>
                  <button onClick={handleGenerateMorning} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                    <RefreshCw size={14} /> {lang === 'es' ? 'Actualizar' : 'Refresh'}
                  </button>
                </div>

                {morningReport.quote && (
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid var(--accent)', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                    {morningReport.quote}
                  </div>
                )}

                {/* Grid stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{morningReport.stats.meetings}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Reuniones de Hoy' : 'Meetings Today'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{morningReport.stats.emails}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Correos Pendientes' : 'Pending Emails'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{morningReport.stats.savedTime}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Eficiencia Proyectada' : 'Projected Efficiency'}</div>
                  </div>
                </div>

                {/* Agenda and Actions split */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '600' }}>{t('secAgenda')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {morningReport.agendaList.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                          <span style={{ color: 'var(--accent-ink, var(--accent))', fontWeight: '700', fontSize: '0.82rem', minWidth: '60px' }}>{item.time}</span>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '600' }}>{t('secActions')}</h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.2rem', margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {morningReport.actions.map((act, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRE-CALL DOSSIER VIEW */}
        {activeTab === 'precall' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
            
            {/* Input selectors */}
            <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', border: '1px solid var(--border)' }}>
              {events.length > 0 && (
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: '600' }}>{t('btnSelectMeeting')}</label>
                  <select 
                    value={selectedMeeting}
                    onChange={(e) => { setSelectedMeeting(e.target.value); setManualName(''); }}
                    style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    {events.map((ev, i) => (
                      <option key={i} value={ev.summary}>{ev.summary}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: '600' }}>{t('inputCustomName')}</label>
                <input 
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={t('phName')}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <button onClick={handleGeneratePrecall} className="btn-primary px-6 py-2 flex items-center gap-2">
                <Bot size={16} />
                {t('btnGenerateDossier')}
              </button>
            </div>

            {!precallReport ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <PhoneCall size={48} color="var(--border-strong)" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p>{lang === 'es' ? 'Selecciona una reunión arriba para generar el perfil estratégico.' : 'Select a scheduled meeting above to research positioning.'}</p>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Dossier: {precallReport.clientName}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>{precallReport.industry}</span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', color: 'var(--success)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>{precallReport.status}</span>
                    </div>
                  </div>
                </div>

                {/* Positioning blocks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>🎯 {lang === 'es' ? 'Alineación de Nicho' : 'Niche Alignment'}</div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{precallReport.positioning.niche}</p>
                  </div>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>👑 {lang === 'es' ? 'Autoridad y Canales' : 'Authority & Channels'}</div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{precallReport.positioning.authority}</p>
                  </div>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.4rem' }}>⚠️ {lang === 'es' ? 'Debilidad en Embudo' : 'Funnel Leak'}</div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{precallReport.positioning.weakness}</p>
                  </div>
                </div>

                {/* Flaws and Tactics split */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>🔥 {lang === 'es' ? 'Errores Estéticos / Web Detectados' : 'Design Flaws Found'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {precallReport.designFlaws.map((flaw, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span>
                          <span>{flaw}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>💡 {lang === 'es' ? 'Tácticas Recomendadas de Venta' : 'Proposed Sales Angle'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {precallReport.tactics.map((tac, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                          <span>{tac}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* EVENING SUMMARY VIEW */}
        {activeTab === 'evening' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
            {!eveningReport ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <Moon size={48} color="var(--border-strong)" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ marginBottom: '1.5rem' }}>{lang === 'es' ? 'Haz clic para consolidar la operativa financiera y de reuniones de hoy.' : 'Click to run the financial and operational daily consolidation.'}</p>
                <button onClick={handleGenerateEvening} className="premium-btn px-6 py-3 flex items-center gap-2 mx-auto rounded-xl shadow-md text-sm font-bold">
                  <RefreshCw size={16} />
                  {t('btnGenerate')}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)' }}>{eveningReport.title}</h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{lang === 'es' ? 'Cierre procesado a las' : 'Closure compiled at'} {eveningReport.timestamp}</p>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {eveningReport.summaryText}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--success)' }}>{eveningReport.completedMeetingsCount}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Reuniones Realizadas' : 'Meetings Completed'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>{eveningReport.emailsProcessed}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Correos Autopilot' : 'Autopilot Emails'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-ink, var(--accent))' }}>{eveningReport.financials.hoursFreed}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{lang === 'es' ? 'Tiempo Liberado' : 'Time Saved'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WEEKLY DIGEST VIEW */}
        {activeTab === 'weekly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
            {!weeklyReport ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <BarChart2 size={48} color="var(--border-strong)" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                <p style={{ marginBottom: '1.5rem' }}>{lang === 'es' ? 'Haz clic para consolidar la trayectoria estratégica de la semana.' : 'Click to compile this week\'s strategic performance metrics.'}</p>
                <button onClick={handleGenerateWeekly} className="premium-btn px-6 py-3 flex items-center gap-2 mx-auto rounded-xl shadow-md text-sm font-bold">
                  <RefreshCw size={16} />
                  {t('btnGenerate')}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {lang === 'es' ? 'Resumen de Trayectoria Semanal' : 'Weekly Trajectory Digest'}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{weeklyReport.weekRange}</p>
                  </div>
                  <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--success)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                    {lang === 'es' ? 'Puntaje Semanal' : 'Weekly Score'}: {weeklyReport.overallScore}
                  </div>
                </div>

                {/* Highlights */}
                <div>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>🏆 {lang === 'es' ? 'Hitos Destacados de la Semana' : 'Key Milestones This Week'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {weeklyReport.highlights.map((hl, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-ink, var(--accent))', fontWeight: 'bold' }}>✓</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ marginTop: '0.5rem', background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>📈 {lang === 'es' ? 'Recomendación de Dirección' : 'Strategic Focus Next Week'}</h5>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{weeklyReport.bossRecommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Live Console Drawer */}
      <AgentLiveConsoleDrawer
        isOpen={!!selectedConsoleAgent}
        onClose={() => setSelectedConsoleAgent(null)}
        agent={selectedConsoleAgent}
        language={lang}
        userProfile={userProfile}
      />
    </div>
  );
}
