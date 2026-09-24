import React, { useState } from 'react';
import { Eye, Copy, Check } from 'lucide-react';

export function PromptPreviewCard({ settings, language = 'es' }) {
  const [copied, setCopied] = useState(false);

  const assistantName = settings.assistant_name || 'Growth & Operations Assistant';
  const businessName = settings.business_name || 'Mi Organización';
  const description = settings.business_description || 'Servicios profesionales de consultoría';
  const sector = settings.industry_sector || 'business_coach_consulting';
  const targetProfile = settings.target_client_profile || 'Clientes ideales no especificados';
  const services = Array.isArray(settings.service_catalog) && settings.service_catalog.length > 0
    ? settings.service_catalog.join(', ')
    : 'Lead follow-up systems, Sales pipeline optimization';
  const goals = Array.isArray(settings.analysis_goals) && settings.analysis_goals.length > 0
    ? settings.analysis_goals.join(', ')
    : 'bottleneck_detection, funnel_maturity_assessment';
  const tone = settings.communication_style?.tone || 'executive';
  const style = settings.communication_style?.style || 'balanced';

  const previewText = `You are ${assistantName}, an operational and growth analysis assistant working for ${businessName}.

Business Context:
- Industry Sector: ${sector}
- Description: ${description}
- Target Client Profile: ${targetProfile}
- Service Catalog: [${services}]

Analysis Goals:
- [${goals}]

Tone & Style Directives:
- Tone: ${tone}
- Style: ${style}
- Output Language: ${settings.communication_style?.language || 'es'}

Strict Directives:
1. Speak exclusively on behalf of ${businessName} based on the configured business context.
2. Do not assume the business sells services or automation outside the service catalog: [${services}].
3. Keep the tone executive, professional and actionable.
4. Return strictly valid JSON containing: summary, maturityLevel, mainBottleneck, estimatedImpact, recommendedFunnel, priorityAutomations, implementationRisks, nextCommercialStep.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-4 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Vista Previa del System Prompt (Tiempo Real)' : 'Real-Time System Prompt Preview'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Instrucciones dinámicas reales que recibirá el AI Orchestrator al analizar prospectos' : 'Actual dynamic instructions consumed by AI Orchestrator'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 bg-bgMuted hover:bg-bgSurface text-textMain border border-borderColor rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar Prompt' : 'Copy Prompt')}
        </button>
      </div>

      <pre className="w-full p-4 bg-black/40 border border-borderColor rounded-lg font-mono text-xs text-textMain/90 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto select-all">
        {previewText}
      </pre>
    </section>
  );
}
