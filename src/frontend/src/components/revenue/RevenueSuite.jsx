// src/frontend/src/components/revenue/RevenueSuite.jsx
import React, { useState } from 'react';
import { UserPlus, Bot, PhoneCall, FileText, SlidersHorizontal } from 'lucide-react';
import LeadHubTab from './tabs/LeadHubTab';
import AIRevenueChiefTab from './tabs/AIRevenueChiefTab';
import CallIntelligenceTab from './tabs/CallIntelligenceTab';
import DealsAndProposalsTab from './tabs/DealsAndProposalsTab';
import LeadScoringCriteriaTab from './tabs/LeadScoringCriteriaTab';
import { TRANSLATIONS } from '../../i18n/translations';
import '../MediaSuite.css'; // Reutiliza la misma estructura css premium de Media Suite

export default function RevenueSuite({ language = 'es', theme = 'dark', initialSubTab = 'lead-hub' }) {
  // Si alguien llega por un enlace directo a la pestaña apagada (App.jsx la
  // sigue enrutando como 'phase6'), cae en Lead Hub en vez de en una pantalla
  // en blanco.
  const pestanaInicial = initialSubTab === 'call-intelligence' ? 'lead-hub' : initialSubTab;
  const [activeTab, setActiveTab] = useState(pestanaInicial);
  const [selectedLead, setSelectedLead] = useState(null);
  const [chiefResult, setChiefResult] = useState(null);
  const [callResult, setCallResult] = useState(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  // Call Intelligence está apagado a propósito.
  //
  // La pestaña afirmaba haber transcrito y analizado una llamada del coach:
  // objeciones, compromisos y un «88% de confianza». Todo era texto fijo,
  // idéntico para cualquier prospecto, y al aprobar se escribía en la base una
  // grabación que no existe ('recordings/call_marcos.mp3'). Decirle a un coach
  // que analizamos una llamada que nunca ocurrió es el peor daño que puede
  // hacer este producto, sobre todo si lo ve con un cliente delante.
  //
  // No se borra el código: transcribir de verdad es barato (~0,15 €/hora de
  // audio) y el módulo se reconstruirá. Lo caro es la subida del audio, su
  // almacenamiento y el consentimiento de grabación del tercero.
  // Se reactiva poniendo esto a true, cuando exista transcripción real.
  const CALL_INTELLIGENCE_HABILITADO = false;

  const tabs = [
    { id: 'lead-hub', label: t.lead_hub || 'Lead Hub', icon: UserPlus },
    { id: 'ai-revenue-chief', label: t.ai_revenue_chief || 'AI Revenue Chief', icon: Bot },
    ...(CALL_INTELLIGENCE_HABILITADO
      ? [{ id: 'call-intelligence', label: t.call_intelligence || 'Call Intelligence', icon: PhoneCall }]
      : []),
    { id: 'deals-and-proposals', label: t.deals_and_proposals || 'Deals & Proposals', icon: FileText },
    // El criterio de calificación vive junto a lo que califica: es lo que hace
    // que Lead Hub y AI Revenue Chief puntúen algo en vez de nada.
    { id: 'scoring-criteria', label: t.scoring_criteria || 'Criterio de calificación', icon: SlidersHorizontal }
  ];

  return (
    <div className="media-suite-container">
      <header className="media-suite-tabs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1rem', width: '100%' }}>
        {/* minWidth:0 es lo que permite que este contenedor se encoja: sin ello
            un `flex: 1` no baja de su ancho de contenido y la ultima pestaña se
            mete debajo de los controles de zoom en pantallas estrechas. */}
        <div className="media-suite-tabs-list" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, minWidth: 0 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`media-suite-tab-btn ${isActive ? 'active' : ''}`}
                style={{ height: '44px', minHeight: '44px' }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Zoom</span>
          <button 
            onClick={() => {
              const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--revenue-zoom') || '1');
              document.documentElement.style.setProperty('--revenue-zoom', Math.max(0.7, currentScale - 0.1).toString());
            }}
            style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', outline: 'none' }}
          >
            -
          </button>
          <button 
            onClick={() => {
              const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--revenue-zoom') || '1');
              document.documentElement.style.setProperty('--revenue-zoom', Math.min(1.4, currentScale + 0.1).toString());
            }}
            style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', outline: 'none' }}
          >
            +
          </button>
        </div>
      </header>

      <div className="media-suite-content-area">
        <div style={{
          transform: 'scale(var(--revenue-zoom, 1))',
          transformOrigin: 'top left',
          width: 'calc(100% / var(--revenue-zoom, 1))',
          height: 'calc(100% / var(--revenue-zoom, 1))',
          transition: 'transform 0.15s ease'
        }}>
          {activeTab === 'lead-hub' && (
            <LeadHubTab 
              language={language} 
              setLeadData={setSelectedLead} 
              onNextStep={(next) => setActiveTab(next === 'chief' ? 'ai-revenue-chief' : 'lead-hub')} 
            />
          )}
          {activeTab === 'ai-revenue-chief' && (
            <AIRevenueChiefTab
              language={language}
              leadData={selectedLead}
              setChiefResult={setChiefResult}
              // Con Call Intelligence apagado, el paso siguiente salta directo
              // a propuestas: el flujo no puede dejar al coach en una pestaña
              // que ya no existe.
              onNextStep={(next) => setActiveTab(
                next === 'call'
                  ? (CALL_INTELLIGENCE_HABILITADO ? 'call-intelligence' : 'deals-and-proposals')
                  : 'ai-revenue-chief'
              )}
            />
          )}
          {CALL_INTELLIGENCE_HABILITADO && activeTab === 'call-intelligence' && (
            <CallIntelligenceTab
              language={language}
              setCallResult={setCallResult}
              onNextStep={(next) => setActiveTab(next === 'closing' ? 'deals-and-proposals' : 'call-intelligence')}
            />
          )}
          {activeTab === 'deals-and-proposals' && (
            <DealsAndProposalsTab
              language={language}
              callResult={callResult}
            />
          )}
          {activeTab === 'scoring-criteria' && (
            <LeadScoringCriteriaTab language={language} />
          )}
        </div>
      </div>
    </div>
  );
}
