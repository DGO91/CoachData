import React, { useState } from 'react';
import { Bot, Check, ArrowRight, ArrowLeft, Building2, Target, Layers, CheckCircle2, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthProvider';
import { useNotifications } from '../../components/common/Notifications';

const BUSINESS_TYPES = [
  { id: 'business_coach', label_es: 'Business Coach', label_en: 'Business Coach' },
  { id: 'consultant', label_es: 'Consultor Estratégico', label_en: 'Strategic Consultant' },
  { id: 'strategist', label_es: 'Estratega de Ventas / Growth', label_en: 'Growth & Sales Strategist' },
  { id: 'mentor', label_es: 'Mentor de Negocios High-Ticket', label_en: 'High-Ticket Business Mentor' },
  { id: 'agency', label_es: 'Agencia de Servicios Premium', label_en: 'Premium Services Agency' }
];

const DEFAULT_SERVICES = [
  'Lead follow-up systems',
  'Sales pipeline optimization',
  'Discovery call conversion',
  'Client onboarding automation',
  'VIP client ascension',
  'Operational reporting'
];

const GOALS = [
  { id: 'increase_leads', label_es: 'Conseguir más prospectos calificados', label_en: 'Generate more qualified leads' },
  { id: 'convert_calls', label_es: 'Convertir más llamadas de descubrimiento', label_en: 'Convert more discovery calls' },
  { id: 'follow_up', label_es: 'Hacer seguimiento comercial consistente', label_en: 'Consistent sales follow-up' },
  { id: 'onboarding', label_es: 'Automatizar onboarding de clientes', label_en: 'Automate client onboarding' },
  { id: 'retention', label_es: 'Mejorar retención de clientes activos', label_en: 'Improve active client retention' },
  { id: 'reports', label_es: 'Tener reportes ejecutivos automáticos', label_en: 'Get automated executive reports' }
];

export default function BusinessCoachOnboarding({ language = 'es', onComplete }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const { sessionUser, userProfile, supabaseClient } = useAuth();
  const organizationId = userProfile?.organization_id || sessionUser?.user_metadata?.organization_id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Form State
  const [businessType, setBusinessType] = useState('business_coach');
  const [businessName, setBusinessName] = useState(userProfile?.organization_name || 'Mi Consultora de Negocios');
  const [businessDescription, setBusinessDescription] = useState('Servicios de coaching y consultoría estratégica para negocios.');
  const [targetClients, setTargetClients] = useState('Coaches individuales, consultores independientes y agencias de servicios.');
  const [selectedServices, setSelectedServices] = useState(DEFAULT_SERVICES);
  const [primaryGoal, setPrimaryGoal] = useState('increase_leads');
  const [assistantName, setAssistantName] = useState('Growth & Operations Assistant');

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 6));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinishOnboarding = async () => {
    if (!supabaseClient || !organizationId) {
      notify(language === 'es' ? 'Error: Sin organización activa' : 'Error: No active organization');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        business_name: businessName || 'Mi Negocio de Consultoría',
        business_description: businessDescription,
        industry_sector: 'business_coach_consulting',
        target_client_profile: targetClients,
        service_catalog: selectedServices,
        analysis_goals: [
          'bottleneck_detection',
          'sales_conversion_improvement',
          'funnel_maturity_assessment',
          'automation_prioritization',
          'client_retention_analysis',
          'next_best_action'
        ],
        communication_style: {
          tone: 'executive',
          style: 'balanced',
          language
        },
        reporting_preferences: {
          detail_level: 'standard',
          include_recommendations: true,
          include_metrics: true,
          delivery_channel: 'whatsapp',
          daily_report_enabled: true,
          weekly_report_enabled: true,
          delivery_time: '08:00',
          timezone: 'Europe/Madrid'
        },
        assistant_name: assistantName || 'Growth & Operations Assistant',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from('organization_ai_settings')
        .upsert(payload, { onConflict: 'organization_id' });

      if (error) throw error;

      setCompleted(true);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('[BusinessCoachOnboarding] Save error:', err);
      notify(err.message || 'Error al completar el onboarding');
    } finally {
      setSaving(false);
    }
  };

  if (completed) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 flex flex-col gap-6 animate-fade-in">
        <div className="glass-panel-inner p-8 flex flex-col items-center text-center gap-4 border border-borderColor rounded-xl bg-bgSurface">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center border border-green-500/30">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-2xl font-bold text-textMain">
            {language === 'es' ? '¡Entorno Operativo Configurado con Éxito!' : 'Operational Environment Ready!'}
          </h2>
          <p className="text-sm text-textMuted max-w-xl">
            {language === 'es'
              ? 'Tu asistente virtual multi-tenant ha sido personalizado y tu catálogo de servicios se encuentra listo para analizar prospectos y enviar reportes automáticos.'
              : 'Your multi-tenant virtual assistant is now configured and ready to analyze prospects and generate reports.'}
          </p>

          {/* Internal Welcome Preview Box */}
          <div className="w-full text-left p-4 bg-black/40 border border-borderColor rounded-lg font-mono text-xs text-textMain/90 whitespace-pre-wrap leading-relaxed mt-2 select-all">
            {`[${assistantName}]

Tu entorno operativo para coaches y consultores ha sido configurado correctamente.

Empresa: ${businessName}
Servicios activados:
${selectedServices.map(s => `• ${s}`).join('\n')}

Reportes automáticos:
• Daily Operations Report (08:00 Europe/Madrid)
• Weekly Executive Summary

Puedes modificar cualquier configuración desde Settings → AI.`}
          </div>

          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/ai-settings');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="mt-4 px-6 py-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {language === 'es' ? 'Ir a Configuración de IA' : 'Go to AI Settings'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 flex flex-col gap-6 animate-fade-in">
      {/* Header & Step Indicator */}
      <div className="glass-panel-inner p-6 border border-borderColor rounded-xl bg-bgSurface flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-textMain tracking-tight">
              {language === 'es' ? 'Onboarding para Business Coaches & Consultores' : 'Business Coach Onboarding'}
            </h1>
            <p className="text-xs text-textMuted">
              {language === 'es' ? `Paso ${step} de 6 — Configuración inicial de IA` : `Step ${step} of 6 — Initial AI Setup`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-all ${
                i === step
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : i < step
                  ? 'bg-textMuted border-textMuted'
                  : 'bg-bgMuted border-borderColor'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP CONTENT CARDS */}
      <div className="glass-panel-inner p-8 border border-borderColor rounded-xl bg-bgSurface flex flex-col gap-6">
        {/* Step 1: Business Type */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '1. Selecciona tu Tipo de Negocio Principal' : '1. Select Main Business Type'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <div
                  key={bt.id}
                  onClick={() => setBusinessType(bt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    businessType === bt.id
                      ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
                      : 'bg-bgSurface border-borderColor text-textMuted hover:border-textMuted'
                  }`}
                >
                  <span className="text-sm">{language === 'es' ? bt.label_es : bt.label_en}</span>
                  {businessType === bt.id && <Check size={16} className="text-[var(--accent)]" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Business Name & Description */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '2. Datos Principales de la Empresa' : '2. Business Details'}
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-textMain">{language === 'es' ? 'Nombre de la Empresa *' : 'Business Name *'}</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)]"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-textMain">{language === 'es' ? 'Nombre del Asistente IA' : 'AI Assistant Name'}</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)]"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-textMain">{language === 'es' ? 'Descripción Breve' : 'Short Description'}</label>
                <textarea
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] resize-none"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Target Clients */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '3. Define tu Cliente Ideal' : '3. Define Ideal Target Client'}
            </h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-textMain">{language === 'es' ? 'Perfil de Cliente Ideal (ICP)' : 'Ideal Client Profile Description'}</label>
              <textarea
                rows={4}
                className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] resize-none"
                value={targetClients}
                onChange={(e) => setTargetClients(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Services Offered */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '4. Selecciona tus Servicios Ofrecidos' : '4. Select Offered Services'}
            </h2>
            <div className="flex flex-col gap-2">
              {DEFAULT_SERVICES.map((service) => {
                const isChecked = selectedServices.includes(service);
                return (
                  <div
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
                        : 'bg-bgSurface border-borderColor text-textMuted'
                    }`}
                  >
                    <span className="text-sm">{service}</span>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]' : 'border-borderColor'
                    }`}>
                      {isChecked && <Check size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Primary Goal */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '5. Selecciona tu Objetivo Principal' : '5. Primary Objective'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setPrimaryGoal(g.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    primaryGoal === g.id
                      ? 'bg-bgMuted border-[var(--accent)] text-textMain font-semibold'
                      : 'bg-bgSurface border-borderColor text-textMuted'
                  }`}
                >
                  <span className="text-xs">{language === 'es' ? g.label_es : g.label_en}</span>
                  {primaryGoal === g.id && <Check size={16} className="text-[var(--accent)]" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Summary & Confirmation */}
        {step === 6 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-textMain">
              {language === 'es' ? '6. Resumen de Configuración' : '6. Configuration Summary'}
            </h2>
            <div className="flex flex-col gap-3 p-4 bg-bgMuted border border-borderColor rounded-xl text-xs text-textMain">
              <div><strong>{language === 'es' ? 'Empresa:' : 'Business:'}</strong> {businessName}</div>
              <div><strong>{language === 'es' ? 'Asistente IA:' : 'AI Assistant:'}</strong> {assistantName}</div>
              <div><strong>{language === 'es' ? 'Sector:' : 'Sector:'}</strong> Business Coach / Consulting</div>
              <div><strong>{language === 'es' ? 'Servicios:' : 'Services:'}</strong> {selectedServices.join(', ')}</div>
              <div><strong>{language === 'es' ? 'Cliente Ideal:' : 'Target ICP:'}</strong> {targetClients}</div>
            </div>
          </div>
        )}

        {/* NAVIGATION CONTROLS */}
        <div className="flex items-center justify-between border-t border-borderColor pt-4 mt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 bg-bgMuted border border-borderColor rounded-lg text-xs font-semibold text-textMain flex items-center gap-1.5 hover:bg-bgSurface transition-colors"
            >
              <ArrowLeft size={14} />
              {language === 'es' ? 'Anterior' : 'Back'}
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              {language === 'es' ? 'Siguiente' : 'Next'}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={saving}
              className="px-6 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {language === 'es' ? 'Guardando…' : 'Saving…'}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {language === 'es' ? 'Completar Onboarding' : 'Complete Setup'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
