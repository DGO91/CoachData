// src/frontend/src/components/navigation/UnifiedTopBar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, ChevronRight, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { QuickActionMenu } from './QuickActionMenu';
import ThemePicker from '../common/ThemePicker';

export function UnifiedTopBar({
  currentTab,
  onNavigate,
  language = 'es',
  onToggleLanguage,
  theme,
  setTheme,
  userProfile,
  onLogout,
  onOpenCommandPalette,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  const isEs = language === 'es';

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarMenuOpen]);

  // Compute Breadcrumb Hierarchy
  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'CoachData OS', target: 'dashboard' }];

    switch (currentTab) {
      case 'dashboard':
        crumbs.push({ label: isEs ? 'Vista General' : 'Overview' });
        break;
      case 'agents-hub':
      case 'prospect':
      case 'email':
      case 'mail-responder':
      case 'pre-call-agent':
      case 'auto-plan':
      case 'weekly-digest':
      case 'auditor':
      case 'evening-summary':
      case 'personal-agent':
        crumbs.push({ label: isEs ? 'Centro de Agentes' : 'Agents Hub', target: 'agents-hub' });
        if (currentTab !== 'agents-hub') {
          const agentNames = {
            'prospect': 'Prospect Analyzer',
            'email': 'Email Organizer',
            'mail-responder': 'Mail Responder',
            'pre-call-agent': 'Pre-Call Intelligence',
            'auto-plan': 'Auto Plan Creator',
            'weekly-digest': 'Weekly Digest',
            'auditor': 'Auditor Agent',
            'evening-summary': 'Evening Summary',
            'personal-agent': 'Morning Briefing',
          };
          crumbs.push({ label: agentNames[currentTab] || currentTab });
        }
        break;
      case 'media-suite':
      case 'content-desk':
      case 'project-desk':
      case 'message-bank':
        crumbs.push({ label: 'Media Suite', target: 'media-suite' });
        if (currentTab === 'content-desk') crumbs.push({ label: 'Content Desk' });
        if (currentTab === 'project-desk') crumbs.push({ label: 'Project Desk' });
        if (currentTab === 'message-bank') crumbs.push({ label: isEs ? 'Banco de Mensajes' : 'Message Bank' });
        break;
      case 'revenue-suite':
      case 'phase1':
      case 'phase2':
      case 'phase6':
      case 'phase7':
      case 'billing-settings':
      case 'settings-billing':
        crumbs.push({ label: 'Revenue Suite', target: 'revenue-suite' });
        if (currentTab === 'phase1') crumbs.push({ label: 'Lead Hub' });
        if (currentTab === 'phase2') crumbs.push({ label: 'AI Revenue Chief' });
        if (currentTab === 'phase6') crumbs.push({ label: 'Call Intelligence' });
        if (currentTab === 'phase7') crumbs.push({ label: isEs ? 'Propuestas & Cobros' : 'Deals & Proposals' });
        if (currentTab === 'billing-settings' || currentTab === 'settings-billing') crumbs.push({ label: isEs ? 'Facturación' : 'Billing' });
        break;
      case 'client-portal':
      case 'client-workspace':
        crumbs.push({ label: isEs ? 'Portal de Clientes' : 'Client Portal', target: 'client-portal' });
        if (currentTab === 'client-workspace') crumbs.push({ label: isEs ? 'Espacio de Trabajo' : 'Client Workspace' });
        break;
      case 'reports-hub':
        crumbs.push({ label: isEs ? 'Informes IA' : 'AI Reports Hub' });
        break;
      case 'settings':
        crumbs.push({ label: isEs ? 'Bóveda & Ajustes' : 'Security Vault & Settings' });
        break;
      case 'profile':
        crumbs.push({ label: isEs ? 'Perfil' : 'Profile' });
        break;
      default:
        crumbs.push({ label: currentTab });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const displayName = userProfile?.name || userProfile?.email?.split('@')[0] || 'Coach';
  const roleName = userProfile?.role || 'Owner';

  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header
      style={{
        height: 'var(--topbar-height, 56px)',
        background: 'var(--bg-root)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
        position: 'relative',
      }}
    >
      {/* LEFT: Mobile Toggle + Workspace Switcher + Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
          className="menu-toggle"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Menu size={18} />
        </button>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher language={language} onNavigate={onNavigate} />

        <span style={{ color: 'var(--border-strong)', fontSize: '14px', margin: '0 2px' }}>/</span>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                {isLast ? (
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => crumb.target && onNavigate(crumb.target)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                      cursor: crumb.target ? 'pointer' : 'default',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (crumb.target) e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      if (crumb.target) e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* RIGHT: Search + LiveSync + QuickActions + Language + Theme + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Command Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          title={isEs ? 'Buscar o ejecutar comando (⌘K)' : 'Search or run command (⌘K)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: 'var(--bg-root)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ display: 'inline-block' }}>{isEs ? 'Buscar...' : 'Search...'}</span>
          <kbd
            style={{
              fontSize: '10px',
              fontWeight: 600,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Quick Action (+) Button */}
        <QuickActionMenu language={language} onNavigate={onNavigate} />

        {/* Language Switcher */}
        <button
          onClick={onToggleLanguage}
          title={isEs ? 'Cambiar Idioma' : 'Switch Language'}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          {language.toUpperCase()}
        </button>

        {/* Theme Picker */}
        <ThemePicker theme={theme} setTheme={setTheme} language={language} />

        {/* User Profile Pill & Dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 6px 2px 2px',
              borderRadius: '999px',
              background: avatarMenuOpen ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid',
              borderColor: avatarMenuOpen ? 'var(--border-strong)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!avatarMenuOpen) e.currentTarget.style.borderColor = 'var(--border)';
            }}
            onMouseLeave={(e) => {
              if (!avatarMenuOpen) e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(184, 152, 90, 0.18)',
                border: '1px solid rgba(184, 152, 90, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-ink, var(--accent))',
              }}
            >
              {initials}
            </div>
          </button>

          {avatarMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: '220px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '6px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1000,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {userProfile?.email}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--accent-ink, var(--accent))',
                    }}
                  >
                    {roleName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setAvatarMenuOpen(false);
                  onNavigate('profile');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-root)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{isEs ? 'Ver Perfil' : 'View Profile'}</span>
              </button>

              <button
                onClick={() => {
                  setAvatarMenuOpen(false);
                  onNavigate('settings');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-root)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <SettingsIcon size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{isEs ? 'Bóveda de Seguridad' : 'Security Vault'}</span>
              </button>

              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  setAvatarMenuOpen(false);
                  onLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--danger, #ef4444)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-root)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} />
                <span>{isEs ? 'Cerrar Sesión' : 'Log Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
