import React from 'react';
import { CheckSquare, Target } from 'lucide-react';

const GOALS_OPTIONS = [
  { key: 'bottleneck_detection', label_es: 'Detección de Cuello de Botella Operativo', label_en: 'Operational Bottleneck Detection' },
  { key: 'funnel_maturity_assessment', label_es: 'Evaluación de Madurez del Embudo', label_en: 'Funnel Maturity Assessment' },
  { key: 'automation_prioritization', label_es: 'Priorización de Automatizaciones Clave', label_en: 'Automation Prioritization' },
  { key: 'client_retention_analysis', label_es: 'Análisis de Retención y Riesgo de Clientes', label_en: 'Client Retention & Churn Analysis' },
  { key: 'sales_conversion_improvement', label_es: 'Mejora de Conversión Comercial', label_en: 'Sales Conversion Improvement' },
  { key: 'operational_efficiency', label_es: 'Eficiencia Operativa y Capacidad', label_en: 'Operational Efficiency & Capacity' },
  { key: 'team_capacity_evaluation', label_es: 'Evaluación de Carga del Equipo', label_en: 'Team Capacity Evaluation' },
  { key: 'next_best_action', label_es: 'Sugerencia de Próximo Paso Comercial', label_en: 'Next Best Commercial Action' }
];

export function AnalysisGoalsCard({ analysisGoals = [], onChange, language = 'es' }) {
  const toggleGoal = (goalKey) => {
    let updated;
    if (analysisGoals.includes(goalKey)) {
      updated = analysisGoals.filter((g) => g !== goalKey);
    } else {
      updated = [...analysisGoals, goalKey];
    }
    onChange('analysis_goals', updated);
  };

  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <CheckSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Objetivos de Análisis Preferidos' : 'Preferred Analysis Goals'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Selecciona los enfoques estratégicos que la IA evaluará al analizar tu negocio' : 'Select key strategic goals evaluated by AI during analysis'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GOALS_OPTIONS.map((goal) => {
          const isSelected = analysisGoals.includes(goal.key);
          const label = language === 'es' ? goal.label_es : goal.label_en;
          return (
            <div
              key={goal.key}
              onClick={() => toggleGoal(goal.key)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                isSelected
                  ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
                  : 'bg-bgSurface border-borderColor text-textMuted hover:border-textMuted'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]' : 'border-borderColor'
              }`}>
                {isSelected && <Target size={12} />}
              </div>
              <span className="text-xs leading-tight">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
