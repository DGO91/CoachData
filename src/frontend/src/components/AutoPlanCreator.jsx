import React, { useState } from 'react';
import { Bot, Play, FileJson, Loader2, FileText } from 'lucide-react';
import { authFetch } from '../core/api/authFetch';

const TRANSLATIONS = {
  en: {
    title: "Client Plan Generator",
    subtitle: "Generate strategic operations plans instantly from sales call transcripts.",
    transcript_ph: "Paste the call transcript here…",
    btn_analyze: "Generate Strategic Plan",
    status_waiting: "Waiting for transcript…",
    result_label: "Structured Result",
    out_placeholder: "Technical analysis will appear here.",
    missing: "Missing transcript.",
    analyzing: "Analyzing with Claude…",
    ready: "Ready · Plan available",
    err: "Error: "
  },
  es: {
    title: "Generador de Planes de Cliente",
    subtitle: "Genera planes de operaciones estratégicas instantáneamente a partir de transcripciones.",
    transcript_ph: "Pega aquí la transcripción de la llamada…",
    btn_analyze: "Generar Plan Estratégico",
    status_waiting: "Esperando transcripción…",
    result_label: "Resultado Estructurado",
    out_placeholder: "El análisis técnico aparecerá aquí.",
    missing: "Falta la transcripción.",
    analyzing: "Analizando con Claude…",
    ready: "Listo · Plan generado",
    err: "Error: "
  }
};

export default function AutoPlanCreator({ language }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [transcript, setTranscript] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(t('status_waiting'));
  const [output, setOutput] = useState(null);

  const syntaxHighlight = (json) => {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'agent-log-warning'; // number → warn colour
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'agent-log-system'; // key → accent
        } else {
          cls = 'agent-log-success'; // string → good
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-400 font-bold'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-gray-500 italic'; // null
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setStatus(t('missing'));
      return;
    }
    
    setRunning(true);
    setStatus(t('analyzing'));
    setOutput(null);
    
    try {
      const res = await fetch('/svc/auto-plan/api/analyze', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ transcript: transcript.trim() }) 
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Backend Error');
      
      setOutput(data.data ? syntaxHighlight(data.data) : syntaxHighlight(data.text));
      setStatus(t('ready'));

      // Sincronizar automáticamente con el Cerebro Unificado (Pilar 2)
      authFetch('/api/agents/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_name: data.data?.client_name || 'Cliente de Transcripción',
          entity_type: 'client',
          source_agent: 'auto_plan_creator',
          insights: {
            plan_generated: true,
            structured_data: data.data || null,
            generated_at: new Date().toISOString()
          }
        })
      }).catch(err => console.warn('Failed to sync plan to memory vault', err));
    } catch (e) {
      console.error(e);
      setStatus(t('err') + e.message);
    } finally {
      setRunning(false);
    }
  };

  const getStatusClass = () => {
    if (status === t('ready')) return 'agent-status-badge good';
    if (status.startsWith(t('err'))) return 'agent-status-badge crit';
    if (status === t('analyzing')) return 'agent-status-badge accent';
    return 'agent-status-badge neutral';
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('title')}
        </h1>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: 'var(--muted)' }}>{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Input & Controls */}
        <aside className="glass-panel-inner p-6 flex flex-col gap-6 sticky top-6">
          <div className="border-b pb-4 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
            <FileText size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-xl agent-section-title">Data Input</h2>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            <textarea 
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={t('transcript_ph')}
              className="w-full h-64 rounded-xl p-4 text-sm placeholder:opacity-50 focus:outline-none resize-none transition-colors"
              style={{
                background: 'var(--bg-muted)',
                border: '1px solid var(--hair)',
                color: 'var(--ink)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--hair)'}
            ></textarea>
            
            <div className={`text-xs font-mono py-3 px-4 rounded-lg flex items-center gap-2 ${getStatusClass()}`}>
              <div className="w-2 h-2 rounded-full bg-current" />
              {status}
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={running}
              className="agent-btn-primary w-full py-4 mt-2"
            >
              {running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {t('btn_analyze')}
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Output Dossier */}
        <main className="glass-panel p-8 flex flex-col h-full min-h-[600px]" style={{ borderRadius: 'var(--r-lg)' }}>
          <div className="border-b pb-6 mb-6 flex items-center gap-3" style={{ borderColor: 'var(--hair)' }}>
            <FileJson size={24} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-2xl agent-section-title">{t('result_label')}</h2>
          </div>
          
          <div className="agent-console flex-1" style={{ minHeight: '400px' }}>
            {!output ? (
              <div className="h-full min-h-[400px] flex flex-col gap-4 items-center justify-center font-mono text-sm" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                <FileJson size={48} />
                {t('out_placeholder')}
              </div>
            ) : (
              <pre 
                className="text-xs md:text-sm font-mono leading-relaxed whitespace-pre-wrap break-words animate-fade-in"
                dangerouslySetInnerHTML={{ __html: output }}
              ></pre>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
