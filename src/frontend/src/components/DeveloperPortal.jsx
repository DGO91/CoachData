import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserPlus, Server, Activity, Plus, FileText, CheckCircle2, Settings, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TRANSLATIONS = {
  en: {
    title: 'Control Center (Admin)',
    subtitle: 'Central Tenant Management and System Health.',
    add_tenant: 'Add Client',
    tenants: 'Active Clients (Tenants)',
    company: 'Company / Name',
    email: 'Primary Email',
    package: 'Active Package',
    save: 'Save',
    saving: 'Saving…',
    systems: 'Engine Status',
    online: 'Online',
    secured: 'Secured',
    cancel: 'Cancel',
    no_clients: 'No clients registered yet.',
    loading: 'Loading…'
  },
  es: {
    title: 'Control Center (Admin)',
    subtitle: 'Gestión central de Tenants (Clientes) y Salud del Sistema.',
    add_tenant: 'Añadir Cliente',
    tenants: 'Clientes Activos (Tenants)',
    company: 'Empresa / Nombre',
    email: 'Correo Principal',
    package: 'Paquete Activo',
    save: 'Guardar',
    saving: 'Guardando…',
    systems: 'Estado del Motor',
    online: 'En Línea',
    secured: 'Asegurado',
    cancel: 'Cancelar',
    no_clients: 'No hay clientes registrados.',
    loading: 'Cargando…'
  }
};

const AGENT_NAMES = {
  'welcome': 'Panel de Bienvenida',
  'prospect': 'Prospect Analyzer',
  'email': 'Email Organizer',
  'mail-responder': 'Smart Mail Responder',
  'pre-call-agent': 'Pre-Call Agent',
  'weekly-digest': 'Weekly Digest',
  'auto-plan': 'Auto Plan Creator',
  'evening-summary': 'Evening Summary',
  'personal-agent': 'Morning Briefing',
  'knowledge-agent': 'Knowledge Base',
  'phase1': 'Fase 1: Capture',
  'phase2': 'Fase 2: Chief Strategy',
  'phase6': 'Fase 6: The Call',
  'phase7': 'Fase 7: Proposal'
};

