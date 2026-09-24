// src/frontend/src/components/navigation/DualRailSidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Layers,
  TrendingUp,
  Users,
  FileText,
  Settings as SettingsIcon
} from 'lucide-react';
import { useOrganizationSurfaces } from '../../hooks/useOrganizationSurfaces';

export function DualRailSidebar({
  currentTab,
  onNavigate,
  language = 'es',
  userProfile,
  isAdmin,
  theme = 'dark',
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout
}) {
  const isEs = language === 'es';

  // Qué zonas ve esta organización. Dashboard, Centro de Agentes y Reports Hub
  // son el núcleo del producto y siempre están; el resto se enciende y apaga
  // desde el Centro de Configuración.
  const { activa } = useOrganizationSurfaces();

  const MENU_ITEMS = [
    { key: 'dashboard', label: isEs ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
    { key: 'agents-hub', label: isEs ? 'Centro de Agentes' : 'Agents Hub', icon: Bot, aliasTabs: ['agents', 'prospect', 'email', 'mail-responder', 'pre-call-agent', 'auto-plan', 'evening-summary', 'weekly-digest', 'personal-agent', 'auditor'] },
    { key: 'media-suite', label: isEs ? 'Media Suite' : 'Media Suite', icon: Layers, aliasTabs: ['content-desk', 'project-desk', 'message-bank'] },
    { key: 'revenue-suite', label: isEs ? 'Revenue Suite' : 'Revenue Suite', icon: TrendingUp, aliasTabs: ['phase1', 'phase2', 'phase6', 'phase7', 'billing-settings'] },
    { key: 'client-portal', label: isEs ? 'Portal de Clientes' : 'Client Portal', icon: Users, aliasTabs: ['client-workspace'] },
    { key: 'reports-hub', label: isEs ? 'Reports Hub' : 'Reports Hub', icon: FileText },
  ].filter(item => activa(item.key));

  const initials = (userProfile?.name || 'D')
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const isTabActive = (item) => {
    if (currentTab === item.key) return true;
    if (item.aliasTabs && item.aliasTabs.includes(currentTab)) return true;
    return false;
  };

  return (
    <nav
      aria-label="Sidebar Navigation"
      style={{
        width: '64px',
        background: 'var(--bg-root, #0b110e)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0 16px',
        gap: '8px',
        flexShrink: 0,
        height: '100%',
        zIndex: 160,
      }}
    >
      {/* Primary Navigation Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center', flex: 1 }}>
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = isTabActive(item);

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              title={item.label}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--accent-ink, var(--accent))' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <Icon size={21} />
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: '-2px',
                    top: '12px',
                    bottom: '12px',
                    width: '3px',
                    borderRadius: '0 4px 4px 0',
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Rail Icons: Settings & Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title={isEs ? 'Configuración' : 'Settings'}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: (currentTab === 'settings' || currentTab === 'dev-portal') ? '1px solid var(--border)' : '1px solid transparent',
            background: (currentTab === 'settings' || currentTab === 'dev-portal') ? 'var(--bg-surface)' : 'transparent',
            color: (currentTab === 'settings' || currentTab === 'dev-portal') ? 'var(--accent-ink, var(--accent))' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          <SettingsIcon size={20} />
          {(currentTab === 'settings' || currentTab === 'dev-portal') && (
            <span
              style={{
                position: 'absolute',
                left: '-2px',
                top: '12px',
                bottom: '12px',
                width: '3px',
                borderRadius: '0 4px 4px 0',
                background: 'var(--accent)',
              }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          title={userProfile?.name || (isEs ? 'Perfil' : 'Profile')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: currentTab === 'profile' ? 'var(--accent)' : 'var(--bg-surface)',
            color: currentTab === 'profile' ? 'var(--accent-text, #ffffff)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            border: '2px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {initials}
        </button>
      </div>
    </nav>
  );
}

export default DualRailSidebar;
