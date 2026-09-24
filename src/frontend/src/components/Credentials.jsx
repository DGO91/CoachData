import React, { useState, useEffect } from 'react';
import { CreditCard, Mail, AppWindow, Database, Users, Info, RefreshCw, FileText, CalendarDays } from 'lucide-react';
import WhatsAppEvolutionConnect from './WhatsAppEvolutionConnect';
import { supabase } from '../supabaseClient';

import { CREDENTIALS_TRANSLATIONS } from '../utils/translations';
import { Header } from './credentials/Header';
import { ProviderKeyField } from './credentials/ProviderKeyField';
import IntegrationsGrid from './credentials/IntegrationsGrid';
import ConnectionsList from './credentials/ConnectionsList';
import { withStatus, LIVE_COUNT, TOTAL_COUNT, CONFIGURED_SENTINEL } from '../core/config/integrations.registry';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function Credentials({ language, userProfile, isAdmin }) {
  const t = (key, params = {}) => {
    let text = CREDENTIALS_TRANSLATIONS[language]?.[key] || key;
    if (!isAdmin) {
      if (key === 'title') text = language === 'en' ? 'Security Vault' : 'Bóveda de Seguridad';
      if (key === 'subtitle') text = language === 'en' ? 'Connect your tools securely. All keys are securely saved and encrypted.' : 'Conecta tus herramientas de forma segura. Todas las llaves se guardarán de forma cifrada.';
    }
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  };
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [keys, setKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { text, isError }
  const [canonicalStats, setCanonicalStats] = useState({ contacts: 0, payments: 0, sessions: 0, forms: 0 });
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchCanonicalStats = async () => {
    try {
      const res = await fetch('/api/integrations/status', { headers: await authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stats) {
        setCanonicalStats(data.stats);
      }
    } catch (err) {
      console.error('[Credentials] Failed to load canonical stats:', err);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      let totalSynced = 0;
      for (const prov of ['stripe', 'calendly', 'tally', 'kajabi']) {
        const res = await fetch('/api/integrations/trigger-backfill', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ providerId: prov, sinceDays: 90 }),
        });
        if (res.ok) {
          const d = await res.json();
          totalSynced += (d.ingested || 0);
        }
      }
      await fetchCanonicalStats();
      setStatusMsg({
        isError: false,
        text: language === 'es' ? `Sincronización completada: ${totalSynced} registros actualizados en la plataforma.` : `Sync completed: ${totalSynced} records updated in the platform.`
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err) {
      setStatusMsg({ isError: true, text: `Error: ${err.message}` });
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setSyncingAll(false);
    }
  };

  useEffect(() => {
    if (userProfile?.id) {
      resolveTenant();
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedTenant) {
      fetchKeys(selectedTenant);
      fetchCanonicalStats();
    } else {
      setKeys({});
    }
  }, [selectedTenant]);

  // The tenant's own id is NOT the same as the user's id in every case (two
  // tenant-creation conventions coexist server-side) — always resolve it from
  // the backend instead of assuming userProfile.id, which was silently wrong
  // for tenants created via the admin flow.
  const resolveTenant = async () => {
    try {
      const res = await fetch('/api/tenant-vault/me', { headers: await authHeaders() });
      if (!res.ok) throw new Error(`Failed to resolve tenant (${res.status})`);
      const data = await res.json();
      setSelectedTenant(data.id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchKeys = async (tenantId) => {
    try {
      const res = await fetch('/api/tenant-vault/keys', { headers: await authHeaders() });
      const data = await res.json();
      const keysMap = {};
      data.forEach(k => {
        keysMap[k.provider_name] = k.api_key_decrypted;
      });
      setKeys(keysMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (provider_name, value) => {
    setKeys(prev => {
      const oldVal = prev[provider_name];
      if (oldVal === CONFIGURED_SENTINEL) {
        if (value.includes(CONFIGURED_SENTINEL)) {
          const newChar = value.replace(CONFIGURED_SENTINEL, '');
          return { ...prev, [provider_name]: newChar };
        }
        return { ...prev, [provider_name]: value };
      }
      return { ...prev, [provider_name]: value };
    });
  };

  // El arranque de OAuth es una navegación del navegador, y una navegación no
  // lleva cabecera Authorization. Por eso no se puede enlazar directamente a
  // /google/start protegido: primero se pide por fetch (con Bearer) un `state`
  // firmado, y solo entonces se navega. El tenantId lo valida el backend
  // contra `tenants.auth_user_id` — ya no viaja por la query.
  const [connecting, setConnecting] = useState(null);

  const handleGoogleConnect = async (type) => {
    const es = language !== 'en';
    const targetTenant = selectedTenant || userProfile?.id;

    if (!targetTenant) {
      setStatusMsg({ isError: true, text: es
        ? 'Todavía no se ha resuelto tu sesión. Recarga la página e inténtalo de nuevo.'
        : 'Your session has not been resolved yet. Reload the page and try again.' });
      return;
    }

    setConnecting(type);
    try {
      const res = await fetch('/api/auth/google/prepare', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ tenantId: targetTenant, type }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const errorData = contentType.includes('application/json') ? await res.json() : {};
        throw new Error(errorData.message || (res.status === 403
          ? (es ? 'no tienes permiso sobre esta organización' : 'you do not have permission over this organization')
          : `HTTP ${res.status}`));
      }

      const { state } = await res.json();
      if (!state) throw new Error(es ? 'el servidor no devolvió un state válido' : 'server did not return a valid state');

      window.location.href = `/api/auth/google/start?state=${encodeURIComponent(state)}`;
    } catch (err) {
      setConnecting(null);
      setStatusMsg({ isError: true, text: es
        ? `No se pudo iniciar la conexión con Google: ${err.message}`
        : `Could not start the Google connection: ${err.message}` });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleSave = async (provider_type, provider_name) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/tenant-vault/keys', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          provider_type,
          provider_name,
          api_key_plaintext: keys[provider_name] || ''
        })
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setStatusMsg({ text: t('alert_success', { provider: provider_name }), isError: false });
      // Releer del backend: el badge pasa a «Conectado» por lo que hay guardado
      // en client_provider_keys, no por lo que quedó escrito en el input.
      await fetchKeys(selectedTenant);
    } catch (err) {
      setStatusMsg({ text: t('alert_error'), isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const [activeTab, setActiveTab] = useState('crm');
  // Los modulos quedan plegados: la lista de arriba es la via principal.
  const [mostrarModulos, setMostrarModulos] = useState(false);

  if (loading) return <div className="view-content"><p>{t('loading')}</p></div>;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER */}
      <Header title={t('title')} subtitle={t('subtitle')} isAdmin={isAdmin} zeroKnowledgeBanner={t('zero_knowledge_banner')} />

      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '1rem',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            background: statusMsg.isError ? 'var(--crit-bg, rgba(239, 68, 68, 0.12))' : 'rgba(74, 222, 128, 0.12)',
            border: `1px solid ${statusMsg.isError ? 'var(--crit, #ef4444)' : '#4ade80'}`,
            color: statusMsg.isError ? 'var(--crit, #ef4444)' : '#4ade80',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Rejilla de conexiones: de un vistazo, que herramientas estan
          conectadas de verdad para esta organizacion. Los estados salen del
          mismo sitio que los campos de abajo, asi que no pueden discrepar. */}
      <IntegrationsGrid language={language} keys={keys} />

      {/* Panorama honesto de las integraciones. Durante meses el Vault ofrecio
          39 herramientas de las que solo 4 hacian algo: la gente guardaba su
          clave y creia que su negocio estaba conectado. */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
      >
        <Info size={17} style={{ color: 'var(--accent-ink, var(--accent))', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-muted)' }}>
          {language === 'es'
            ? `Estamos conectando las herramientas una a una. Ahora mismo funcionan ${LIVE_COUNT} de ${TOTAL_COUNT}: las marcadas como Disponible puedes conectarlas ya, y pasan a Conectado en cuanto guardas tu clave. Las que ponen Próximamente no te piden la clave todavía, porque nadie la leería.`
            : `We are connecting tools one by one. ${LIVE_COUNT} of ${TOTAL_COUNT} work today: the ones marked Available are ready for you to connect, and turn to Connected once you save your key. The ones marked Coming soon do not ask for your key yet, because nothing would read it.`}
        </p>
      </div>

      {selectedTenant ? (
        <div className="flex flex-col gap-6">

          {/* Lista de conexiones: una fila por herramienta, con su estado y su
              accion. Es la via principal para conectar; los modulos de abajo se
              conservan porque Google (OAuth), WhatsApp (QR) y las claves de IA
              tienen flujos propios que una fila de «pega tu clave» no cubre. */}
          <ConnectionsList
            language={language}
            keys={keys}
            saving={saving}
            onKeyChange={handleKeyChange}
            onSave={handleSave}
            onChooseProvider={(providerType, providerField, id) => {
              handleKeyChange(providerField, id);
              handleSave(providerType, providerField);
            }}
            tenantId={selectedTenant}
            onNangoConnected={async (nombre) => {
              setStatusMsg({
                isError: false,
                text: language === 'es'
                  ? `${nombre} conectado. Ya puedes cerrar esta ventana.`
                  : `${nombre} connected. You can close this window.`,
              });
              // Releer del backend: la fila pasa a «Conectado» por lo que quedó
              // guardado, no por lo que creemos que pasó en el popup.
              await fetchKeys(selectedTenant);
              setTimeout(() => setStatusMsg(null), 5000);
            }}
            onNangoError={(mensaje) => {
              setStatusMsg({ isError: true, text: mensaje });
              setTimeout(() => setStatusMsg(null), 6000);
            }}
          />

          <button
            type="button"
            onClick={() => setMostrarModulos((v) => !v)}
            style={{
              alignSelf: 'flex-start', height: '34px', padding: '0 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-surface)',
              color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {mostrarModulos
              ? (language === 'es' ? 'Ocultar ajustes avanzados' : 'Hide advanced settings')
              : (language === 'es' ? 'Ajustes avanzados por módulo' : 'Advanced settings by module')}
          </button>

          {mostrarModulos && (
          <>
          {/* TABS */}
          <div className="flex flex-wrap items-center gap-3 mb-2 pb-2">
            {[
              { id: 'crm', label: t('mod_a'), icon: <Mail size={16}/> },
              { id: 'payments', label: t('mod_b'), icon: <CreditCard size={16}/> },
              { id: 'operations', label: t('mod_c'), icon: <AppWindow size={16}/> },
              { id: 'ai', label: t('mod_ai'), icon: <Database size={16}/> },
              { id: 'whatsapp', label: t('mod_d'), icon: <Users size={16}/> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border whitespace-nowrap rounded-xl ${activeTab === tab.id ? 'bg-bgMain/80 shadow-sm' : 'text-textMuted border-transparent hover:bg-bgMain/30 hover:text-textMain'}`}
                style={activeTab === tab.id ? { color: 'var(--accent-ink, var(--accent))', borderColor: 'var(--accent)' } : { borderColor: 'transparent' }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass-panel-inner p-8">
            
            {/* TAB: CRM & EMAIL */}
            {activeTab === 'crm' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-borderColor/50 pb-4">
                  <Mail size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                  <h3 className="text-xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('mod_a')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <ProviderKeyField
                    label="CRM Provider"
                    options={withStatus([{id:'hubspot',name:'HubSpot'},{id:'gohighlevel',name:'GoHighLevel'},{id:'salesforce',name:'Salesforce'},{id:'pipedrive',name:'Pipedrive'},{id:'keap',name:'Keap'},{id:'notion',name:'Notion'}])}
                    selectValue={keys['crm_provider']}
                    onSelectChange={(val) => { handleKeyChange('crm_provider', val); handleSave('crm', 'crm_provider'); }}
                    selectPlaceholder="CRM"
                    inputValue={keys['crm_api']}
                    onInputChange={(val) => handleKeyChange('crm_api', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('crm', 'crm_api')}
                    saving={saving}
                    language={language}
                  />

                  <ProviderKeyField
                    label="Email Provider"
                    options={withStatus([{id:'activecampaign',name:'ActiveCampaign'},{id:'mailchimp',name:'Mailchimp'},{id:'convertkit',name:'ConvertKit'},{id:'klaviyo',name:'Klaviyo'},{id:'sendgrid',name:'SendGrid'}])}
                    selectValue={keys['email_provider']}
                    onSelectChange={(val) => { handleKeyChange('email_provider', val); handleSave('crm', 'email_provider'); }}
                    selectPlaceholder="Email"
                    inputValue={keys['email_api']}
                    onInputChange={(val) => handleKeyChange('email_api', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('crm', 'email_api')}
                    saving={saving}
                    language={language}
                  />

                  <ProviderKeyField
                    label="Forms Ingestion"
                    options={withStatus([{id:'typeform',name:'Typeform'},{id:'tally',name:'Tally.so'},{id:'jotform',name:'Jotform'},{id:'googleforms',name:'Google Forms'}])}
                    selectValue={keys['form_provider']}
                    onSelectChange={(val) => { handleKeyChange('form_provider', val); handleSave('crm', 'form_provider'); }}
                    selectPlaceholder="Form"
                    inputValue={keys['form_secret']}
                    onInputChange={(val) => handleKeyChange('form_secret', val)}
                    inputPlaceholder={t('placeholder_secret')}
                    onSave={() => handleSave('crm', 'form_secret')}
                    saving={saving}
                    language={language}
                  />

                  {/* La agenda es el corazón del coaching: de aquí salen las
                      sesiones que el coach ve en su dashboard.
                      Sin selector: hoy solo hay Calendly, y un desplegable de
                      una sola opción deja el campo desbloqueado hasta que el
                      usuario elige — es decir, aceptaría una clave que nadie
                      lee. Con `providerKey` el estado es fijo desde el primer
                      render. */}
                  <ProviderKeyField
                    label={language === 'es' ? 'Agenda y Reservas (Calendly)' : 'Scheduling (Calendly)'}
                    providerKey="scheduling_secret"
                    inputValue={keys['scheduling_secret']}
                    onInputChange={(val) => handleKeyChange('scheduling_secret', val)}
                    inputPlaceholder={t('placeholder_secret')}
                    onSave={() => handleSave('scheduling', 'scheduling_secret')}
                    saving={saving}
                    language={language}
                  />
                </div>
              </div>
            )}

            {/* TAB: PAYMENTS & INVOICING */}
            {activeTab === 'payments' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-borderColor/50 pb-4">
                  <CreditCard size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                  <h3 className="text-xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('mod_b')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProviderKeyField
                    options={withStatus([{id:'stripe',name:'Stripe'},{id:'paypal',name:'PayPal'},{id:'hotmart',name:'Hotmart'},{id:'thrivecart',name:'ThriveCart'},{id:'razorpay',name:'Razorpay'},{id:'mercadopago',name:'MercadoPago'}])}
                    selectValue={keys['gateway_provider']}
                    onSelectChange={(val) => { handleKeyChange('gateway_provider', val); handleSave('crm', 'gateway_provider'); }}
                    selectPlaceholder="-- Select Gateway --"
                    inputValue={keys['stripe_key']}
                    onInputChange={(val) => handleKeyChange('stripe_key', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('payment', 'stripe_key')}
                    saving={saving}
                    language={language}
                  />

                  <ProviderKeyField
                    options={withStatus([{id:'quaderno',name:'Quaderno'},{id:'taxjar',name:'TaxJar'},{id:'holded',name:'Holded'},{id:'facturadirecta',name:'FacturaDirecta'},{id:'quickbooks',name:'QuickBooks'},{id:'xero',name:'Xero'}])}
                    selectValue={keys['invoice_provider']}
                    onSelectChange={(val) => { handleKeyChange('invoice_provider', val); handleSave('crm', 'invoice_provider'); }}
                    selectPlaceholder="-- Select Invoicing --"
                    inputValue={keys['invoice_key']}
                    onInputChange={(val) => handleKeyChange('invoice_key', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('invoice', 'invoice_key')}
                    saving={saving}
                    language={language}
                  />
                </div>
              </div>
            )}

            {/* TAB: OPERATIONS & DELIVERY */}
            {activeTab === 'operations' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-borderColor/50 pb-4">
                  <AppWindow size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                  <h3 className="text-xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('mod_c')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProviderKeyField
                    options={withStatus([{id:'kajabi',name:'Kajabi'},{id:'skool',name:'Skool'},{id:'hotmartclub',name:'Hotmart Club'},{id:'wordpress',name:'WordPress'},{id:'notion',name:'Notion'}])}
                    selectValue={keys['portal_provider']}
                    onSelectChange={(val) => { handleKeyChange('portal_provider', val); handleSave('delivery', 'portal_provider'); }}
                    selectPlaceholder="-- Select Portal --"
                    inputValue={keys['delivery_key']}
                    onInputChange={(val) => handleKeyChange('delivery_key', val)}
                    inputPlaceholder={t('placeholder_url')}
                    onSave={() => handleSave('delivery', 'delivery_key')}
                    saving={saving}
                    language={language}
                  />

                  <ProviderKeyField
                    options={withStatus([{id:'zendesk',name:'Zendesk'},{id:'intercom',name:'Intercom'},{id:'whatsapp',name:'WhatsApp API'}])}
                    selectValue={keys['support_provider']}
                    onSelectChange={(val) => { handleKeyChange('support_provider', val); handleSave('crm', 'support_provider'); }}
                    selectPlaceholder="-- Select Support --"
                    inputValue={keys['support_key']}
                    onInputChange={(val) => handleKeyChange('support_key', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('delivery', 'support_key')}
                    saving={saving}
                    language={language}
                  />
                </div>
              </div>
            )}

            {/* TAB: AI */}
            {activeTab === 'ai' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-borderColor/50 pb-4">
                  <Database size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                  <h3 className="text-xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('mod_ai')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProviderKeyField
                    label="OpenAI API Key"
                    inputValue={keys['openai_key']}
                    onInputChange={(val) => handleKeyChange('openai_key', val)}
                    inputPlaceholder="sk-..."
                    onSave={() => handleSave('ai', 'openai_key')}
                    saving={saving}
                    providerKey="openai_key"
                    language={language}
                  />

                  <ProviderKeyField
                    label="Anthropic API Key"
                    inputValue={keys['anthropic_key']}
                    onInputChange={(val) => handleKeyChange('anthropic_key', val)}
                    inputPlaceholder="sk-ant-..."
                    onSave={() => handleSave('ai', 'anthropic_key')}
                    saving={saving}
                    providerKey="anthropic_key"
                    language={language}
                  />

                  <ProviderKeyField
                    label="ElevenLabs API Key"
                    inputValue={keys['elevenlabs_key']}
                    onInputChange={(val) => handleKeyChange('elevenlabs_key', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('ai', 'elevenlabs_key')}
                    saving={saving}
                    providerKey="elevenlabs_key"
                    language={language}
                  />

                  <ProviderKeyField
                    options={withStatus([{id:'groq',name:'Groq'},{id:'mistral',name:'Mistral'},{id:'gemini',name:'Google Gemini'},{id:'cohere',name:'Cohere'}])}
                    selectValue={keys['custom_llm_provider']}
                    onSelectChange={(val) => { handleKeyChange('custom_llm_provider', val); handleSave('ai', 'custom_llm_provider'); }}
                    selectPlaceholder="-- Additional LLM --"
                    inputValue={keys['custom_llm_key']}
                    onInputChange={(val) => handleKeyChange('custom_llm_key', val)}
                    inputPlaceholder={t('placeholder_key')}
                    onSave={() => handleSave('ai', 'custom_llm_key')}
                    saving={saving}
                    language={language}
                  />
                </div>
              </div>
            )}

            {/* TAB: WHATSAPP & GOOGLE */}
            {activeTab === 'whatsapp' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-borderColor/50 pb-4">
                  <Users size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                  <h3 className="text-xl font-bold text-textMain" style={{ fontFamily: "'Playfair Display', serif" }}>{t('mod_d')}</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT: GOOGLE OAUTH */}
                  {isAdmin && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-bgMain/30 p-6 rounded-xl border border-borderColor shadow-sm">
                        <label className="text-sm font-bold uppercase tracking-wider text-textMuted mb-4 block">{t('google_cal')}</label>
                        <div className="flex flex-col gap-4">
                          {(keys['google_calendar_oauth']) ? (
                            <div className="py-2 px-4 bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg flex items-center gap-2 text-sm font-bold">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              {t('connected')}
                            </div>
                          ) : (
                            <div className="py-2 px-4 bg-bgMain text-textMuted border border-borderColor rounded-lg text-sm font-bold">
                              {t('not_connected')}
                            </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleGoogleConnect('calendar')}
                            disabled={connecting !== null}
                            className="w-full py-3 text-center rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF', opacity: connecting !== null ? 0.6 : 1 }}
                          >
                            {connecting === 'calendar'
                              ? (language === 'en' ? 'Connecting…' : 'Conectando…')
                              : t('btn_connect_cal')}
                          </button>
                        </div>
                      </div>

                      <div className="bg-bgMain/30 p-6 rounded-xl border border-borderColor shadow-sm">
                        <label className="text-sm font-bold uppercase tracking-wider text-textMuted mb-4 block">{t('google_mail')}</label>
                        <div className="flex flex-col gap-4">
                          {(keys['google_mail_oauth']) ? (
                            <div className="py-2 px-4 bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg flex items-center gap-2 text-sm font-bold">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              {t('connected')}
                            </div>
                          ) : (
                            <div className="py-2 px-4 bg-bgMain text-textMuted border border-borderColor rounded-lg text-sm font-bold">
                              {t('not_connected')}
                            </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleGoogleConnect('mail')}
                            disabled={connecting !== null}
                            className="w-full py-3 text-center rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF', opacity: connecting !== null ? 0.6 : 1 }}
                          >
                            {connecting === 'mail'
                              ? (language === 'en' ? 'Connecting…' : 'Conectando…')
                              : t('btn_connect_mail')}
                          </button>
                        </div>
                      </div>

                      <div className="bg-bgMain/30 p-6 rounded-xl border border-borderColor shadow-sm">
                        <label className="text-sm font-bold uppercase tracking-wider text-textMuted mb-4 block">{t('google_drive')}</label>
                        <div className="flex flex-col gap-4">
                          {(keys['google_drive_oauth']) ? (
                            <div className="py-2 px-4 bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg flex items-center gap-2 text-sm font-bold">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              {t('connected')}
                            </div>
                          ) : (
                            <div className="py-2 px-4 bg-bgMain text-textMuted border border-borderColor rounded-lg text-sm font-bold">
                              {t('not_connected')}
                            </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleGoogleConnect('mail')}
                            disabled={connecting !== null}
                            className="w-full py-3 text-center rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF', opacity: connecting !== null ? 0.6 : 1 }}
                          >
                            {connecting === 'mail'
                              ? (language === 'en' ? 'Connecting…' : 'Conectando…')
                              : t('btn_connect_drive')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RIGHT: WHATSAPP NUMBER & EVOLUTION */}
                  <div className="flex flex-col gap-6">
                    <div className="bg-bgMain/30 p-6 rounded-xl border border-borderColor shadow-sm">
                      <label className="text-sm font-bold uppercase tracking-wider text-textMuted mb-4 block">{t('whatsapp_num')}</label>
                      <ProviderKeyField
                        inputType="text"
                        inputValue={keys['whatsapp_number']}
                        onInputChange={(val) => handleKeyChange('whatsapp_number', val)}
                        inputPlaceholder={t('placeholder_whatsapp')}
                        onSave={() => handleSave('identity', 'whatsapp_number')}
                        saving={saving}
                    providerKey="whatsapp_number"
                        language={language}
                      />
                    </div>
                    
                    {/* EVOLUTION COMPONENT W/ GLASS WRAPPER */}
                    <div className="p-1 rounded-2xl bg-gradient-to-b from-[rgba(197,168,128,0.3)] to-transparent">
                      <div className="bg-bgMain rounded-xl p-4 shadow-xl">
                        <WhatsAppEvolutionConnect tenantId={selectedTenant} language={language} />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
          </>
          )}

        </div>
      ) : (
        <div className="flex items-center justify-center h-48 border border-dashed border-borderColor rounded-2xl text-textMuted bg-bgMain/30">
          <p>{t('no_client_selected')}</p>
        </div>
      )}

    </div>
  );
}
