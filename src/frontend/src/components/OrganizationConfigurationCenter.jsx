import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Lock,
  Settings,
  Cpu,
  CreditCard,
  Database,
  Mail,
  RefreshCw,
  CheckCircle,
  Save,
  Share2,
  Bot,
  Layers
} from 'lucide-react';
import ActiveSurfacesPanel from './settings/ActiveSurfacesPanel';
import Credentials from './Credentials';
import AISettingsPage from '../pages/settings/AISettingsPage';
const BillingSettingsPage = React.lazy(() => import('../pages/settings/BillingSettingsPage'));
import AutomationsControlPanel from './settings/AutomationsControlPanel';
import { AgentSchedulesSettings } from './settings/AgentSchedulesSettings';
import { supabase } from '../supabaseClient';
import { InputField, SelectField } from './common/FormInputs';
import DataTable from './common/DataTable';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
  };
}

export default function OrganizationConfigurationCenter({ language = 'es', userProfile, isAdmin, initialTab }) {
  const getStartingTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) return tabParam;
    if (initialTab) return initialTab;
    return 'profile';
  };
  const [activeTab, setActiveTab] = useState(getStartingTab);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Step state for Onboarding wizard
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Profile data state — defaults only fill the form while the real values load.
  const [orgProfile, setOrgProfile] = useState({
    name: '',
    industry: 'Marketing',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
    currency: 'EUR',
    language: 'es'
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organization/me', { headers: await authHeaders() });
        if (!res.ok) throw new Error(`Failed to load organization profile (${res.status})`);
        const data = await res.json();
        setOrgProfile((prev) => ({
          name: data.name || prev.name,
          industry: data.industry || prev.industry,
          timezone: data.timezone || prev.timezone,
          currency: data.currency || prev.currency,
          language: data.language || prev.language,
        }));
      } catch (err) {
        console.error(err);
        setErrorMsg(language === 'es' ? 'No se pudo cargar el perfil de la organización.' : 'Could not load the organization profile.');
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (activeTab !== 'team' || members.length > 0 || !loadingMembers) return;
    (async () => {
      try {
        const res = await fetch('/api/organization/members', { headers: await authHeaders() });
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        setMembers(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [activeTab]);

  // Invitations — generate a code+role, share it manually (no email infra in
  // this project), the invited person redeems it themselves once logged in.
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [newInviteRole, setNewInviteRole] = useState('member');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');

  useEffect(() => {
    if (activeTab !== 'team' || !isAdmin || invitations.length > 0 || !loadingInvitations) return;
    (async () => {
      try {
        const res = await fetch('/api/organization/invitations', { headers: await authHeaders() });
        if (!res.ok) throw new Error(`Failed to load invitations (${res.status})`);
        setInvitations(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInvitations(false);
      }
    })();
  }, [activeTab, isAdmin]);

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const res = await fetch('/api/organization/invitations', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ role: newInviteRole }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const invite = await res.json();
      setInvitations((prev) => [invite, ...prev]);
    } catch (err) {
      console.error(err);
      setErrorMsg(language === 'es' ? 'No se pudo crear la invitación.' : 'Could not create the invitation.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (id) => {
    try {
      const res = await fetch(`/api/organization/invitations/${id}`, { method: 'DELETE', headers: await authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg(language === 'es' ? 'No se pudo revocar la invitación.' : 'Could not revoke the invitation.');
    }
  };

  const handleRedeemCode = async () => {
    const code = redeemCodeInput.trim();
    if (!code) return;
    setRedeeming(true);
    setRedeemMsg('');
    try {
      const res = await fetch('/api/org-invitations/redeem', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRedeemMsg(language === 'es' ? '¡Te uniste a la organización! Recarga la página.' : 'Joined the organization! Reload the page.');
      setRedeemCodeInput('');
    } catch (err) {
      setRedeemMsg(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  // Pipeline stages — real, backed by organizations.settings_json.pipeline_stages
  const [stages, setStages] = useState([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [savingStages, setSavingStages] = useState(false);
  const [newStageInput, setNewStageInput] = useState('');

  useEffect(() => {
    if (activeTab !== 'integrations' || stages.length > 0 || !loadingStages) return;
    (async () => {
      try {
        const res = await fetch('/api/organization/pipeline-stages', { headers: await authHeaders() });
        if (!res.ok) throw new Error(`Failed to load pipeline stages (${res.status})`);
        const data = await res.json();
        setStages(data.stages || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStages(false);
      }
    })();
  }, [activeTab]);

  const savePipelineStages = async (nextStages) => {
    setSavingStages(true);
    try {
      const res = await fetch('/api/organization/pipeline-stages', {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ stages: nextStages }),
      });
      if (!res.ok) throw new Error(`Failed to save (${res.status})`);
      const data = await res.json();
      setStages(data.stages);
    } catch (err) {
      console.error(err);
      setErrorMsg(language === 'es' ? 'No se pudieron guardar los estados de pipeline.' : 'Could not save pipeline stages.');
    } finally {
      setSavingStages(false);
    }
  };

  const handleAddStage = () => {
    const trimmed = newStageInput.trim();
    if (!trimmed) return;
    savePipelineStages([...stages, trimmed]);
    setNewStageInput('');
  };

  const handleRemoveStage = (index) => {
    if (stages.length <= 1) return;
    savePipelineStages(stages.filter((_, i) => i !== index));
  };

  // Data export
  const [exporting, setExporting] = useState(false);
  const handleExportWorkspace = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/organization/export', { headers: await authHeaders() });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coachdata-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorMsg(language === 'es' ? 'No se pudo exportar el workspace.' : 'Could not export the workspace.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/organization/me', {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(orgProfile),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setSuccessMsg(language === 'es' ? '¡Perfil guardado con éxito!' : 'Profile saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(language === 'es' ? 'No se pudo guardar el perfil.' : 'Could not save the profile.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: language === 'es' ? 'Perfil de Empresa' : 'Company Profile', icon: Building },
    { id: 'surfaces', label: language === 'es' ? 'Zonas Activas' : 'Active Areas', icon: Layers },
    { id: 'team', label: language === 'es' ? 'Equipo y Roles' : 'Team & Roles', icon: Users },
    { id: 'vault', label: language === 'es' ? 'Bóveda de Seguridad' : 'Security Vault', icon: Lock },
    { id: 'integrations', label: language === 'es' ? 'Integraciones CRM' : 'Revenue Integrations', icon: Settings },
    { id: 'schedules', label: language === 'es' ? 'Agentes & Reportes IA' : 'AI Agent Schedules', icon: Bot },
    { id: 'automations', label: language === 'es' ? 'Webhooks & Salida' : 'Outbound Webhooks', icon: Share2 },
    { id: 'ai', label: language === 'es' ? 'Modelos de IA' : 'AI Providers', icon: Cpu },
    { id: 'billing', label: language === 'es' ? 'Suscripción' : 'Billing & Payments', icon: CreditCard },
    { id: 'backup', label: language === 'es' ? 'Datos y Respaldos' : 'Data & Backup', icon: Database }
  ];

  // Official catalogs
  const industries = [
    { id: 'Marketing', es: 'Marketing y Publicidad', en: 'Marketing & Advertising' },
    { id: 'SaaS', es: 'Software como Servicio (SaaS)', en: 'Software as a Service (SaaS)' },
    { id: 'Coaching', es: 'Coaching y Educación', en: 'Coaching & Education' },
    { id: 'RealEstate', es: 'Bienes Raíces', en: 'Real Estate' },
    { id: 'Ecommerce', es: 'Comercio Electrónico', en: 'E-commerce' },
    { id: 'Legal', es: 'Servicios Legales', en: 'Legal Services' },
    { id: 'Healthcare', es: 'Salud y Medicina', en: 'Healthcare & Medicine' },
    { id: 'Finance', es: 'Servicios Financieros', en: 'Financial Services' },
    { id: 'Consulting', es: 'Consultoría de Negocios', en: 'Business Consulting' },
    { id: 'Technology', es: 'Tecnología e IT', en: 'Technology & IT' }
  ];

  const timezones = [
    { id: 'Europe/Madrid', label: 'Europe/Madrid (CET)' },
    { id: 'America/New_York', label: 'America/New_York (EST)' },
    { id: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { id: 'America/Mexico_City', label: 'America/Mexico_City (CST)' },
    { id: 'America/Bogota', label: 'America/Bogota (EST)' },
    { id: 'America/Argentina/Buenos_Aires', label: 'America/Buenos_Aires (ART)' },
    { id: 'UTC', label: 'Coordinated Universal Time (UTC)' }
  ];

  const currencies = [
    { id: 'EUR', label: 'Euro (EUR — €)' },
    { id: 'USD', label: 'US Dollar (USD — $)' },
    { id: 'GBP', label: 'Pound Sterling (GBP — £)' },
    { id: 'MXN', label: 'Mexican Peso (MXN — $)' },
    { id: 'COP', label: 'Colombian Peso (COP — $)' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* Header Panel */}
      <div className="glass-panel-inner p-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
          {language === 'es' ? 'Centro de Configuración de Organización' : 'Organization Configuration Center'}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">
          {language === 'es' 
            ? 'Controla los parámetros de tu empresa, gestiona los accesos del equipo y administra las credenciales seguras del Security Vault.'
            : 'Configure your company details, manage team roles and administer secure integrations in the Security Vault.'}
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(74, 222, 128, 0.12)', border: '1px solid #4ade80', borderRadius: '12px', color: '#4ade80', fontSize: '13px', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '1rem', background: 'var(--crit-bg, rgba(239, 68, 68, 0.12))', border: '1px solid var(--crit, #ef4444)', borderRadius: '12px', color: 'var(--crit, #ef4444)', fontSize: '13px', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {/* Horizontal Sub-nav Pill Bar (Option 1 - Clean, Balanced, Full-Width) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          padding: '6px 8px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'var(--accent-text, #ffffff)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area (Full Width) */}
      <div className="glass-panel-inner p-8 w-full">
          
          {/* TAB: Profile */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="text-lg font-bold text-textMain">{language === 'es' ? 'Información General' : 'General Info'}</h3>
              {loadingProfile ? (
                <div className="text-sm text-textMuted">{language === 'es' ? 'Cargando…' : 'Loading…'}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label={language === 'es' ? 'Nombre de la Organización' : 'Organization Name'}
                    type="text"
                    value={orgProfile.name}
                    onChange={(e) => setOrgProfile({ ...orgProfile, name: e.target.value })}
                  />
                  <SelectField
                    label={language === 'es' ? 'Industria' : 'Industry'}
                    value={orgProfile.industry}
                    onChange={(e) => setOrgProfile({ ...orgProfile, industry: e.target.value })}
                  >
                    {industries.map(ind => (
                      <option key={ind.id} value={ind.id}>{language === 'es' ? ind.es : ind.en}</option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={language === 'es' ? 'Zona Horaria' : 'Timezone'}
                    value={orgProfile.timezone}
                    onChange={(e) => setOrgProfile({ ...orgProfile, timezone: e.target.value })}
                  >
                    {timezones.map(tz => (
                      <option key={tz.id} value={tz.id}>{tz.label}</option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={language === 'es' ? 'Moneda Principal' : 'Currency'}
                    value={orgProfile.currency}
                    onChange={(e) => setOrgProfile({ ...orgProfile, currency: e.target.value })}
                  >
                    {currencies.map(cur => (
                      <option key={cur.id} value={cur.id}>{cur.label}</option>
                    ))}
                  </SelectField>
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={saving || loadingProfile}
                className="btn-primary mt-2 flex items-center justify-center gap-2"
                style={{ width: 'fit-content', padding: '0.65rem 1.5rem', borderRadius: '8px' }}
              >
                <Save size={16} />
                {saving ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
              </button>
            </div>
          )}

          {/* TAB: Zonas Activas */}
          {activeTab === 'surfaces' && (
            <ActiveSurfacesPanel language={language} isAdmin={isAdmin} />
          )}

          {/* TAB: Team */}
          {activeTab === 'team' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="text-lg font-bold text-textMain">{language === 'es' ? 'Miembros del Equipo' : 'Team Members'}</h3>
              {loadingMembers ? (
                <div className="text-sm text-textMuted">{language === 'es' ? 'Cargando…' : 'Loading…'}</div>
              ) : (
                // No hay columna de estado: `organization_memberships` no guarda
                // ninguno. En su lugar va la fecha de alta, que sí existe.
                <DataTable
                  ariaLabel={language === 'es' ? 'Miembros del equipo' : 'Team members'}
                  rows={members}
                  getRowId={(m) => m.userId}
                  defaultSort={{ column: 'name', direction: 'ascending' }} // governance-allow: invalid-style-prop — descriptor de orden, no un objeto de estilo
                  minWidth="560px"
                  emptyState={
                    <div className="text-sm text-textMuted">
                      {language === 'es' ? 'No se encontraron miembros.' : 'No members found.'}
                    </div>
                  }
                  columns={[
                    {
                      id: 'name',
                      label: language === 'es' ? 'Nombre' : 'Name',
                      sortable: true,
                      sortValue: (m) => m.name || m.email || m.userId,
                      render: (m) => (
                        <span style={{ fontWeight: 700 }}>{m.name || m.email || m.userId}</span>
                      ),
                    },
                    {
                      id: 'role',
                      label: language === 'es' ? 'Rol' : 'Role',
                      sortable: true,
                      render: (m) => (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '999px',
                          background: 'var(--bg-muted)', color: 'var(--accent-ink, var(--accent))',
                        }}>
                          {m.role}
                        </span>
                      ),
                    },
                    {
                      id: 'joinedAt',
                      label: language === 'es' ? 'Se unió' : 'Joined',
                      sortable: true,
                      render: (m) => (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {m.joinedAt
                            ? new Date(m.joinedAt).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                            : '—'}
                        </span>
                      ),
                    },
                    {
                      id: 'email',
                      label: 'Email',
                      sortable: true,
                      render: (m) => <span style={{ color: 'var(--text-muted)' }}>{m.email || '—'}</span>,
                    },
                  ]}
                />
              )}

              {isAdmin && (
                <div className="flex flex-col gap-3 pt-4 border-t border-borderColor/50">
                  <label className="text-xs text-textMuted font-bold uppercase">{language === 'es' ? 'Invitar Miembro' : 'Invite Member'}</label>
                  <div className="flex gap-2">
                    <select
                      value={newInviteRole}
                      onChange={(e) => setNewInviteRole(e.target.value)}
                      className="bg-bgMuted border border-borderColor rounded-xl px-4 py-2.5 text-sm outline-none text-textMain"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="member">Member</option>
                      <option value="client_guest">Client Guest</option>
                    </select>
                    <button
                      onClick={handleCreateInvite}
                      disabled={creatingInvite}
                      className="btn-primary px-4 rounded-lg text-sm disabled:opacity-50"
                    >
                      {creatingInvite ? (language === 'es' ? 'Generando…' : 'Generating…') : (language === 'es' ? 'Generar código' : 'Generate code')}
                    </button>
                  </div>

                  {!loadingInvitations && invitations.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between gap-2 p-2.5 border border-borderColor rounded-lg bg-bgMuted text-sm">
                          <span className="font-mono font-bold text-textMain">{inv.code}</span>
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-md font-bold uppercase">{inv.role}</span>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-xs text-textMuted hover:text-red-500 font-bold uppercase"
                          >
                            {language === 'es' ? 'Revocar' : 'Revoke'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-textMuted">
                    {language === 'es'
                      ? 'Comparte el código manualmente (WhatsApp, email). Quien lo reciba debe pegarlo en "Canjear código" abajo, ya logueado.'
                      : 'Share the code manually (WhatsApp, email). The recipient must paste it under "Redeem code" below, once logged in.'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 border-t border-borderColor/50">
                <label className="text-xs text-textMuted font-bold uppercase">{language === 'es' ? 'Canjear Código' : 'Redeem Code'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={redeemCodeInput}
                    onChange={(e) => setRedeemCodeInput(e.target.value)}
                    placeholder="INV-XXXXXXXX"
                    className="flex-1 bg-bgMuted border border-borderColor rounded-xl px-4 py-2.5 text-sm outline-none text-textMain font-mono"
                  />
                  <button
                    onClick={handleRedeemCode}
                    disabled={redeeming || !redeemCodeInput.trim()}
                    className="btn-secondary px-4 rounded-lg text-sm disabled:opacity-50"
                  >
                    {redeeming ? (language === 'es' ? 'Uniendo…' : 'Joining…') : (language === 'es' ? 'Unirme' : 'Join')}
                  </button>
                </div>
                {redeemMsg && <p className="text-xs text-textMuted">{redeemMsg}</p>}
              </div>
            </div>
          )}

          {/* TAB: Security Vault */}
          {activeTab === 'vault' && (
            <div className="animate-fade-in">
              <Credentials language={language} userProfile={userProfile} isAdmin={isAdmin} />
            </div>
          )}

          {/* TAB: CRM Integrations — stages were local-only display, no save.
              Now real: read/write organizations.settings_json.pipeline_stages. */}
          {activeTab === 'integrations' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="text-lg font-bold text-textMain">{language === 'es' ? 'Pipeline y Estados de Venta' : 'Pipeline & Sales Stages'}</h3>
              <div className="flex flex-col gap-3">
                <label className="text-xs text-textMuted font-bold uppercase">{language === 'es' ? 'Estados de Negocio (LeadHub Ingestion)' : 'Deal Pipeline Stages'}</label>
                {loadingStages ? (
                  <div className="text-sm text-textMuted">{language === 'es' ? 'Cargando…' : 'Loading…'}</div>
                ) : (
                  <>
                    {stages.map((stage, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2.5 border border-borderColor rounded-lg bg-bgMuted text-sm text-textMain">
                        <span className="flex items-center gap-2"><span className="text-xs text-textMuted font-bold">{i + 1}.</span>{stage}</span>
                        <button
                          onClick={() => handleRemoveStage(i)}
                          disabled={savingStages || stages.length <= 1}
                          className="text-xs text-textMuted hover:text-red-500 disabled:opacity-30 font-bold uppercase"
                        >
                          {language === 'es' ? 'Quitar' : 'Remove'}
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newStageInput}
                        onChange={(e) => setNewStageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                        placeholder={language === 'es' ? 'Nuevo estado…' : 'New stage…'}
                        className="flex-1 bg-bgMuted border border-borderColor rounded-lg px-4 py-2 text-sm outline-none text-textMain"
                      />
                      <button
                        onClick={handleAddStage}
                        disabled={savingStages || !newStageInput.trim()}
                        className="btn-primary px-4 rounded-lg text-sm disabled:opacity-50"
                      >
                        {language === 'es' ? 'Añadir' : 'Add'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: Outbound Webhooks & Automations */}
          {activeTab === 'automations' && (
            <div className="animate-fade-in">
              <AutomationsControlPanel language={language} />
            </div>
          )}

          {/* TAB: AI Providers — was hardcoded text ("Claude 3.5 Sonnet"), now the
              real AI Settings page (already backed by organization_ai_settings),
              consolidated here instead of living as its own separate sidebar item. */}
          {activeTab === 'ai' && (
            <div className="animate-fade-in">
              <AISettingsPage language={language} />
            </div>
          )}

          {/* TAB: Billing & Payments — was hardcoded text ("Enterprise Plan"),
              duplicating the real Stripe-backed BillingSettingsPage. Reuse the
              real one instead of maintaining two billing UIs. */}
          {activeTab === 'billing' && (
            <div className="animate-fade-in">
              <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-muted)' }}>Cargando…</div>}>
                <BillingSettingsPage language={language} />
              </React.Suspense>
            </div>
          )}

          {/* TAB: AI Agent Schedules */}
          {activeTab === 'schedules' && (
            <AgentSchedulesSettings language={language} userProfile={userProfile} />
          )}

          {/* TAB: Data & Backup — button previously had no onClick at all. */}
          {activeTab === 'backup' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="text-lg font-bold text-textMain">{language === 'es' ? 'Respaldos de Datos' : 'Data Backups'}</h3>
              <p className="text-xs text-textMuted">
                {language === 'es'
                  ? 'Exporta el perfil de tu organización, tareas operativas, deals de CRM y propuestas en un archivo JSON.'
                  : 'Export your organization profile, operations tasks, CRM deals and proposals as a JSON file.'}
              </p>
              <button
                onClick={handleExportWorkspace}
                disabled={exporting}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                style={{ width: 'fit-content', padding: '0.6rem 1.2rem', borderRadius: '8px' }}
              >
                <RefreshCw size={14} className={exporting ? 'animate-spin' : ''} />
                {exporting
                  ? (language === 'es' ? 'Exportando…' : 'Exporting…')
                  : (language === 'es' ? 'Exportar Todos los Datos (JSON)' : 'Export Full Tenant Workspace (JSON)')}
              </button>
            </div>
          )}

        </div>
    </div>
  );
}
