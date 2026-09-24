// src/frontend/src/components/AIAssistantDrawer.jsx
import React, { useState, useEffect } from 'react';
import { Bot, Play, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authFetch } from '../core/api/authFetch';

/**
 * AIAssistantDrawer — Panel de Inteligencia Operativa no intrusivo para ProjectDesk.jsx
 * Permite listar y ejecutar agentes del AI Orchestrator V2 en tiempo real.
 */
export function AIAssistantDrawer({ isOpen, onClose, organizationId }) {
  const [agents, setAgents] = useState([
    'prospect_analyzer', 
    'pre_call', 
    'weekly_digest', 
    'evening_summary', 
    'morning_briefing',
    'knowledge_search'
  ]);
  const [selectedAgent, setSelectedAgent] = useState('pre_call');
  const [provider, setProvider] = useState('openai');
  const [inputPayload, setInputPayload] = useState('{\n  "clientName": "ScaleFlow Coaching",\n  "meetingTopic": "Estrategia Operativa Q3"\n}');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await authFetch('/api/intelligence/agents');
        if (res.ok) {
          const data = await res.json();
          if (data.agents && Array.isArray(data.agents)) {
            setAgents(data.agents);
          }
        }
      } catch (err) {
        console.warn('[AIAssistantDrawer] Usando fallback de lista de agentes:', err);
      }
    }
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const handleExecute = async () => {
    setExecuting(true);
    setErrorMsg(null);
    setResult(null);

    let parsedInput = {};
    try {
      parsedInput = JSON.parse(inputPayload);
    } catch (e) {
      setErrorMsg('El payload de entrada debe ser un JSON válido.');
      setExecuting(false);
      return;
    }

    try {
      const res = await authFetch('/api/intelligence/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId || localStorage.getItem('coachdata_org_slug') || 'default',
        },
        body: JSON.stringify({
          agent: selectedAgent,
          input: parsedInput,
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al ejecutar el agente.');
      }
      setResult(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error de conexión con el AI Orchestrator.');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop oscuro con click para cerrar */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0, left: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '440px',
          maxWidth: '90vw',
          background: 'var(--bg-surface, #1e292b)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.15))',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary, #e2e8f0)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header con botón X de cierre totalmente visible */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-root, #151d1a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={18} style={{ color: 'var(--accent)' }} />
            <strong style={{ fontSize: '15px', color: 'var(--text-primary, #ffffff)' }}>CoachData AI Orchestrator V2</strong>
          </div>
          <button
            onClick={onClose}
            title="Cerrar panel (ESC)"
            style={{
              background: 'var(--bg-muted, rgba(255, 255, 255, 0.1))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.2))',
              color: 'var(--text-primary, #ffffff)',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body con fondos 100% opacos */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-surface, #1e292b)' }}>
          {/* Selector de Agente */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Agente Inteligente
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--bg-root, #151d1a)',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '13px',
              }}
            >
              {agents.map((ag) => (
                <option key={ag} value={ag}>
                  🤖 {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Provider */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Proveedor LLM
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--bg-root, #151d1a)',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '13px',
              }}
            >
              <option value="openai">OpenAI (gpt-4o-mini)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="gemini">Google Gemini (1.5 Flash)</option>
            </select>
          </div>

          {/* Input Payload JSON */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Parámetros de Entrada (JSON)
            </label>
            <textarea
              rows={5}
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--bg-root, #151d1a)',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                color: 'var(--text-primary, #f8fafc)',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

        {/* Botón de Ejecución */}
        <button
          onClick={handleExecute}
          disabled={executing}
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: executing ? '#334155' : 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            cursor: executing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}
        >
          {executing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Procesando con Orchestrator...
            </>
          ) : (
            <>
              <Play size={16} /> Ejecutar Agente
            </>
          )}
        </button>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#020617',
              border: '1px solid rgba(56,189,248,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
              <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Éxito ({result.durationMs}ms)
              </span>
              <span>Provider: {result.providerUsed}</span>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {typeof result.output === 'string'
                ? result.output
                : JSON.stringify(result.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
