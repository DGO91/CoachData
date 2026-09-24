import React from 'react';
import { Sliders, Check, FileBarChart } from 'lucide-react';

export function ReportingPreferencesCard({ reportingPreferences = {}, onChange, language = 'es' }) {
  const detailLevel = reportingPreferences.detail_level || 'standard';
  const includeRecommendations = reportingPreferences.include_recommendations !== false;
  const includeMetrics = reportingPreferences.include_metrics !== false;

  const updateField = (field, value) => {
    onChange('reporting_preferences', {
      ...reportingPreferences,
      [field]: value
    });
  };

  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <FileBarChart size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Preferencias de Reportes' : 'Reporting Preferences'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Configura la densidad de información en los reportes diarios y semanales' : 'Configure density of daily/weekly automated digests'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Detail level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Sliders size={14} className="text-textMuted" />
            {language === 'es' ? 'Nivel de Detalle' : 'Detail Level'}
          </label>
          <select
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            value={detailLevel}
            onChange={(e) => updateField('detail_level', e.target.value)}
          >
            <option value="brief">Resumido (Executive Digest)</option>
            <option value="standard">Estándar (Recomendado)</option>
            <option value="detailed">Completo con Metadatos</option>
          </select>
        </div>

        {/* Include Recommendations */}
        <div
          onClick={() => updateField('include_recommendations', !includeRecommendations)}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
            includeRecommendations
              ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
              : 'bg-bgSurface border-borderColor text-textMuted'
          }`}
        >
          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
            includeRecommendations ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]' : 'border-borderColor'
          }`}>
            {includeRecommendations && <Check size={12} />}
          </div>
          <span className="text-xs">
            {language === 'es' ? 'Incluir Recomendaciones Clave' : 'Include Key Recommendations'}
          </span>
        </div>

        {/* Include Metrics */}
        <div
          onClick={() => updateField('include_metrics', !includeMetrics)}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
            includeMetrics
              ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
              : 'bg-bgSurface border-borderColor text-textMuted'
          }`}
        >
          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
            includeMetrics ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]' : 'border-borderColor'
          }`}>
            {includeMetrics && <Check size={12} />}
          </div>
          <span className="text-xs">
            {language === 'es' ? 'Incluir Métricas y KPIs' : 'Include Metrics & KPIs'}
          </span>
        </div>
      </div>
    </section>
  );
}
