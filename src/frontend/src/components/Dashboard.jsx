import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  User, Settings, Bot, ArrowRight,
  CheckCircle, AlertCircle, Clock, Activity,
  Search, Mail, Send, Compass, PhoneCall, FileText, ShieldCheck, Cpu,
  RefreshCw, Wifi, WifiOff, Sunset, Key, Star, Inbox, Calendar,
  TrendingUp, ChevronDown, ChevronUp, Code, Zap
} from 'lucide-react';
import { authFetch } from '../core/api/authFetch';

/* ── Icon map — matches exactly the 9 SUBSYSTEMS in server.js ── */
const AGENT_ICONS = {
  prospect:           <Search size={24} />,
  email:              <Mail size={24} />,
  'mail-responder':   <Send size={24} />,
  steering:           <Compass size={24} />,
  'pre-call-agent':   <PhoneCall size={24} />,
  'evening-summary':  <Sunset size={24} />,
  'weekly-digest':    <Cpu size={24} />,
  'mail-responder':   <Mail size={24} />,
  'pre-call-briefing':<PhoneCall size={24} />,
  'morning-briefing': <Compass size={24} />,
  'knowledge-agent':  <Cpu size={24} />,
  'auto-plan':        <FileText size={24} />,
  auditor:            <ShieldCheck size={24} />,
  'personal-agent':   <User size={24} />,
};

const AGENT_DISPLAY_NAMES = {
  en: {
    prospect: 'Prospect Finder & Analyzer',
    email: 'Smart Inbox Organizer',
    'mail-responder': 'AI Mail Assistant',
    steering: 'Strategic Growth Diagnostics',
    'pre-call-agent': 'Meeting Preparation Brief',
    'evening-summary': 'Daily Performance Reporter',
    'weekly-digest': 'Weekly Performance Digest',
    'auto-plan': 'Client Plan Generator',
    'personal-agent': 'WhatsApp Briefing Hub',
    'knowledge-agent': 'Knowledge Assistant',
    auditor: 'System Health Auditor'
  },
  es: {
    prospect: 'Buscador y Analizador de Prospectos',
    email: 'Organizador de Bandeja',
    'mail-responder': 'Asistente de Respuestas de Email',
    steering: 'Diagnóstico de Crecimiento Estratégico',
    'pre-call-agent': 'Preparador de Reuniones',
    'evening-summary': 'Reportero Operativo Diario',
    'weekly-digest': 'Resumen Semanal de Métricas',
    'auto-plan': 'Generador de planes de cliente',
    'personal-agent': 'Conexión de Briefing WhatsApp',
    'knowledge-agent': 'Asistente de conocimiento',
    auditor: 'Auditor de Salud del Sistema'
  }
};

const AGENT_DESCRIPTIONS = {
  en: {
    prospect: 'Find and analyze high-value potential clients from any website with business intelligence.',
    email: 'Automatically classify and prioritize incoming emails based on your coaching rules.',
    'mail-responder': 'Draft intelligent and precise email replies to your clients via Gmail.',
    steering: 'Target market alignment, trajectory diagnostics, and premium guidance for coaches.',
    'pre-call-agent': 'Automatic dossiers for upcoming meetings by connecting CRM and Gmail.',
    'evening-summary': 'Financial and operational performance summary at the end of the day.',
    'weekly-digest': 'Weekly compilation and analysis of your key performance indicators.',
    'auto-plan': 'Generate strategic operations plans instantly from sales call transcripts.',
    auditor: 'Continuous uptime monitoring and auto-healing capabilities.',
    'personal-agent': 'Connect your calendars and receive your daily agenda directly on your mobile.',
    'knowledge-agent': 'Query your corporate knowledge base with immediate AI answers.'
  },
  es: {
    prospect: 'Encuentra y analiza clientes potenciales de cualquier sitio web con inteligencia de negocios.',
    email: 'Clasifica y prioriza automáticamente tus correos entrantes según tus reglas de coaching.',
    'mail-responder': 'Redacta respuestas automatizadas inteligentes y precisas a tus clientes por Gmail.',
    steering: 'Alineación de mercado objetivo, diagnóstico de trayectoria y guía premium para coaches.',
    'pre-call-agent': 'Dossier automático de tus próximas reuniones conectando CRM y Gmail.',
    'evening-summary': 'Resumen de desempeño financiero y operativo al cierre del día.',
    'weekly-digest': 'Recopilación y análisis de los indicadores clave de rendimiento de la semana.',
    'auto-plan': 'Genera planes de operaciones estratégicas instantáneamente a partir de transcripciones.',
    auditor: 'Monitoreo continuo del tiempo de actividad y capacidades de auto-recuperación.',
    'personal-agent': 'Conecta tus calendarios y recibe tu agenda del día directo en tu celular.',
    'knowledge-agent': 'Consulta tu base de conocimientos corporativa con respuestas inmediatas por IA.'
  }
};

