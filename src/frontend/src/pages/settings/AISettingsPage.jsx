import React, { useState } from 'react';
import { Bot, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useOrganizationAISettings } from '../../hooks/useOrganizationAISettings';
import { AIIdentityCard } from '../../components/settings/AIIdentityCard';
import { IndustryConfigurationCard } from '../../components/settings/IndustryConfigurationCard';
import { ServiceCatalogCard } from '../../components/settings/ServiceCatalogCard';
import { AnalysisGoalsCard } from '../../components/settings/AnalysisGoalsCard';
import { CommunicationStyleCard } from '../../components/settings/CommunicationStyleCard';
import { ReportingPreferencesCard } from '../../components/settings/ReportingPreferencesCard';
import { PromptPreviewCard } from '../../components/settings/PromptPreviewCard';

export default function AISettingsPage({ language = 'es' }) {
  const {
    settings,
    setSettings,
    loading,
    saving,
    error,
    saveSettings,
    refreshSettings
  } = useOrganizationAISettings();

  const [toastMessage, setToastMessage] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const updateSettingField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
    setValidationError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    if (!settings.assistant_name || settings.assistant_name.trim().length < 3) {
      setValidationError(language === 'es' ? 'El Nombre del Asistente debe tener al menos 3 caracteres.' : 'Assistant Name must be at least 3 characters.');
      return;
    }
    if (!settings.business_name || !settings.business_name.trim()) {
      setValidationError(language === 'es' ? 'El Nombre de la Empresa es obligatorio.' : 'Business Name is required.');
      return;
    }
    if (!settings.industry_sector) {
      setValidationError(language === 'es' ? 'Selecciona un Sector o Industria.' : 'Select an Industry Sector.');
      return;
    }
    if (!Array.isArray(settings.service_catalog) || settings.service_catalog.length === 0) {
      setValidationError(language === 'es' ? 'Añade al menos un servicio al catálogo.' : 'Add at least one service to the catalog.');
      return;
    }
    if (!Array.isArray(settings.analysis_goals) || settings.analysis_goals.length === 0) {
      setValidationError(language === 'es' ? 'Selecciona al menos un objetivo de análisis.' : 'Select at least one analysis goal.');
      return;
    }

    try {
      await saveSettings(settings);
      setToastMessage(language === 'es' ? 'Configuración de IA por Organización guardada exitosamente.' : 'AI Organization Settings saved successfully.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-[var(--accent)]" size={28} />
        <span className="text-sm text-textMuted font-medium">
          {language === 'es' ? 'Cargando configuración de IA de la organización…' : 'Loading Organization AI Settings…'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-28">
      {/* PAGE HEADER */}
      <div className="glass-panel-inner p-6 flex items-center justify-between gap-4 border border-borderColor rounded-xl bg-bgSurface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-textMain tracking-tight">
              {language === 'es' ? 'Configuración de IA por Organización' : 'Organization AI Settings'}
            </h1>
            <p className="text-xs text-textMuted mt-0.5">
              {language === 'es'
                ? 'Personaliza la identidad, catálogo de servicios y reglas de análisis de tu asistente virtual multi-tenant.'
                : 'Customize the identity, service catalog and analysis rules of your multi-tenant virtual assistant.'}
            </p>
          </div>
        </div>
      </div>

      {/* ALERTS / BANNERS */}
      {toastMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 text-sm flex items-center gap-3 animate-fade-in">
          <Check size={18} />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {(error || validationError) && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle size={18} />
          <span className="font-semibold">{validationError || error}</span>
        </div>
      )}

      {/* FORM CARDS */}
      <form onSubmit={handleSave} className="flex flex-col gap-6 w-full">
        <AIIdentityCard settings={settings} onChange={updateSettingField} language={language} />
        <IndustryConfigurationCard settings={settings} onChange={updateSettingField} language={language} />
        <ServiceCatalogCard serviceCatalog={settings.service_catalog} onChange={updateSettingField} language={language} />
        <AnalysisGoalsCard analysisGoals={settings.analysis_goals} onChange={updateSettingField} language={language} />
        <CommunicationStyleCard communicationStyle={settings.communication_style} onChange={updateSettingField} language={language} />
        <ReportingPreferencesCard reportingPreferences={settings.reporting_preferences} onChange={updateSettingField} language={language} />
        <PromptPreviewCard settings={settings} language={language} />

        {/* BOTTOM SAVE CARD */}
        <div className="glass-panel-inner p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-borderColor rounded-xl bg-bgSurface">
          <span className="text-xs text-textMuted">
            {language === 'es' ? 'Los cambios aplicados actualizarán inmediatamente las respuestas de los agentes de IA.' : 'Saved changes dynamically update AI Agent responses.'}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {language === 'es' ? 'Guardando…' : 'Saving…'}
              </>
            ) : (
              <>
                <Save size={16} />
                {language === 'es' ? 'Guardar Configuración de IA' : 'Save AI Configuration'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
