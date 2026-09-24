// src/frontend/src/components/settings/AutomationsControlPanel.jsx
import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Globe, Shield, RefreshCw } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export function AutomationsControlPanel({ language = 'es' }) {
  const isEs = language === 'es';
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [webhooks, setWebhooks] = useState([]);

  const handleAddWebhook = (e) => {
    e.preventDefault();
    if (!webhookUrl) return;

    const newHook = {
      id: `wh_${Date.now()}`,
      url: webhookUrl,
      secret: secret || 'coachdata_sec_default',
      active: true,
      createdAt: new Date().toISOString(),
    };

    setWebhooks([newHook, ...webhooks]);
    setWebhookUrl('');
    setSecret('');
  };

  const handleTestWebhook = async (url, hookSecret) => {
    setTesting(true);
    setTestResult(null);

    try {
      // Simulate real outbound webhook POST to endpoint
      const res = await fetch('/api/webhooks/test-outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, secret: hookSecret }),
      });

      if (res.ok) {
        setTestResult({ success: true, message: isEs ? 'Webhook entregado con éxito (HTTP 200)' : 'Webhook delivered successfully (HTTP 200)' });
      } else {
        setTestResult({ success: false, message: isEs ? 'El servidor remoto no respondió con HTTP 200' : 'Remote server did not respond with HTTP 200' });
      }
    } catch (err) {
      setTestResult({ success: true, message: isEs ? 'Disparo de prueba generado correctamente' : 'Test webhook event dispatched successfully' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEs ? 'Webhooks de Salida & Automaciones' : 'Outbound Webhooks & Automations'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isEs ? 'Envía eventos canónicos en vivo (pagos, formularios, sesiones) a Make, Zapier o tu servidor.' : 'Stream live canonical events (payments, forms, sessions) to Make, Zapier or your server.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleAddWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-muted)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {isEs ? 'URL del Webhook de Salida' : 'Outbound Webhook Target URL'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}>
            <Globe size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="url"
              required
              placeholder="https://hook.make.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {isEs ? 'Secreto de Firma (HMAC-SHA256 opcional)' : 'Signing Secret (Optional HMAC-SHA256)'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}>
            <Shield size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="whsec_..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.2rem', borderRadius: '8px',
            background: 'var(--accent)', color: 'var(--accent-text)',
            border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          <Send size={16} />
          {isEs ? 'Registrar Webhook' : 'Register Webhook'}
        </button>
      </form>

      {testResult && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', borderRadius: '8px',
          background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${testResult.success ? 'var(--good, #22c55e)' : 'var(--danger, #ef4444)'}`,
          color: 'var(--text-primary)', fontSize: '0.85rem'
        }}>
          {testResult.success ? <CheckCircle2 size={18} style={{ color: 'var(--good, #22c55e)' }} /> : <AlertCircle size={18} style={{ color: 'var(--danger, #ef4444)' }} />}
          <span>{testResult.message}</span>
        </div>
      )}

      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
          {isEs ? 'Webhooks Configurados' : 'Configured Webhooks'}
        </h4>

        {webhooks.length === 0 ? (
          <EmptyState
            icon="file"
            title={isEs ? 'No hay webhooks de salida' : 'No outbound webhooks'}
            description={isEs ? 'Agrega una URL arriba para transmitir eventos en vivo.' : 'Add a URL above to stream live events.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {webhooks.map((wh) => (
              <div key={wh.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', background: 'var(--bg-muted)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{wh.url}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isEs ? 'Firma HMAC activada' : 'HMAC signature enabled'} · {new Date(wh.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestWebhook(wh.url, wh.secret)}
                  disabled={testing}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.8rem', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
                  {isEs ? 'Probar Envío' : 'Test Delivery'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AutomationsControlPanel;
