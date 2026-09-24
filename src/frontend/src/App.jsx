import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, Bot, Lock, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Sections
import Dashboard from './components/Dashboard';
import { OperationalGoldDashboard } from './components/dashboard/OperationalGoldDashboard';
import Profile from './components/Profile';
import Settings from './components/Settings';
import DeveloperPortal from './components/DeveloperPortal';
import AuthGateway from './components/AuthGateway';
import OrganizationConfigurationCenter from './components/OrganizationConfigurationCenter';
import { DualRailSidebar } from './components/navigation/DualRailSidebar';
import { UnifiedTopBar } from './components/navigation/UnifiedTopBar';

// Agent panels & Eager Loaded Modules for Instant Zero-Latency Navigation
const Overview = React.lazy(() => import('./components/Overview'));
const AgentPanelWrapper = React.lazy(() => import('./components/AgentPanelWrapper'));
const ProspectAnalyzer = React.lazy(() => import('./components/ProspectAnalyzer'));
const EmailOrganizer = React.lazy(() => import('./components/EmailOrganizer'));
const MailResponder = React.lazy(() => import('./components/MailResponder'));
const PreCallAgent = React.lazy(() => import('./components/PreCallAgent'));
const AutoPlanCreator = React.lazy(() => import('./components/AutoPlanCreator'));
const WeeklyDigest = React.lazy(() => import('./components/WeeklyDigest'));
const AuditorAgent = React.lazy(() => import('./components/AuditorAgent'));
const EveningSummary = React.lazy(() => import('./components/EveningSummary'));
const MorningBriefingConfig = React.lazy(() => import('./components/MorningBriefingConfig'));
const AIReportsHub = React.lazy(() => import('./components/AIReportsHub'));

const ClientWorkspace = React.lazy(() => import('./components/client/ClientWorkspace'));
const ClientPortalHome = React.lazy(() => import('./components/client/ClientPortalHome'));
const CommandPalette = React.lazy(() => import('./components/command/CommandPalette'));
const RevenueSuite = React.lazy(() => import('./components/revenue/RevenueSuite'));
const BillingSettingsPage = React.lazy(() => import('./pages/settings/BillingSettingsPage'));
const PublicProposalPage = React.lazy(() => import('./pages/public/PublicProposalPage'));
const PlatformOverview = React.lazy(() => import('./components/platform/PlatformOverview'));

const KnowledgeBase = React.lazy(() => import('./components/KnowledgeBase'));
const LegalDocuments = React.lazy(() => import('./components/LegalDocuments'));
const MediaSuite = React.lazy(() => import('./components/MediaSuite'));
const MessageBank  = React.lazy(() => import('./components/MessageBank'));
const ProjectDesk  = React.lazy(() => import('./components/ProjectDesk'));
const ContentDesk  = React.lazy(() => import('./components/ContentDesk'));

// Core & Infrastructure
import { AGENT_KEYS, VALID_TABS, translate } from './core/constants/app.constants';
import { getAdminMenuItems, getClientMenuItems, getMenuItemsWithLock, canAccessTab } from './core/config/routes.config';
import { AuthProvider, useAuth } from './infrastructure/auth/AuthProvider';
import ToastContainer, { showToast } from './components/common/ToastContainer';
import ThemePicker from './components/common/ThemePicker';
import PublicLanding from './pages/PublicLanding';
import ErrorBoundary from './components/common/ErrorBoundary';
import { NotificationsProvider, useNotifications } from './components/common/Notifications';

// Interruptor de la landing pública.
//
// En false, la raíz `/` entra directamente al login y `PublicLanding` queda
// inalcanzable: ninguna ruta resuelve ya a 'landing'. El componente sigue
// compilado y en el repositorio, intacto — publicarla de nuevo es poner esto
// en true y desplegar, sin tocar nada más.
const LANDING_PUBLICA = false;
const INICIO_PUBLICO = LANDING_PUBLICA ? 'landing' : 'login';

