// src/frontend/src/components/navigation/WorkspaceSwitcher.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building, Check, Settings, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export function WorkspaceSwitcher({ language = 'es', onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  const isEs = language === 'es';

  // Load user organizations
  useEffect(() => {
    let isMounted = true;

    async function loadOrgs() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setLoading(false);
          return;
        }

        // Get memberships
        const { data: memberships, error: memErr } = await supabase
          .from('organization_memberships')
          .select('role, organization_id, organizations (id, name, slug, plan_tier)')
          .eq('user_id', user.id);

        if (memErr) throw memErr;

        const orgList = (memberships || [])
          .map(m => ({
            id: m.organizations?.id || m.organization_id,
            name: m.organizations?.name || 'Mi Organización',
            slug: m.organizations?.slug || 'default',
            plan_tier: m.organizations?.plan_tier || 'pro',
            role: m.role || 'member'
          }))
          .filter(o => o.id);

        if (isMounted) {
          setOrganizations(orgList);
          const savedSlug = localStorage.getItem('coachdata_org_slug');
          const active = orgList.find(o => o.slug === savedSlug) || orgList[0] || {
            name: 'CoachData Workspace',
            slug: 'default',
            plan_tier: 'pro'
          };
          setCurrentOrg(active);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[WorkspaceSwitcher] Error loading organizations:', err.message);
        if (isMounted) {
          setCurrentOrg({ name: 'CoachData Workspace', slug: 'default', plan_tier: 'pro' });
          setLoading(false);
        }
      }
    }

    loadOrgs();

    return () => { isMounted = false; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectOrg = (org) => {
    localStorage.setItem('coachdata_org_slug', org.slug);
    setCurrentOrg(org);
    setIsOpen(false);
    // Reload active workspace view
    window.location.reload();
  };

  const getTierBadgeStyle = (tier = 'pro') => {
    const t = tier.toLowerCase();
    if (t === 'enterprise') {
      return {
        background: 'rgba(184, 152, 90, 0.18)',
        color: 'var(--accent-ink, var(--accent))',
        border: '1px solid rgba(184, 152, 90, 0.35)',
      };
    }
    if (t === 'pro') {
      return {
        background: 'rgba(34, 197, 94, 0.12)',
        color: 'var(--good, #22c55e)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
      };
    }
    return {
      background: 'var(--bg-muted)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    };
  };

  const orgInitials = (currentOrg?.name || 'D')
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px 4px 6px',
          borderRadius: 'var(--radius-md)',
          background: isOpen ? 'var(--bg-surface)' : 'transparent',
          border: '1px solid',
          borderColor: isOpen ? 'var(--border-strong)' : 'transparent',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = 'var(--border)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--accent-ink, var(--accent))',
            flexShrink: 0,
          }}
        >
          {orgInitials}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {currentOrg?.name || (isEs ? 'Organización' : 'Organization')}
          </span>
        </div>

        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '1px 5px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            ...getTierBadgeStyle(currentOrg?.plan_tier),
          }}
        >
          {currentOrg?.plan_tier || 'PRO'}
        </span>

        <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: '2px' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '240px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '6px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {isEs ? 'Espacios de Trabajo' : 'Workspaces'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {organizations.map((org) => {
              const isSelected = currentOrg?.slug === org.slug;
              return (
                <button
                  key={org.id || org.slug}
                  onClick={() => handleSelectOrg(org)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--bg-muted)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-root)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={14} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500 }}>
                      {org.name}
                    </span>
                  </div>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-ink, var(--accent))' }} />}
                </button>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

          <button
            onClick={() => {
              setIsOpen(false);
              if (onNavigate) onNavigate('settings');
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
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'left',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-root)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings size={14} style={{ color: 'var(--text-muted)' }} />
            <span>{isEs ? 'Configuración de Organización' : 'Organization Settings'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