export default function DeveloperPortal({ language }) {
  const t = (key) => TRANSLATIONS[language]?.[key] || key;

  const ALL_AGENTS = ['welcome', 'prospect', 'email', 'mail-responder', 'pre-call-agent', 'weekly-digest', 'auto-plan', 'evening-summary', 'personal-agent', 'knowledge-agent', 'phase1', 'phase2', 'phase6', 'phase7'];

  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', primary_contact_email: '', active_package: 'The Effortless Launch' });
  const [saving, setSaving] = useState(false);

  const [services, setServices] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    fetchTenants();
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 10000); // every 10s
    return () => clearInterval(interval);
  }, []);

  // Todas las rutas /api/admin exigen sesion + contexto de organizacion.
  // Sin estas cabeceras devolvian 401 y el Control Center salia vacio.
  const authHeaders = async (extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
      ...extra,
    };
  };

  const fetchStatus = async () => {
    try {
      // Same bug as Dashboard.jsx had: /api/status doesn't exist and silently
      // fell through to the SPA's index.html. Real endpoint is /api/agents/status.
      const res = await fetch('/api/agents/status', { headers: await authHeaders() });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setServices(data.services ?? []);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const [resT, resU] = await Promise.all([
        fetch('/api/admin/tenants', { headers: await authHeaders() }),
        fetch('/api/admin/users', { headers: await authHeaders() })
      ]);
      const dataT = await resT.json();
      const dataU = await resU.json();
      setTenants(Array.isArray(dataT) ? dataT : []);
      setUsers(Array.isArray(dataU) ? dataU : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ company_name: '', primary_contact_email: '', active_package: 'The Effortless Launch' });
        fetchTenants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePackageChange = async (tenantId, newPackage) => {
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, active_package: newPackage } : t));
    try {
      await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ active_package: newPackage })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [agentSelection, setAgentSelection] = useState([]);

  const openAgentModal = (user) => {
    setSelectedUser(user);
    setAgentSelection(user.enabled_agents || ALL_AGENTS);
    setShowAgentModal(true);
  };

  const handleToggleAgent = (agentKey) => {
    setAgentSelection(prev => 
      prev.includes(agentKey) ? prev.filter(k => k !== agentKey) : [...prev, agentKey]
    );
  };

  const handleSaveAgents = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/agents`, {
        method: 'PUT',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled_agents: agentSelection })
      });
      if (res.ok) {
        setShowAgentModal(false);
        fetchTenants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalAgents  = services.length;
  const activeAgents = services.filter((s) => s.up).length;
  const healthPct    = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : null;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="glass-panel-inner p-8 flex flex-col gap-3 " >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-textMain flex items-center gap-3">
              Control Center (Admin)
            </h1>
            <p className="text-sm text-textMuted leading-relaxed max-w-4xl mt-2">{t('subtitle')}</p>
          </div>
          <button className="premium-btn py-2.5 px-5 font-bold flex items-center gap-2 shadow-lg" onClick={() => setShowModal(true)}>
            <Plus size={16} /> {t('add_tenant')}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 w-full">
        
        {/* Tenants Table */}
        <section className="glass-panel-inner flex flex-col overflow-hidden !p-0">
          <div className="bg-bgMuted border-b border-borderColor px-6 py-4 flex items-center gap-3">
            <Users size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-textMain text-lg tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>{t('tenants')}</h2>
          </div>
          
          <div className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-textMuted font-mono text-sm">{t('loading')}</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-xs text-textMuted uppercase tracking-widest bg-bgSurface">
                    <th className="px-6 py-4 font-bold">{t('company')}</th>
                    <th className="px-6 py-4 font-bold">{t('email')}</th>
                    <th className="px-6 py-4 font-bold">{t('package')}</th>
                    <th className="px-6 py-4 font-bold font-mono">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="border-b border-borderColor/50 hover:bg-bgMuted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm text-textMain">{tenant.company_name}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{tenant.primary_contact_email}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={tenant.active_package}
                          onChange={(e) => handlePackageChange(tenant.id, e.target.value)}
                          className="bg-bgSurface border border-borderColor text-textMain text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:border-[var(--color-gold)] transition-colors cursor-pointer"
                        >
                          <option value="Pending / Free Tier">Pending / Free Tier</option>
                          <option value="The Effortless Launch">The Effortless Launch</option>
                          <option value="The Growth Engine">The Growth Engine</option>
                          <option value="The Lucky Method (Flagship)">The Lucky Method (Flagship)</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-textMuted">{tenant.id.split('-')[0]}...</td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-textMuted text-sm italic">{t('no_clients')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Users / Profiles Table */}
        <section className="glass-panel-inner flex flex-col overflow-hidden !p-0">
          <div className="bg-bgMuted border-b border-borderColor px-6 py-4 flex items-center gap-3">
            <UserPlus size={18} style={{ color: 'var(--color-gold)' }} />
            <h2 className="font-bold text-textMain text-lg tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Profiles & Agent Access</h2>
          </div>
          
          <div className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-textMuted font-mono text-sm">{t('loading')}</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-xs text-textMuted uppercase tracking-widest bg-bgSurface">
                    <th className="px-6 py-4 font-bold">Nombre</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold text-right">Agentes Habilitados</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-borderColor/50 hover:bg-bgMuted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-sm text-textMain">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="bg-bgSecondary text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border border-borderColor/50 text-textMain">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="bg-bgSurface border border-borderColor hover:border-[var(--color-gold)] text-xs font-bold px-4 py-2 rounded-lg text-textMain transition-all shadow-sm flex items-center justify-end gap-2 ml-auto"
                          onClick={() => openAgentModal(user)}
                        >
                          <Settings size={14} />
                          Gestionar Accesso <span className="text-[var(--color-gold)]">({(user.enabled_agents || ALL_AGENTS).length}/{ALL_AGENTS.length})</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* System Health & AI Intelligence */}
        <section className="flex flex-col gap-6">
          <div className="bg-bgMuted border border-borderColor px-6 py-4 flex items-center justify-between gap-3 rounded-xl">
            <div className="flex items-center gap-3">
              <Activity size={18} style={{ color: 'var(--color-gold)' }} />
              <h2 className="font-bold text-textMain text-lg tracking-wide m-0" style={{ fontFamily: "'Playfair Display', serif" }}>
                {language === 'es' ? 'Asistentes e Inteligencia Artificial' : 'AI Assistants & Intelligence'}
              </h2>
            </div>
            <span className="text-xs text-textMuted font-bold flex items-center gap-1.5 opacity-70">
              <Clock size={14} /> Updated {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="bg-bgMuted border border-borderColor px-6 py-4 flex items-center gap-3 rounded-t-xl">
            <Activity size={18} style={{ color: 'var(--success)' }} />
            <h2 className="font-bold text-textMain text-lg tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Tech Support & Console Diagnostics</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-2 border border-borderColor hover:border-[var(--color-gold)] transition-colors">
              <div className="text-3xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>
                {statusLoading ? '—' : activeAgents} / {totalAgents}
              </div>
              <div className="text-xs font-bold text-textMuted uppercase tracking-widest">Active Agents</div>
            </div>
            <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-2 border border-borderColor hover:border-[var(--color-gold)] transition-colors">
              <div className="text-3xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>
                {statusLoading || healthPct === null ? '—' : `${healthPct}%`}
              </div>
              <div className="text-xs font-bold text-textMuted uppercase tracking-widest">System Health</div>
            </div>
            <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-2 border border-borderColor hover:border-[var(--color-gold)] transition-colors">
              <div className={`text-xl font-bold mb-1 ${isOnline ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                {isOnline ? t('online') : 'Offline'}
              </div>
              <div className="text-xs font-bold text-textMuted uppercase tracking-widest">API Connection</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel-inner p-6 flex flex-col gap-4 border-l-2" style={{ borderLeftColor: 'var(--success)' }}>
              <div className="flex items-center gap-3 text-textMuted font-bold text-xs uppercase tracking-widest">
                <Server size={16} /> Webhook Router
              </div>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success)]"></span>
                </span>
                <span className="text-[var(--success)] font-bold tracking-wide uppercase text-sm">{t('online')}</span>
              </div>
            </div>
            
            <div className="glass-panel-inner p-6 flex flex-col gap-4 border-l-2" style={{ borderLeftColor: 'var(--success)' }}>
              <div className="flex items-center gap-3 text-textMuted font-bold text-xs uppercase tracking-widest">
                <Activity size={16} /> AES-256 Encryption Vault
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-[var(--success)]" />
                <span className="text-[var(--success)] font-bold tracking-wide uppercase text-sm">{t('secured')}</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Add Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bgSurface border border-borderColor rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-bold mb-6 text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('add_tenant')}</h3>
            <form onSubmit={handleAddTenant} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">{t('company')}</label>
                <input required type="text" className="w-full bg-bgSecondary border border-borderColor rounded-xl py-3 px-4 text-sm text-textMain focus:outline-none focus:border-[var(--color-gold)] transition-colors shadow-inner" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="Ej. Lilly - Elite Coaching" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">{t('email')}</label>
                <input required type="email" className="w-full bg-bgSecondary border border-borderColor rounded-xl py-3 px-4 text-sm text-textMain focus:outline-none focus:border-[var(--color-gold)] transition-colors shadow-inner" value={formData.primary_contact_email} onChange={e => setFormData({...formData, primary_contact_email: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider">{t('package')}</label>
                <select className="w-full bg-bgSecondary border border-borderColor rounded-xl py-3 px-4 text-sm text-textMain focus:outline-none focus:border-[var(--color-gold)] transition-colors shadow-inner appearance-none cursor-pointer" value={formData.active_package} onChange={e => setFormData({...formData, active_package: e.target.value})}>
                  <option value="The Effortless Launch">The Effortless Launch</option>
                  <option value="The Magnetic Brand Experience">The Magnetic Brand Experience</option>
                  <option value="The Lucky Method (Flagship)">The Lucky Method (Flagship)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" className="px-6 py-2.5 rounded-xl font-bold text-sm text-textMuted hover:bg-bgMuted transition-colors" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="premium-btn py-2.5 px-6 font-bold shadow-lg flex justify-center min-w-[120px]" disabled={saving}>
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Agents Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bgSurface border border-borderColor rounded-2xl w-full max-w-2xl max-h-[85vh] p-6 sm:p-8 shadow-2xl animate-scale-in flex flex-col">
            <div className="mb-6 border-b border-borderColor pb-4">
              <h3 className="text-xl font-bold text-textMain mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Habilitar Agentes</h3>
              <p className="text-sm font-bold text-[var(--color-gold)]">Usuario: {selectedUser?.name || selectedUser?.email}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 custom-scrollbar">
              {ALL_AGENTS.map(agentKey => {
                const isSelected = agentSelection.includes(agentKey);
                return (
                  <label key={agentKey} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[var(--accent)] ${
                    isSelected ? 'bg-[var(--bg-hover)] border-[var(--color-gold)] shadow-sm' : 'bg-bgMuted border-borderColor hover:border-borderColor/80'
                  }`}>
                    {/* La casilla de al lado es decorativa; este input es el control real. */}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => handleToggleAgent(agentKey)}
                    />
                    <div aria-hidden="true" className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[var(--color-gold)] border-[var(--color-gold)]' : 'border-textMuted bg-bgSurface'
                    }`}>
                      {isSelected && <CheckCircle2 size={14} className="text-bgRoot" />}
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-bold text-textMain' : 'text-textMuted'}`}>
                      {AGENT_NAMES[agentKey] || agentKey}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-borderColor">
              <button type="button" className="px-6 py-2.5 rounded-xl font-bold text-sm text-textMuted hover:bg-bgMuted transition-colors" onClick={() => setShowAgentModal(false)}>{t('cancel')}</button>
              <button type="button" className="premium-btn py-2.5 px-6 font-bold shadow-lg flex justify-center min-w-[120px]" onClick={handleSaveAgents} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
