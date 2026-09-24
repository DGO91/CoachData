// src/frontend/src/components/revenue/DealClosingWorkspace.jsx
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, PlusCircle } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAutomationDispatcher } from '../../hooks/useAutomationDispatcher';
import { supabase } from '../../supabaseClient';
import AutomationStatusToast from './AutomationStatusToast';

const PROVISIONING_STEPS_ES = [
  'Guardando propuesta…',
  'Creando organización del cliente…',
  'Aprovisionando Client Workspace…',
  'Registrando actividad…',
  'Factura borrador en Stripe…',
];

const PROVISIONING_STEPS_EN = [
  'Saving proposal…',
  'Creating client organization…',
  'Provisioning Client Workspace…',
  'Logging activity…',
  'Stripe draft invoice…',
];

export default function DealClosingWorkspace({ language = 'es', callResult, leadData, onNextStep }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';

  const { dispatch, status, result, error, reset } = useAutomationDispatcher();
  const [isApproved, setIsApproved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  // Real DB state lists
  const [proposals, setProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const confidence = callResult?.confidenceScore || (leadData ? 88 : 0);
  const companyName = leadData?.company || callResult?.company || (proposals.length > 0 ? (proposals[0].client_name || proposals[0].company_name || 'Cliente') : null);

  const proposalData = {
    title: proposals[0]?.title || (isEs ? 'Propuesta de Consultoría de Operaciones y Growth' : 'Operations & Growth Consulting Proposal'),
    amount: proposals[0] ? `${proposals[0].monthly_amount} ${proposals[0].currency || '€'} / mes` : '€4,500 / mes',
    scope: isEs
      ? ['Alineación e ingesta de LeadHub unificado', 'Calificación por agentes automáticos RevenueChiefAI', 'Monitoreo de Salud Operativa OHS']
      : ['Unified LeadHub Ingestion & Setup', 'RevenueChiefAI Automatic Agents Qualification', 'OHS Operational Health Engine Monitoring']
  };

  const steps = isEs ? PROVISIONING_STEPS_ES : PROVISIONING_STEPS_EN;

  const handleApproveAndProvision = async () => {
    const stepInterval = setInterval(() => {
      setStepIndex(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 600);

    const r = await dispatch('proposal_approved', {
      proposal: proposalData,
      deal: { id: callResult?.deal_id || null, confidence_score: confidence },
      client: {
        name: leadData?.name || 'Cliente',
        email: leadData?.email || '',
        company: companyName || 'Cliente'
      }
    });

    clearInterval(stepInterval);

    if (r.success) {
      setIsApproved(true);
      setWorkspaceId(r.data?.workspace_id);
      loadRealData();
    }
  };

  const hasActiveProposal = companyName || proposals.length > 0 || leadData || callResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Info */}
      <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Deals & Proposals
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {isEs
            ? 'Monitorea propuestas, gestiona aprobaciones finales y aprovisiona de forma automatizada el Client Workspace.'
            : 'Monitor proposals, manage final approvals, and automate the provisioning of Client Workspaces.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Proposal Details Card */}
        {hasActiveProposal ? (
          <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {isEs ? 'Propuesta para' : 'Proposal for'}
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{companyName}</h4>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(184, 152, 90, 0.12)', color: 'var(--accent-ink, var(--accent))', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                {isEs ? 'Confianza: ' : 'Confidence: '}{confidence}%
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Concepto: ' : 'Concept: '}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{proposalData.title}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{isEs ? 'Inversión: ' : 'Investment: '}</span>
                <strong style={{ color: 'var(--good)' }}>{proposalData.amount}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isEs ? 'Alcance Incluido:' : 'Included Scope:'}
              </span>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {proposalData.scope.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <FileText size={32} style={{ color: 'var(--text-muted)' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isEs ? 'Sin propuestas activas' : 'No active proposals'}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px' }}>
              {isEs
                ? 'Genera o califica un prospecto desde LeadHub para crear una propuesta comercial automática.'
                : 'Qualify a lead from LeadHub to generate an automatic commercial proposal.'}
            </p>
          </div>
        )}

        {/* Provisioning Card */}
        <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {isEs ? 'Automatización de Aprovisionamiento' : 'Provisioning Automation'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              {isEs
                ? 'Al aprobarse la propuesta, el sistema creará automáticamente la organización del cliente, aprovisionará el workspace seguro y configurará el onboarding del proyecto.'
                : 'Once proposal is approved, the system will automatically create the client organization, provision the secure workspace, and set up project onboarding.'}
            </p>

            {/* Provisioning progress */}
            {status === 'processing' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: i <= stepIndex ? 'var(--text-primary)' : 'var(--text-muted)', opacity: i <= stepIndex ? 1 : 0.4, transition: 'all 0.3s ease' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: i < stepIndex ? 'var(--good)' : i === stepIndex ? 'var(--accent)' : 'var(--border)', flexShrink: 0, display: 'inline-block' }} />
                    {step}
                  </div>
                ))}
              </div>
            )}

            {/* Workspace link after success */}
            {isApproved && workspaceId && (
              <div style={{ marginTop: '0.75rem', padding: '8px 12px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--good)' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{isEs ? '✓ Client Portal Provisionado' : '✓ Client Portal Provisioned'}</div>
                <div style={{ opacity: 0.8 }}>Workspace ID: {workspaceId}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleApproveAndProvision}
            disabled={!hasActiveProposal || status === 'processing' || isApproved}
            style={{
              height: '38px', borderRadius: '10px',
              background: (!hasActiveProposal || status === 'processing' || isApproved) ? 'var(--bg-root)' : 'var(--accent)',
              color: isApproved ? 'var(--good)' : (!hasActiveProposal || status === 'processing') ? 'var(--text-muted)' : 'var(--accent-text, #ffffff)',
              border: '1px solid var(--border)', fontWeight: 700, fontSize: '13px',
              cursor: (!hasActiveProposal || status === 'processing' || isApproved) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {isApproved ? (
              <><CheckCircle size={16} />{isEs ? 'Client Workspace Aprovisionado ✓' : 'Client Workspace Provisioned ✓'}</>
            ) : status === 'processing' ? (
              isEs ? 'Aprovisionando…' : 'Provisioning…'
            ) : (
              <><PlusCircle size={16} />{isEs ? 'Aprobar Propuesta & Aprovisionar' : 'Approve Proposal & Provision'}</>
            )}
          </button>
        </div>
      </div>

      {/* Real Entities Dashboard */}
      {(proposals.length > 0 || contracts.length > 0 || invoices.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          
          {/* Proposals List */}
          <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEs ? 'Propuestas Activas' : 'Active Proposals'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {proposals.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-root)', borderRadius: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.title}</span>
                  <span style={{ color: 'var(--accent-ink, var(--accent))' }}>{p.monthly_amount} {p.currency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contracts List */}
          <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEs ? 'Contratos Generados' : 'Generated Contracts'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {contracts.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-root)', borderRadius: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Template: {c.template_key}</span>
                  <span style={{ color: 'var(--good)' }}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          <div style={{ padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEs ? 'Facturas Stripe (Borrador)' : 'Stripe Invoices (Draft)'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {invoices.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-root)', borderRadius: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{i.stripe_invoice_id}</span>
                  <span style={{ color: 'var(--good)', fontWeight: 600 }}>{i.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Automation Status Toast */}
      {status !== 'idle' && (
        <AutomationStatusToast
          status={status}
          error={error}
          result={result}
          language={language}
          onRetry={handleApproveAndProvision}
          onDismiss={reset}
          autoDismissMs={status === 'completed' ? 6000 : null}
        />
      )}
    </div>
  );
}