/* ── Translations ── */
const T = {
  en: {
    greeting_morning:   'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening:   'Good evening',
    dashboard_sub:      "Your systems are being monitored in real time.",
    nav_title:          'Quick Navigation',
    profile:            'Profile',
    profile_desc:       'Your account details and personal information.',
    settings:           'Settings',
    settings_desc:      'Customize your workspace preferences.',
    agents:             'Agents',
    agents_desc:        'Access and manage all your AI agent systems.',
    credentials:        'Credentials',
    credentials_desc:   'Configure API keys and Google connection parameters.',
    stats_title:        'Live System Overview',
    active_agents:      'Active Agents',
    total_agents:       'Total Agents',
    system_health:      'System Health',
    agents_status_title:'Agent Status',
    go_to:              'Go to',
    all_systems:        'All Systems Operational',
    loading:            'Syncing…',
    online:             'Online',
    offline:            'Offline',
    checking:           'Checking…',
    last_updated:       'Updated',
    healthy:            'Healthy',
    degraded:           'Degraded',
    just_now:           'just now',
    seconds_ago:        's ago',
  },
  es: {
    greeting_morning:   'Buenos días',
    greeting_afternoon: 'Buenas tardes',
    greeting_evening:   'Buenas noches',
    dashboard_sub:      "Tus sistemas están siendo monitoreados en tiempo real.",
    nav_title:          'Navegación Rápida',
    profile:            'Perfil',
    profile_desc:       'Tus datos de cuenta e información personal.',
    settings:           'Configuración',
    settings_desc:      'Personaliza las preferencias de tu espacio de trabajo.',
    agents:             'Agentes',
    agents_desc:        'Accede y gestiona todos tus sistemas de agentes IA.',
    credentials:        'Credenciales',
    credentials_desc:   'Configura API keys y parámetros de conexión de Google.',
    stats_title:        'Resumen del Sistema en Vivo',
    active_agents:      'Agentes Activos',
    total_agents:       'Total Agentes',
    system_health:      'Salud del Sistema',
    agents_status_title:'Estado de los Agentes',
    go_to:              'Ir a',
    all_systems:        'Todos los Sistemas Operativos',
    loading:            'Sincronizando…',
    online:             'En línea',
    offline:            'Fuera de línea',
    checking:           'Verificando…',
    last_updated:       'Actualizado',
    healthy:            'Saludable',
    degraded:           'Degradado',
    just_now:           'ahora',
    seconds_ago:        's atrás',
  },
};

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(null);
  const prevRef = useRef(null);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const start = prevRef.current ?? 0;
    const end   = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(end)) { setDisplay(value); return; }
    prevRef.current = end;

    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display ?? '—'}</>;
}

