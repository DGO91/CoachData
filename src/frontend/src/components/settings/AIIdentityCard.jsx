import React from 'react';
import { Bot, Building2, FileText, Cpu } from 'lucide-react';

const SECTORS = [
  { value: 'business_coach_consulting', label: 'Business Coach / Mentoring' },
  { value: 'marketing_agency', label: 'Marketing / Growth Agency' },
  { value: 'creative_studio', label: 'Creative Studio & Production' },
  { value: 'sales_consulting', label: 'Sales & Revenue Advisory' },
  { value: 'financial_consulting', label: 'Financial & Tax Advisory' },
  { value: 'legal_advisory', label: 'Legal & Compliance Advisory' },
  { value: 'health_wellness', label: 'Health & Wellness Coaching' },
  { value: 'education_training', label: 'Education & Training Institute' },
  { value: 'other', label: 'Otro Sector Personalizado' }
];

export function AIIdentityCard({ settings, onChange, language = 'es' }) {
  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Identidad del Asistente Virtual' : 'Virtual Assistant Identity'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Define el nombre del bot y el perfil corporativo de tu empresa' : 'Define assistant name and business profile'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assistant Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Bot size={14} className="text-textMuted" />
            {language === 'es' ? 'Nombre del Asistente *' : 'Assistant Name *'}
          </label>
          <input
            type="text"
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Growth & Operations Assistant"
            value={settings.assistant_name || ''}
            onChange={(e) => onChange('assistant_name', e.target.value)}
          />
        </div>

        {/* Business Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Building2 size={14} className="text-textMuted" />
            {language === 'es' ? 'Nombre de la Empresa *' : 'Business Name *'}
          </label>
          <input
            type="text"
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Mi Empresa / Mi Organización"
            value={settings.business_name || ''}
            onChange={(e) => onChange('business_name', e.target.value)}
          />
        </div>

        {/* Industry Sector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Cpu size={14} className="text-textMuted" />
            {language === 'es' ? 'Sector o Industria *' : 'Industry Sector *'}
          </label>
          <select
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            value={settings.industry_sector || 'business_coach_consulting'}
            onChange={(e) => onChange('industry_sector', e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Business Description */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <FileText size={14} className="text-textMuted" />
            {language === 'es' ? 'Descripción de la Empresa' : 'Business Description'}
          </label>
          <textarea
            rows={3}
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            placeholder="Describe brevemente a qué se dedica tu empresa y el valor que entregas…"
            maxLength={500}
            value={settings.business_description || ''}
            onChange={(e) => onChange('business_description', e.target.value)}
          />
          <span className="text-[10px] text-textMuted text-right">
            {(settings.business_description || '').length} / 500
          </span>
        </div>
      </div>
    </section>
  );
}
