// src/frontend/src/components/revenue/RevenueOS.jsx
import React, { useState } from 'react';
import LeadHub from './LeadHub';
import RevenueChiefAI from './RevenueChiefAI';
import CallIntelligenceCenter from './CallIntelligenceCenter';
import DealClosingWorkspace from './DealClosingWorkspace';
import PipelineAnalytics from './PipelineAnalytics';
import { TRANSLATIONS } from '../../i18n/translations';

export default function RevenueOS({ language = 'es', theme = 'dark' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';

  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'leads' | 'chief' | 'call' | 'closing'
  const [selectedLead, setSelectedLead] = useState(null);
  const [chiefResult, setChiefResult] = useState(null);
  const [callResult, setCallResult] = useState(null);

  const tabs = [
    { key: 'pipeline', label: isEs ? 'Métricas de Pipeline' : 'Pipeline Analytics' },
    { key: 'leads', label: isEs ? '1. Captación (LeadHub)' : '1. Ingestion (LeadHub)' },
    { key: 'chief', label: isEs ? '2. Triage (ChiefAI)' : '2. Triage (ChiefAI)' },
    { key: 'call', label: isEs ? '3. Conversación (CallIntel)' : '3. Conversation (CallIntel)' },
    { key: 'closing', label: isEs ? '4. Cierre (DealClosing)' : '4. Closing (DealClosing)' }
  ];

  return (
    <div className="ogd-shell" style={{ gap: '1.5rem', padding: '1.5rem' }}>
      {/* Tab Navigation header */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-surface)',
              color: activeTab === tab.key ? 'var(--accent-text, #ffffff)' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render Active View */}
      <div>
        {activeTab === 'pipeline' && <PipelineAnalytics language={language} />}
        {activeTab === 'leads' && (
          <LeadHub 
            language={language} 
            setLeadData={setSelectedLead} 
            onNextStep={(next) => setActiveTab(next)} 
          />
        )}
        {activeTab === 'chief' && (
          <RevenueChiefAI 
            language={language} 
            leadData={selectedLead} 
            setChiefResult={setChiefResult}
            onNextStep={(next) => setActiveTab(next)} 
          />
        )}
        {activeTab === 'call' && (
          <CallIntelligenceCenter 
            language={language} 
            setCallResult={setCallResult}
            onNextStep={(next) => setActiveTab(next)} 
          />
        )}
        {activeTab === 'closing' && (
          <DealClosingWorkspace 
            language={language} 
            callResult={callResult} 
          />
        )}
      </div>
    </div>
  );
}