function AppContent() {
  const { notify } = useNotifications();
  const getInitialTab = () => {
    const path = window.location.pathname.replace(/^\/+/, '').split('?')[0].split('#')[0];
    if (!path || path === '') return INICIO_PUBLICO;
    if (path === 'login') return 'login';
    return VALID_TABS.includes(path) ? path : INICIO_PUBLICO;
  };

  const { sessionUser, userProfile, authChecked, supabaseClient, handleLogout } = useAuth();

  const [currentTab, setCurrentTab] = useState(getInitialTab());
  const [theme, setTheme] = useState(userProfile?.theme || localStorage.getItem('coachdata_theme') || 'dark');
  const [language, setLanguage] = useState(userProfile?.language || localStorage.getItem('coachdata_lang') || 'es');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [apiLatency, setApiLatency] = useState(32);

  useEffect(() => {
    const interval = setInterval(() => {
      setApiLatency(Math.floor(28 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // CoachData glass layer: drive the 8-theme system via <html data-theme="…">.
    // Legacy values map through: 'light' → clean palette, 'dark' → forest palette.
    document.documentElement.dataset.theme = theme;
    // keep the old body flag so any legacy .dark-theme rules still apply in dark palettes
    document.body.classList.toggle('dark-theme', theme === 'dark' || theme === 'forest');
    localStorage.setItem('coachdata_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('coachdata_lang', language);
  }, [language]);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'get-initial-state') {
        e.source.postMessage({ type: 'theme-change', theme }, '*');
        e.source.postMessage({ type: 'lang-change', lang: language }, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [theme, language]);

  useEffect(() => {
    const isPublicRoute = currentTab === 'landing' || currentTab === 'login';
    if (isPublicRoute) {
      document.body.classList.remove('app-active');
    } else {
      document.body.classList.add('app-active');
    }

    const newPath = currentTab === INICIO_PUBLICO ? '/' : `/${currentTab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab: currentTab }, '', newPath + window.location.search);
    }
    const container = document.querySelector('.view-container');
    if (container) {
      container.scrollTop = 0;
    }
  }, [currentTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').split('?')[0].split('#')[0] || INICIO_PUBLICO;
      // No se acepta 'landing' aquí: con LANDING_PUBLICA en false, un atrás/adelante
      // hacia /landing era la única vía que quedaba para renderizarla.
      if (path === INICIO_PUBLICO || path === 'login' || VALID_TABS.includes(path)) {
        setCurrentTab(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (window.location.search.includes('google=success')) {
      notify(language === 'es'
        ? '¡Cuenta de Google conectada exitosamente! Los agentes ya tienen acceso a tu calendario y correo.'
        : 'Google account connected successfully! Agents now have access to your calendar and email.',
        { type: 'success' });
      const params = new URLSearchParams(window.location.search);
      params.delete('google');
      const cleanSearch = params.toString();
      const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState(null, '', newUrl);
    }
  }, [language]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transition-disable');
    setTheme((p) => (p === 'light' ? 'dark' : 'light'));
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition-disable');
    }, 50);
  };
  const toggleLanguage = () => setLanguage((p) => (p === 'es' ? 'en' : 'es'));

  const handleNavigate = (tabKey, isLocked = false) => {
    if (isLocked) {
      notify(language === 'es'
        ? 'Módulo bloqueado: contacta a tu account manager para desbloquear esta función premium.'
        : 'Module locked: contact your account manager to unlock this premium feature.',
        { type: 'warning' });
      return;
    }
    setCurrentTab(tabKey === 'agents' ? 'welcome' : tabKey);
    setMobileMenuOpen(false);
  };

  const isAdmin = userProfile?.role === 'Administrator';
  // Ambito de almacenamiento local de Media Suite. Dos admins de la misma
  // empresa comparten slug -> comparten tablero; cada cliente tiene el suyo.
  const orgScope = localStorage.getItem('coachdata_org_slug') || userProfile?.email || 'anon';
  const mainMenuItems = isAdmin ? getAdminMenuItems(language) : getClientMenuItems(language);
  const enabledAgents = userProfile?.enabled_agents || AGENT_KEYS.concat(['phase1', 'phase2', 'phase6', 'phase7']);
  const processedMenuItems = getMenuItemsWithLock(mainMenuItems, isAdmin, enabledAgents);

  const getHeaderTitle = () => {
    const active = processedMenuItems.find((i) => i.key === currentTab);
    return active ? active.label : translate(language, 'dashboard');
  };

  const displayName = userProfile?.name || (language === 'es' ? 'Usuario' : 'User');
  const initials = displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const isAgentTab = AGENT_KEYS.includes(currentTab);

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cargando...</div>
      </div>
    );
  }

  // Handle Public Proposal Routing (/p/:token)
  if (window.location.pathname.startsWith('/p/')) {
    const token = window.location.pathname.replace('/p/', '');
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">Cargando propuesta...</div>}>
        <PublicProposalPage token={token} />
      </React.Suspense>
    );
  }

  // Puente de mando de la agencia (/platform).
  //
  // No es una pestaña del producto: enseña varios clientes a la vez y no debe
  // aparecer en el menú de ningún coach. Va por URL directa, y el backend
  // deniega con 403 a quien no esté en PLATFORM_ADMIN_USER_IDS — la ruta oculta
  // es comodidad, no la protección.
  if (window.location.pathname.startsWith('/platform')) {
    if (!sessionUser) {
      return <AuthGateway language={language} onAuthenticated={() => window.location.reload()} />;
    }
    return (
      <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-muted)' }}>Cargando…</div>}>
        <PlatformOverview language={language} />
      </React.Suspense>
    );
  }

  // Handle Landing Page routing first, bypass Auth checking
  if (currentTab === 'landing') {
    if (sessionUser) {
      setTimeout(() => setCurrentTab('dashboard'), 0);
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-root)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingresando al portal...</div>
        </div>
      );
    }
    return (
      <PublicLanding 
        language={language} 
        onToggleLanguage={toggleLanguage} 
        onNavigate={handleNavigate}
      />
    );
  }

  if (supabaseClient && !sessionUser) {
    if (['terms', 'privacy', 'security', 'data-deletion'].includes(currentTab)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-root)', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <LegalDocuments isOpen={true} type={currentTab} language={language} isPage={true} />
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setCurrentTab(INICIO_PUBLICO)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <AuthGateway 
        language={language}
        onAuthSuccess={() => setCurrentTab('dashboard')}
        onBackToHome={() => setCurrentTab(INICIO_PUBLICO)}
      />
    );
  }

  // If logged in and explicitly trying to reach login page, redirect to dashboard
  if (currentTab === 'login') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Redirigiendo...</div>
        {(() => {
          setTimeout(() => setCurrentTab('dashboard'), 100);
          return null;
        })()}
      </div>
    );
  }

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <UnifiedTopBar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        language={language}
        onToggleLanguage={toggleLanguage}
        theme={theme}
        setTheme={setTheme}
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - var(--topbar-height))', overflow: 'hidden', position: 'relative' }}>
        <DualRailSidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          language={language}
          userProfile={userProfile}
          isAdmin={isAdmin}
          theme={theme}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onLogout={handleLogout}
        />

        <main className="main-content">
          <div className={`view-container ${['media-suite', 'revenue-suite', 'project-desk', 'content-desk', 'message-bank'].includes(currentTab) ? 'media-suite-view' : ''}`}>
          <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Cargando módulo...</div>}>
            {currentTab === 'dashboard' && <OperationalGoldDashboard theme={theme} language={language} userProfile={userProfile} onNavigate={handleNavigate} />}
            {currentTab === 'agents-hub' && <Dashboard onNavigate={handleNavigate} language={language} theme={theme} userProfile={userProfile} />}
            {currentTab === 'profile' && <Profile language={language} userProfile={userProfile} />}
            {(currentTab === 'settings' || currentTab === 'credentials') && (
              <OrganizationConfigurationCenter language={language} userProfile={userProfile} isAdmin={isAdmin} initialTab={currentTab === 'credentials' ? 'vault' : undefined} />
            )}
            {currentTab === 'dev-portal' && isAdmin && <DeveloperPortal language={language} />}
            {currentTab === 'knowledge-base' && <KnowledgeBase language={language} />}
            {currentTab === 'welcome' && <Overview language={language} onNavigate={handleNavigate} translate={(k) => translate(language, k)} />}
            {currentTab === 'reports-hub' && <AIReportsHub language={language} userProfile={userProfile} />}
            
            {currentTab === 'terms' && <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}><LegalDocuments isOpen={true} type="terms" language={language} isPage={true} /></div>}
            {currentTab === 'privacy' && <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}><LegalDocuments isOpen={true} type="privacy" language={language} isPage={true} /></div>}
            {currentTab === 'security' && <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}><LegalDocuments isOpen={true} type="security" language={language} isPage={true} /></div>}
            {currentTab === 'data-deletion' && <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}><LegalDocuments isOpen={true} type="data-deletion" language={language} isPage={true} /></div>}
            
            {/* Media Suite es para todos; lo que cambia por cuenta son los datos
                (orgScope) y si se siembra contenido de ejemplo (allowSeed). */}
            {currentTab === 'media-suite' && <MediaSuite language={language} theme={theme} orgScope={orgScope} allowSeed={isAdmin} />}
            {currentTab === 'prospect' && <ProspectAnalyzer language={language} />}
            {currentTab === 'message-bank'  && <MediaSuite language={language} theme={theme} initialSubTab="message-bank" orgScope={orgScope} allowSeed={isAdmin} />}
            {currentTab === 'project-desk'  && <MediaSuite language={language} theme={theme} initialSubTab="project-desk" orgScope={orgScope} allowSeed={isAdmin} />}
            {currentTab === 'content-desk'  && <MediaSuite language={language} theme={theme} initialSubTab="content-desk" orgScope={orgScope} allowSeed={isAdmin} />}
            {!canAccessTab(currentTab, isAdmin) && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '14px' }}>
                  {language === 'es'
                    ? 'Esta sección no está disponible para tu cuenta.'
                    : 'This section is not available for your account.'}
                </p>
              </div>
            )}
            {currentTab === 'email' && <EmailOrganizer theme={theme} language={language} />}
            {currentTab === 'mail-responder' && <MailResponder language={language} theme={theme} />}
            {currentTab === 'pre-call-agent' && <PreCallAgent language={language} />}
            {currentTab === 'auto-plan' && <AutoPlanCreator language={language} />}
            {currentTab === 'weekly-digest' && <WeeklyDigest language={language} userProfile={userProfile} />}
            {currentTab === 'auditor' && <AuditorAgent language={language} />}
            {currentTab === 'evening-summary' && <EveningSummary language={language} />}
            {currentTab === 'personal-agent' && <MorningBriefingConfig language={language} userProfile={userProfile} />}

            {currentTab === 'revenue-suite' && <RevenueSuite language={language} theme={theme} />}
            {(currentTab === 'billing-settings' || currentTab === 'settings-billing') && <BillingSettingsPage language={language} />}
            {currentTab === 'phase1' && <RevenueSuite language={language} theme={theme} initialSubTab="lead-hub" />}
            {currentTab === 'phase2' && <RevenueSuite language={language} theme={theme} initialSubTab="ai-revenue-chief" />}
            {currentTab === 'phase6' && <RevenueSuite language={language} theme={theme} initialSubTab="call-intelligence" />}
            {currentTab === 'phase7' && <RevenueSuite language={language} theme={theme} initialSubTab="deals-and-proposals" />}
            {currentTab === 'client-workspace' && <ClientWorkspace language={language} />}
            {currentTab === 'client-portal' && <ClientPortalHome language={language} />}

            {isAgentTab && !['welcome', 'prospect', 'email', 'mail-responder', 'pre-call-agent', 'weekly-digest', 'auto-plan', 'auditor', 'evening-summary', 'personal-agent'].includes(currentTab) && (
              <AgentPanelWrapper serviceKey={currentTab} theme={theme} language={language} />
            )}
          </React.Suspense>
        </div>
      </main>
    </div>

    {/* Enterprise Global Notifications */}
    <ToastContainer />

    <CommandPalette
      isOpen={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      onNavigate={handleNavigate}
    />
  </div>
);
}

export default function App() {
  const [language, setLanguage] = useState(localStorage.getItem('coachdata_lang') || 'es');
  
  return (
    <ErrorBoundary>
      <NotificationsProvider language={language}>
        <AuthProvider language={language} onLogout={() => window.location.href = '/'}>
          <AppContent />
        </AuthProvider>
      </NotificationsProvider>
    </ErrorBoundary>
  );
}
