import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../infrastructure/auth/AuthProvider';

const DEFAULT_SETTINGS = {
  assistant_name: 'Growth & Operations Assistant',
  business_name: '',
  business_description: '',
  industry_sector: 'business_coach_consulting',
  target_client_profile: 'Business coaches, consultants, strategists and premium service providers',
  service_catalog: [
    'Lead follow-up systems',
    'Sales pipeline optimization',
    'Client onboarding automation',
    'Operational reporting'
  ],
  analysis_goals: [
    'bottleneck_detection',
    'funnel_maturity_assessment',
    'automation_prioritization',
    'next_best_action'
  ],
  communication_style: {
    tone: 'executive',
    style: 'balanced',
    language: 'es'
  },
  reporting_preferences: {
    detail_level: 'standard',
    include_recommendations: true,
    include_metrics: true
  },
  whatsapp_signature: ''
};

export function useOrganizationAISettings() {
  const { sessionUser, userProfile, supabaseClient } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const organizationId = userProfile?.organization_id || sessionUser?.user_metadata?.organization_id;

  const fetchSettings = useCallback(async () => {
    if (!supabaseClient || !organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabaseClient
        .from('organization_ai_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          service_catalog: Array.isArray(data.service_catalog) ? data.service_catalog : DEFAULT_SETTINGS.service_catalog,
          analysis_goals: Array.isArray(data.analysis_goals) ? data.analysis_goals : DEFAULT_SETTINGS.analysis_goals,
          communication_style: data.communication_style || DEFAULT_SETTINGS.communication_style,
          reporting_preferences: data.reporting_preferences || DEFAULT_SETTINGS.reporting_preferences,
        });
      } else {
        setSettings({
          ...DEFAULT_SETTINGS,
          business_name: userProfile?.organization_name || 'Mi Organización',
        });
      }
    } catch (err) {
      console.error('[useOrganizationAISettings] Fetch error:', err);
      setError(err.message || 'Error al cargar la configuración de IA');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, organizationId, userProfile]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings) => {
    if (!supabaseClient || !organizationId) {
      throw new Error('Sin contexto de organización válido');
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organizationId,
        business_name: newSettings.business_name || 'Mi Organización',
        business_description: newSettings.business_description || '',
        industry_sector: newSettings.industry_sector || 'business_coach_consulting',
        target_client_profile: newSettings.target_client_profile || '',
        service_catalog: newSettings.service_catalog || [],
        analysis_goals: newSettings.analysis_goals || [],
        communication_style: newSettings.communication_style || {},
        reporting_preferences: newSettings.reporting_preferences || {},
        assistant_name: newSettings.assistant_name || 'Operations Assistant',
        whatsapp_signature: newSettings.whatsapp_signature || '',
        updated_at: new Date().toISOString()
      };

      const { data, error: saveErr } = await supabaseClient
        .from('organization_ai_settings')
        .upsert(payload, { onConflict: 'organization_id' })
        .select()
        .single();

      if (saveErr) throw saveErr;

      setSettings((prev) => ({ ...prev, ...data }));
      return data;
    } catch (err) {
      console.error('[useOrganizationAISettings] Save error:', err);
      setError(err.message || 'Error al guardar la configuración de IA');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    loading,
    saving,
    error,
    saveSettings,
    refreshSettings: fetchSettings
  };
}
