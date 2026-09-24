import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

import { LEGAL_CONTENT } from '../utils/translations';

export default function LegalDocuments({ isOpen, onClose, type, language, isPage }) {
  if (!isOpen && !isPage) return null;

  const content = LEGAL_CONTENT[language] || LEGAL_CONTENT.es;
  const isTerms = type === 'terms';
  let title = content.privacy_title;
  let paragraphs = content.privacy_paragraphs;

  if (type === 'terms') {
    title = content.terms_title;
    paragraphs = content.terms_paragraphs;
  } else if (type === 'security') {
    title = content.security_title || (language === 'es' ? 'Centro de Seguridad' : 'Security Center');
    paragraphs = content.security_paragraphs || [
      {
        title: language === 'es' ? '1. Seguridad de la Infraestructura' : '1. Infrastructure Security',
        text: language === 'es'
          ? 'Toda la infraestructura de CoachData Media está construida sobre Supabase y Google Cloud Platform, utilizando cifrado AES-256 en reposo y TLS 1.3 en tránsito.'
          : 'All CoachData Media infrastructure is hosted on Supabase and Google Cloud Platform, using AES-256 encryption at rest and TLS 1.3 in transit.'
      },
      {
        title: language === 'es' ? '2. Aislamiento de Datos (RLS)' : '2. Data Isolation (RLS)',
        text: language === 'es'
          ? 'Implementamos políticas de seguridad a nivel de fila (Row-Level Security) estrictas en Supabase para garantizar que ningún cliente pueda acceder a datos de otros tenants.'
          : 'We implement strict Row-Level Security policies in Supabase to guarantee that no tenant can access other customers data.'
      }
    ];
  } else if (type === 'data-deletion') {
    title = content.data_deletion_title || (language === 'es' ? 'Solicitud de Eliminación de Datos' : 'Data Deletion Request');
    paragraphs = content.data_deletion_paragraphs || [
      {
        title: language === 'es' ? '1. Proceso de Eliminación' : '1. Deletion Process',
        text: language === 'es'
          ? 'Puedes solicitar la eliminación total de tu cuenta y datos asociados directamente desde tu Perfil o enviando un correo a info@coachdata.example.'
          : 'You can request the complete deletion of your account and associated data directly from your Profile or by emailing info@coachdata.example.'
      },
      {
        title: language === 'es' ? '2. Plazos de Conservación' : '2. Retention Timelines',
        text: language === 'es'
          ? 'Los datos de producción (credenciales, RAG de Memoria, etc.) son purgados en 30 días. Las copias de seguridad residuales se eliminan por completo en un plazo máximo de 90 días.'
          : 'Production data (credentials, Memory RAG, etc.) is purged within 30 days. Residual backup copies are completely deleted within 90 days.'
      }
    ];
  }

  if (isPage) {
    return (
      <div className="glass-panel-inner w-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-borderColor flex items-center gap-3 bg-bgMuted">
          {isTerms ? <FileText style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} /> : <Shield style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />}
          <h3 className="text-xl font-bold text-textMain m-0 agent-section-title">{title}</h3>
        </div>

        {/* Body */}
        <div className="p-8 max-h-[75vh] overflow-y-auto text-sm leading-relaxed text-textMuted custom-scrollbar">
          <div className="text-xs text-textMuted mb-6 italic opacity-70">
            {content.last_updated}
          </div>
          
          {paragraphs.map((p, idx) => (
            <div key={idx} className="mb-8 last:mb-0">
              <h4 className="text-textMain text-base font-bold mb-3 mt-0 agent-section-title">
                {p.title}
              </h4>
              <p className="m-0 opacity-90 leading-loose">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl max-h-[85vh] flex flex-col border border-borderColor rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-borderColor flex items-center justify-between bg-bgMuted">
          <div className="flex items-center gap-3">
            {isTerms ? <FileText style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} /> : <Shield style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />}
            <h3 className="text-xl font-bold text-textMain m-0 agent-section-title">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-textMuted hover:bg-bgSurface hover:text-textMain transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto text-sm leading-relaxed text-textMuted custom-scrollbar flex-1 bg-bgMain">
          <div className="text-xs text-textMuted mb-6 italic opacity-70">
            {content.last_updated}
          </div>
          
          {paragraphs.map((p, idx) => (
            <div key={idx} className="mb-8 last:mb-0">
              <h4 className="text-textMain text-base font-bold mb-3 mt-0 agent-section-title">
                {p.title}
              </h4>
              <p className="m-0 opacity-90 leading-loose">{p.text}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-borderColor flex justify-end bg-bgMuted">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-borderColor bg-bgSurface text-textMain text-sm font-bold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-sm"
          >
            {content.close}
          </button>
        </div>
      </div>
    </div>
  );
}
