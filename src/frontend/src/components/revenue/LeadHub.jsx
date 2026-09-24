// src/frontend/src/components/revenue/LeadHub.jsx
import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowRight, Search, RefreshCw, Trash2, History, Calendar, CreditCard, FileText, X } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAutomationDispatcher } from '../../hooks/useAutomationDispatcher';
import { supabase } from '../../supabaseClient';
import AutomationStatusToast from './AutomationStatusToast';

import ActionModal from '../common/ActionModal';
import DataTable from '../common/DataTable';
import { InputField, SelectField } from '../common/FormInputs';
import { useNotifications } from '../common/Notifications';
import { ProspectTimelineDrawer } from './ProspectTimelineDrawer';

export default function LeadHub({ language = 'es', onNextStep, setLeadData, onNavigate }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStage, setFilterStage] = useState('all'); // 'all' | 'qualified' | 'unrated' | 'won' | 'lost'
  const [leads, setLeads] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', isError: false });
  
  // Slide-over Drawer State
  const [selectedLead, setSelectedLead] = useState(null);

  const openTimeline = async (lead) => {
    setTimelineLead(lead);
    setLoadingTimeline(true);
    setTimelineData([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/revenue/clients/timeline?contact_id=${lead.id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default'
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.timeline)) {
        setTimelineData(data.timeline);
      }
    } catch (err) {
      console.error('[Timeline Fetch Error]:', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // New Lead form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [leadSource, setLeadSource] = useState('Directo');
  const [aiScore, setAiScore] = useState(85);

  const [activeTenant, setActiveTenant] = useState(null);
  const { dispatch, fetchLeads, status, result, error, reset } = useAutomationDispatcher();

  const loadData = async () => {
    let tenantId = null;
    
    const orgSlug = localStorage.getItem('coachdata_org_slug');
    if (orgSlug && orgSlug !== 'default') {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .maybeSingle();
      if (orgData) tenantId = orgData.id;
    }

    if (!tenantId) {
      const { data: memData } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .limit(1)
        .maybeSingle();
      if (memData) tenantId = memData.organization_id;
    }

    console.log('[LEAD HUB LOAD]');
    console.log('organizationId:', tenantId);
    setActiveTenant(tenantId);

    if (!tenantId) {
      setLeads([]);
      return null;
    }

    const { data, error: fetchErr } = await supabase
      .from('crm_contacts')
      .select('*, company:crm_companies(name)')
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false });

    if (!fetchErr && data) {
      setLeads(data.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ''}`.trim(),
        email: c.email || '',
        company: c.company?.name || 'Independiente',
        source: c.source || 'Directo',
        // null = sin calificar todavia. No se convierte a 0: seria una nota inventada.
        score: typeof c.lead_score === 'number' ? c.lead_score : null,
        status: c.status || 'new'
      })));
    }
    return tenantId;
  };

  useEffect(() => {
    let channel;
    
    loadData().then((tenantId) => {
      // TRUE REALTIME SUBSCRIPTION
      channel = supabase
        .channel(`crm_contacts_${tenantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_contacts',
            filter: `organization_id=eq.${tenantId}`
          },
          () => loadData()
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleSync = async () => {
    const r = await dispatch('leadhub_sync', { source: 'manual_ui' });
    if (r.success) {
      setTimeout(() => {
        loadData();
      }, 1500);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!firstName || !email) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const payload = {
        companyName,
        firstName,
        lastName,
        email,
        source: leadSource,
        leadScore: aiScore
      };

      console.group('[LEAD CREATE]');
      console.log('Payload:', payload);
      console.log('OrganizationId:', activeTenant);
      console.log('Endpoint:', '/api/revenue/prospect');
      console.groupEnd();
      
      const response = await fetch('/api/revenue/prospect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      if (!result.success) throw new Error(result.error || 'Unknown error');

      // Update local state directly
      if (result.lead) {
        setLeads(prev => [result.lead, ...prev]);
      }

      // Reset Form & Close Modal
      setFirstName('');
      setLastName('');
      setEmail('');
      setCompanyName('');
      setShowAddModal(false);
    } catch (e) {
      console.error(`[LeadHub Create Error]:`, e);
      setCustomAlert({
        isOpen: true,
        title: isEs ? 'Error de Persistencia' : 'Persistence Error',
        message: e.message || (isEs ? 'No se pudo crear el prospecto.' : 'Could not create lead.'),
        isError: true
      });
    }
  };

  const handleStageChange = async (contactId, newStatus) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({ status: newStatus })
        .eq('id', contactId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === contactId ? { ...l, status: newStatus } : l));
      if (selectedLead && selectedLead.id === contactId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
      notify(isEs ? 'Etapa comercial actualizada' : 'Pipeline stage updated', { type: 'success' });
    } catch (err) {
      notify(err.message, { type: 'warning' });
    }
  };

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          (l.company || '').toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'all' || l.source === filterSource;
    let matchesStage = true;
    if (filterStage === 'qualified') matchesStage = l.score !== null && l.score >= 70;
    else if (filterStage === 'unrated') matchesStage = l.score === null;
    else if (filterStage === 'won') matchesStage = l.status === 'won';
    else if (filterStage === 'lost') matchesStage = l.status === 'lost';
    return matchesSearch && matchesSource && matchesStage;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Info */}
      <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Lead Hub
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {isEs
            ? 'Monitorea y sincroniza leads del CRM local integrados directamente con tu base de datos de organización.'
            : 'Monitor and synchronize local CRM leads integrated directly with your organization database.'}
        </p>
      </div>

      {/* Quick Stage Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: isEs ? 'Todos' : 'All' },
          { id: 'qualified', label: isEs ? 'Calificados (≥70)' : 'Qualified (≥70)' },
          { id: 'unrated', label: isEs ? 'Sin Calificar' : 'Unrated' },
          { id: 'won', label: isEs ? 'Ganados' : 'Won' },
          { id: 'lost', label: isEs ? 'Perdidos' : 'Lost' },
        ].map(pill => {
          const isActive = filterStage === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setFilterStage(pill.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                color: isActive ? 'var(--accent-text, #fff)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.15s ease'
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center' }}>
        {/* FormInputs.jsx's SearchInput/SelectField are width:100% by design (built
            for stacked forms) — that breaks this horizontal, fixed-width toolbar
            row, so this stays hand-rolled rather than force-fitting the wrong tool. */}
        <div style={{ width: '280px', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={isEs ? 'Buscar prospectos…' : 'Search prospects…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', height: '32px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
          />
        </div>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{ height: '32px', borderRadius: '10px', padding: '0 0.75rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '12px', outline: 'none' }}
        >
          <option value="all">{isEs ? 'Todas las fuentes' : 'All sources'}</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Cold Email">Cold Email</option>
          <option value="Contact Form">Contact Form</option>
          <option value="Directo">{isEs ? 'Directo' : 'Direct'}</option>
        </select>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={status === 'processing'}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '32px', padding: '0 14px', borderRadius: '10px',
            background: 'var(--bg-surface)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', fontWeight: 700, fontSize: '12px',
            cursor: status === 'processing' ? 'default' : 'pointer',
            opacity: status === 'processing' ? 0.7 : 1,
            transition: 'opacity 160ms ease'
          }}
        >
          <RefreshCw size={13} style={{ animation: status === 'processing' ? 'spin 1s linear infinite' : 'none' }} />
          {status === 'processing'
            ? (isEs ? 'Sincronizando…' : 'Syncing…')
            : (isEs ? 'Sincronizar Leads' : 'Sync Leads')}
        </button>

        {/* Add Lead Button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            height: '32px', padding: '0 14px', borderRadius: '10px',
            background: 'var(--accent)', color: 'var(--accent-text, #ffffff)',
            border: 'none', fontWeight: 700, fontSize: '12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <UserPlus size={13} />
          {isEs ? 'Nuevo Prospecto' : 'New Lead'}
        </button>
      </div>

      {/* Automation Status Toast */}
      {status !== 'idle' && (
        <AutomationStatusToast
          status={status}
          error={error}
          result={result}
          language={language}
          onRetry={handleSync}
          onDismiss={reset}
          autoDismissMs={status === 'completed' ? 5000 : null}
        />
      )}

      {/* Leads List */}
      <DataTable
        ariaLabel={isEs ? 'Prospectos' : 'Leads'}
        rows={filteredLeads}
        getRowId={(lead) => lead.id}
        onRowClick={handleSelectLead}
        defaultSort={{ column: 'name', direction: 'ascending' }} // governance-allow: invalid-style-prop — descriptor de orden, no un objeto de estilo
        emptyState={
          status === 'processing' ? null : (
            <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '14px', textAlign: 'center', width: '100%', background: 'var(--bg-surface)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                {isEs
                  ? 'No hay leads todavía. Crea tu primer prospecto o conecta una integración desde Organization Settings → Connections Hub.'
                  : 'No leads yet. Create your first prospect or connect an integration from Organization Settings → Connections Hub.'}
              </p>
            </div>
          )
        }
        columns={[
          {
            id: 'name',
            label: isEs ? 'Prospecto' : 'Lead',
            sortable: true,
            render: (lead) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</span>
                <span style={{ fontSize: '10px', background: 'rgba(184, 152, 90, 0.12)', color: 'var(--accent-ink, var(--accent))', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                  {lead.source}
                </span>
                {lead.status === 'new' && (
                  <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--crit)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                    {isEs ? 'Pendiente' : 'Pending'}
                  </span>
                )}
              </div>
            ),
          },
          {
            id: 'company',
            label: isEs ? 'Empresa' : 'Company',
            sortable: true,
            render: (lead) => <span style={{ color: 'var(--text-muted)' }}>{lead.company}</span>,
          },
          {
            id: 'email',
            label: 'Email',
            sortable: true,
            render: (lead) => <span style={{ color: 'var(--text-muted)' }}>{lead.email}</span>,
          },
          {
            id: 'score',
            label: isEs ? 'Confianza IA' : 'AI Confidence',
            sortable: true,
            align: 'right',
            // Sin calificar es null, no 0: ordenar por puntuación lo manda al
            // final en vez de mezclarlo con los leads realmente puntuados.
            sortValue: (lead) => lead.score,
            render: (lead) =>
              lead.score === null ? (
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                  {isEs ? 'Sin calificar' : 'Not scored'}
                </span>
              ) : (
                <span style={{ fontWeight: 700, color: lead.score >= 85 ? 'var(--good)' : 'var(--warn)' }}>
                  {lead.score}%
                </span>
              ),
          },
          {
            id: 'acciones',
            label: '',
            align: 'right',
            width: '76px',
            render: (lead) => (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  aria-label={isEs ? 'Ver historial unificado' : 'View unified timeline'}
                  title={isEs ? 'Ver historial unificado' : 'View unified timeline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    openTimeline(lead);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-ink, var(--accent))'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <History size={14} />
                </button>
                <button
                  aria-label={isEs ? 'Eliminar prospecto' : 'Delete lead'}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!(await askConfirm({ message: isEs ? '¿Eliminar este prospecto?' : 'Delete this lead?', danger: true }))) return;
                    try {
                      const { error } = await supabase.from('crm_contacts').delete().eq('id', lead.id);
                      if (error) throw error;
                      setLeads(prev => prev.filter(l => l.id !== lead.id));
                      setCustomAlert({ isOpen: true, title: 'Éxito', message: 'Prospecto eliminado', isError: false });
                    } catch (err) {
                      setCustomAlert({ isOpen: true, title: 'Error', message: err.message, isError: true });
                    }
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--crit)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={14} />
                </button>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              </div>
            ),
          },
        ]}
      />

      {/* New Lead Modal Form */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleAddLead} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEs ? 'Crear Nuevo Prospecto' : 'Create New Lead'}
            </h3>
            
            <InputField
              label={isEs ? 'Nombre' : 'First Name'}
              required
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{ background: 'var(--bg-root)' }}
            />

            <InputField
              label={isEs ? 'Apellido' : 'Last Name'}
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              style={{ background: 'var(--bg-root)' }}
            />

            <InputField
              label={isEs ? 'Email' : 'Email'}
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ background: 'var(--bg-root)' }}
            />

            <InputField
              label={isEs ? 'Empresa' : 'Company'}
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              style={{ background: 'var(--bg-root)' }}
            />

            <SelectField
              label={isEs ? 'Fuente' : 'Source'}
              value={leadSource}
              onChange={e => setLeadSource(e.target.value)}
              style={{ background: 'var(--bg-root)' }}
            >
              <option value="Directo">Directo / Manual</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Cold Email">Cold Email</option>
              <option value="Contact Form">Contact Form</option>
            </SelectField>

            <InputField
              label={isEs ? 'Confianza Inicial (%)' : 'Confidence Score (%)'}
              type="number"
              min="0"
              max="100"
              value={aiScore}
              onChange={e => setAiScore(parseInt(e.target.value))}
              style={{ background: 'var(--bg-root)' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, height: '36px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}>
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button type="submit" style={{ flex: 1, height: '36px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: 'var(--accent-text, #fff)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {isEs ? 'Crear' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slide-over Prospect Timeline Drawer */}
      <ProspectTimelineDrawer
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        language={language}
        onStageChange={handleStageChange}
        onRequalify={async (l) => {
          await handleSync();
        }}
        onNavigate={onNavigate}
      />

      {customAlert.isOpen && (
        <ActionModal
          title={customAlert.title}
          message={customAlert.message}
          isError={customAlert.isError}
          onClose={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}

