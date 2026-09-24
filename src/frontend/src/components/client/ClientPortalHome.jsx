// src/frontend/src/components/client/ClientPortalHome.jsx
import React, { useState, useEffect } from 'react';
import { Users, ExternalLink, Shield } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function ClientPortalHome({ language = 'es' }) {
  const isEs = language === 'es';
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const orgSlug = localStorage.getItem('coachdata_org_slug');
    let tenantId = null;

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

    if (!tenantId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('client_workspaces')
      .select('*')
      .eq('provider_tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorkspaces(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Panel */}
      <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {isEs ? 'Workspaces de Clientes' : 'Client Workspaces'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {isEs
            ? 'Monitorea accesos y portales provisionados para tus clientes finales desde tu organización.'
            : 'Monitor access credentials and provisioned workspaces for your clients.'}
        </p>
      </div>

      {workspaces.length === 0 ? (
        <div style={{ padding: '3rem', border: '1px dashed var(--border)', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            {isEs 
              ? 'No hay clientes provisionados todavía. Los workspaces aparecerán automáticamente cuando una propuesta sea aprobada.'
              : 'No clients provisioned yet. Workspaces will appear automatically when a proposal is approved.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {workspaces.map(ws => (
            <div key={ws.id} style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{ws.client_company || ws.client_name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{ws.client_email}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: 'var(--good)', fontWeight: 600 }}>● {ws.status}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(ws.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