export default function Dashboard({ onNavigate, language, userName, enabledAgents, isAdmin, userProfile }) {
  const t = (key) => T[language]?.[key] ?? T.en[key] ?? key;
  const [services,      setServices]      = useState([]);   // raw from /api/status
  const [loading,       setLoading]       = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [isOnline,      setIsOnline]      = useState(true);

  const [briefingData,  setBriefingData]  = useState(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [showTechConsole, setShowTechConsole] = useState(false);

  /* ── Fetch system status ── */
  const fetchStatus = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // Was fetch('/api/status') — that route doesn't exist, so it always fell
      // through to the SPA's index.html (200 OK, but not JSON), silently
      // failing res.json() and leaving Centro de Agentes stuck on "offline".
      // The real endpoint (agentRoutes.js, actually pings each subsystem port)
      // is /api/agents/status, mounted behind auth + tenant context.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/agents/status', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
        },
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setServices(data.services ?? []);
      setLastUpdated(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const fetchBriefing = async () => {
    try {
      const tenantId = userProfile?.id || 'default_tenant';
      const res = await authFetch(`/api/agents/morning-briefing/live/${tenantId}`);
      const data = await res.json();
      if (data.connected) {
        setBriefingData(data);
      }
    } catch (err) {
      console.error('Error fetching live morning briefing:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBriefing();
    const interval = setInterval(() => fetchStatus(), 10000); // every 10s
    return () => clearInterval(interval);
  }, []);

  /* ── Solo Agentes Operativos Interactivos (los de reportes van a Configuración) ── */
  const OPERATIONAL_INTERACTIVE_KEYS = ['prospect', 'auto-plan', 'email', 'mail-responder', 'knowledge-agent'];

  const filteredServices = services.filter(svc => OPERATIONAL_INTERACTIVE_KEYS.includes(svc.key));
  
  const sortedServices = [...filteredServices].sort((a, b) => {
    return OPERATIONAL_INTERACTIVE_KEYS.indexOf(a.key) - OPERATIONAL_INTERACTIVE_KEYS.indexOf(b.key);
  });

  const techServices = services.filter(svc => svc.key === 'auditor');

  const totalAgents  = services.length;                                 // dynamic
  const activeAgents = services.filter((s) => s.up).length;             // dynamic
  const healthPct    = totalAgents > 0
    ? Math.round((activeAgents / totalAgents) * 100)
    : null;

  /* ── Time-based greeting ── */
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting_morning');
    if (h < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  };

  const displayName = userName || (language === 'es' ? 'Usuario' : 'User');

  /* ── Last updated label ── */
  const updatedLabel = () => {
    if (!lastUpdated) return '';
    const secs = Math.round((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 5)  return t('just_now');
    return `${secs}${t('seconds_ago')}`;
  };

  /* ── Health color ── */
  const healthClass = healthPct === null
    ? ''
    : healthPct >= 80 ? 'up'
    : healthPct >= 50 ? 'warn'
    : 'down';

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in pt-6 pb-20">



      {/* ── Sección de Agentes de Coaching (Grid Principal) ── */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-panel-inner h-48 animate-pulse bg-bgMuted/50 border-borderColor/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedServices.map((svc) => {
              const isFeatured = svc.key === 'prospect' || svc.key === 'auto-plan';
              const nameText = AGENT_DISPLAY_NAMES[language]?.[svc.key] || svc.name;
              const descText = AGENT_DESCRIPTIONS[language]?.[svc.key] || svc.name;

              return (
                <div
                  key={svc.key}
                  className={`glass-panel-inner p-6 flex flex-col justify-between group cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                    isFeatured ? 'border border-[var(--color-gold)] shadow-md hover:shadow-xl bg-[linear-gradient(145deg,var(--bg-surface),rgba(201,162,39,0.05))]' : 'border border-borderColor hover:border-[var(--accent)] hover:shadow-lg'
                  }`}
                  onClick={() => {
                    if (svc.headless && svc.key !== 'personal-agent' && svc.key !== 'evening-summary') return onNavigate('welcome');
                    if (svc.key === 'knowledge-agent') return onNavigate('knowledge-base');
                    onNavigate(svc.key);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (svc.headless && svc.key !== 'personal-agent' && svc.key !== 'evening-summary') return onNavigate('welcome');
                      if (svc.key === 'knowledge-agent') return onNavigate('knowledge-base');
                      onNavigate(svc.key);
                    }
                  }}
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isFeatured ? 'bg-[var(--color-gold-muted)] text-[var(--color-gold)]' : 'bg-bgMuted text-[var(--accent)]'
                      }`}>
                        {AGENT_ICONS[svc.key] ?? <Bot size={24} />}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isFeatured && (
                          <span className="text-[9px] font-bold text-[var(--color-gold)] uppercase tracking-widest bg-[var(--color-gold-muted)] px-2.5 py-1 rounded-full border border-[var(--color-gold-muted)]">
                            {language === 'es' ? '★ Clave' : '★ Core'}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            {svc.up && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--success)' }}></span>}
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: svc.up ? 'var(--success)' : 'var(--danger)' }}></span>
                          </span>
                          <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{svc.up ? t('online') : t('offline')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-textMain mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{nameText}</h3>
                    <p className="text-sm text-textMuted leading-relaxed line-clamp-3 m-0 opacity-80">{descText}</p>
                  </div>
                  
                  <div className={`mt-6 flex items-center justify-between font-bold text-xs uppercase tracking-widest transition-opacity opacity-80 group-hover:opacity-100 ${
                    isFeatured ? 'text-[var(--color-gold)]' : 'text-[var(--accent)]'
                  }`}>
                    <span>{language === 'es' ? 'Abrir Asistente' : 'Open Assistant'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
