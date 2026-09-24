import React, { useState, useRef, useEffect } from 'react';
import { Search, Link as LinkIcon, Trash2, CheckCircle2, AlertCircle, Loader2, Download, AlertTriangle } from 'lucide-react';
import { useNotifications } from './common/Notifications';
import { authFetch } from '../core/api/authFetch';

const TRANSLATIONS = {
  en: {
    heroTitle: 'Prospect Finder & Analyzer',
    heroDesc: 'Find and analyze high-value potential clients from any website with business intelligence.',
    nameLabel: 'Prospect Name',
    namePlaceholder: 'e.g. janine-allis',
    urlsLabel: 'Prospect Links',
    addBtn: 'Add link',
    tipLabel: 'Tip:',
    tipText: 'Paste multiple links separated by line breaks — they distribute automatically.',
    analyzeBtn: 'Analyze Prospect',
    analyzingBtn: 'Analyzing…',
    clearBtn: 'Clear',
    p1num: 'Pillar 01',
    p1desc: 'Strategy: Positioning, niche clarity and value proposition',
    p2num: 'Pillar 02',
    p2desc: 'Design: Visual identity, brand voice and aesthetic system',
    p3num: 'Pillar 03',
    p3desc: 'Systems: Funnel automation, monetization and email infrastructure',
    s1label: 'Reading Pages',
    s2label: 'Claude Analysis',
    s3label: 'Building Report',
    s4label: 'Creating PDF',
    stagePending: 'Pending',
    stageActive: 'In Progress',
    stageDone: 'Done',
    stageError: 'Error',
    dlTitle: 'Prospect Downloaded',
    dlSavedIn: 'Saved in',
    link: 'link',
    links: 'links'
  },
  es: {
    heroTitle: 'Buscador y Analizador de Prospectos',
    heroDesc: 'Encuentra y analiza clientes potenciales de cualquier sitio web con inteligencia de negocios.',
    nameLabel: 'Nombre del Prospecto',
    namePlaceholder: 'ej. janine-allis',
    urlsLabel: 'Links del Prospecto',
    addBtn: 'Agregar link',
    tipLabel: 'Tip:',
    tipText: 'Pega múltiples links separados por saltos de línea — se distribuyen automáticamente.',
    analyzeBtn: 'Analizar Prospecto',
    analyzingBtn: 'Analizando…',
    clearBtn: 'Limpiar',
    p1num: 'Pilar 01',
    p1desc: 'Estrategia: Posicionamiento, claridad de nicho y propuesta de valor',
    p2num: 'Pilar 02',
    p2desc: 'Diseño: Identidad visual, voz de marca y sistema estético',
    p3num: 'Pilar 03',
    p3desc: 'Sistemas: Automatización del embudo, monetización e infraestructura de email',
    s1label: 'Leyendo Páginas',
    s2label: 'Análisis Claude',
    s3label: 'Construyendo Reporte',
    s4label: 'Creando PDF',
    stagePending: 'Pendiente',
    stageActive: 'En Progreso',
    stageDone: 'Listo',
    stageError: 'Error',
    dlTitle: 'Prospecto Descargado',
    dlSavedIn: 'Guardado en',
    link: 'link',
    links: 'links'
  }
};

export default function ProspectAnalyzer({ theme, language }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const t = (key) => TRANSLATIONS[language]?.[key] || TRANSLATIONS['en'][key] || key;
  
  /* La clave de Anthropic ya no pasa por aquí. La pone el proxy de la suite
     desde la bóveda cifrada del inquilino, así que el navegador no la ve.
     Este efecto sólo limpia la que dejaron las versiones anteriores en
     localStorage, donde cualquier script de la página podía leerla. */
  useEffect(() => {
    try {
      if (localStorage.getItem('coachdata_api_key')) {
        localStorage.removeItem('coachdata_api_key');
      }
    } catch {
      /* modo privado o almacenamiento denegado */
    }
  }, []);
  const [prospectName, setProspectName] = useState('');
  const [urls, setUrls] = useState(['', '', '']);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [stages, setStages] = useState([
    { status: 'pending', sub: '' },
    { status: 'pending', sub: '' },
    { status: 'pending', sub: '' },
    { status: 'pending', sub: '' }
  ]);
  const [downloadInfo, setDownloadInfo] = useState(null);
  
  const handlePaste = (e, index) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.startsWith('http'));
    if (lines.length > 1) {
      e.preventDefault();
      const newUrls = [...urls];
      newUrls[index] = lines[0];
      for (let i = 1; i < lines.length; i++) {
        if (index + i < newUrls.length) {
          newUrls[index + i] = lines[i];
        } else {
          newUrls.push(lines[i]);
        }
      }
      setUrls(newUrls);
    }
  };

  const updateUrl = (index, val) => {
    const newUrls = [...urls];
    newUrls[index] = val;
    setUrls(newUrls);
  };

  const addUrl = () => setUrls([...urls, '']);
  const removeUrl = (index) => {
    if (urls.length <= 1) return;
    setUrls(urls.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUrls(['', '', '']);
    setProspectName('');
    setShowOutput(false);
    setDownloadInfo(null);
    setStages(stages.map(s => ({ status: 'pending', sub: '' })));
  };

  const validUrlCount = urls.filter(u => u.trim().startsWith('http')).length;

  const setStep = (n, status, sub = '') => {
    setStages(prev => {
      const next = [...prev];
      next[n - 1] = { status, sub };
      return next;
    });
  };

  const handleEvent = (name, data) => {
    if (name === 'stage') {
      const step = data.step;
      for (let i = 1; i < step; i++) {
        setStep(i, 'done');
      }
      const sub = data.done && data.total ? `${data.done} / ${data.total}` : (data.label || '');
      setStep(step, 'active', sub);
    } else if (name === 'done') {
      setStep(1, 'done'); setStep(2, 'done'); setStep(3, 'done'); setStep(4, 'done');
      if (data.pdf) {
        setDownloadInfo({ filename: data.pdf, size: data.size, path: data.path });
      }
      setRunning(false);

      // Sincronizar automáticamente con el Cerebro Unificado (Pilar 2)
      authFetch('/api/agents/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_name: prospectName || 'Prospecto Web',
          entity_type: 'prospect',
          source_agent: 'prospect_analyzer',
          insights: {
            urls: cleanUrls,
            analyzed_at: new Date().toISOString(),
            pdf_generated: data.pdf || null,
            status: 'analyzed'
          }
        })
      }).catch(err => console.warn('Failed to sync intelligence to vault', err));
    } else if (name === 'error') {
      setRunning(false);
      // find active
      setStages(prev => {
        const next = [...prev];
        const activeIdx = next.findIndex(s => s.status === 'active');
        if (activeIdx !== -1) {
          next[activeIdx] = { status: 'error', sub: data.text || '' };
        } else {
          next[0] = { status: 'error', sub: data.text || '' };
        }
        return next;
      });
    }
  };

  const startAnalysis = async () => {
    if (running) return;
    const cleanUrls = urls.map(u => u.trim()).filter(u => u.startsWith('http'));
    if (!cleanUrls.length) {
      notify(language === 'en' ? 'Add at least one link.' : 'Agrega al menos un link.');
      return;
    }
    setRunning(true);
    setShowOutput(true);
    setDownloadInfo(null);
    setStages(stages.map(() => ({ status: 'pending', sub: '' })));

    try {
      const resp = await fetch('/svc/prospect/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: cleanUrls, clientName: prospectName || 'prospect' })
      });

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const blocks = buf.split('\n\n');
        buf = blocks.pop();
        for (const block of blocks) {
          let ev = '', data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) ev = line.slice(6).trim();
            if (line.startsWith('data:')) data = line.slice(5).trim();
          }
          if (!data) continue;
          try { handleEvent(ev || 'message', JSON.parse(data)); } catch {}
        }
      }
    } catch(err) {
      setStep(1, 'error'); setStep(2, 'error'); setStep(3, 'error'); setStep(4, 'error');
      setRunning(false);
    }
  };

  const stageLabels = [t('s1label'), t('s2label'), t('s3label'), t('s4label')];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2 agent-section-title">
          <Search className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('heroTitle')}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{t('heroDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Output & Pillars */}
        <div className="flex flex-col gap-6">
          {showOutput ? (
            <main className="glass-panel-inner p-6 flex flex-col gap-6 animate-slide-up">
              <div className="pb-4 flex justify-between items-center border-b border-borderColor/50">
                <h3 className="font-bold text-textMain text-xl">{prospectName ? prospectName.charAt(0).toUpperCase() + prospectName.slice(1).replace(/-/g,' ') : 'Prospect'}</h3>
                <span className="premium-badge">{validUrlCount} {validUrlCount === 1 ? t('link') : t('links')}</span>
              </div>

              <div className="flex flex-col gap-3">
                {stages.map((s, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${s.status === 'active' ? 'bg-bgMain border border-borderColor/50 shadow-sm' : 'border border-transparent'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      s.status === 'done' ? 'bg-green-500/20 text-green-600 border border-green-500/30' :
                      s.status === 'error' ? 'bg-red-500/20 text-red-600 border border-red-500/30' :
                      s.status === 'active' ? 'text-[var(--accent-text)] shadow-lg animate-pulse-gold' :
                      'bg-bgMain text-textMuted border border-borderColor'
                    }`} style={s.status === 'active' ? { background: 'var(--accent)' } : {}}>
                      {s.status === 'done' ? <CheckCircle2 size={16}/> : s.status === 'error' ? '✕' : s.status === 'active' ? <Loader2 size={14} className="animate-spin" /> : `0${i+1}`}
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <span className={`text-sm font-semibold ${s.status === 'pending' ? 'text-textMuted' : 'text-textMain'}`}>{stageLabels[i]}</span>
                      {s.sub && <span className="text-xs text-textMuted mt-0.5">{s.sub}</span>}
                    </div>
                    
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${
                      s.status === 'done' ? 'text-green-600 border-green-500/30 bg-green-500/10' :
                      s.status === 'error' ? 'text-red-600 border-red-500/30 bg-red-500/10' :
                      s.status === 'active' ? 'text-[var(--accent-text)] border-transparent' :
                      'text-textMuted border-borderColor bg-bgMain'
                    }`} style={s.status === 'active' ? { background: 'var(--accent)' } : {}}>
                      {s.status === 'done' ? t('stageDone') : s.status === 'error' ? t('stageError') : s.status === 'active' ? t('stageActive') : t('stagePending')}
                    </span>
                  </div>
                ))}
              </div>

              {downloadInfo && (
                <div className="mt-2 p-5 rounded-xl border border-green-500/30 bg-green-500/10 flex items-center gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                    <Download size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-textMain text-sm">{t('dlTitle')}</span>
                    <span className="text-xs text-textMuted mt-0.5">{t('dlSavedIn')}: {downloadInfo.path || `prospectos/${downloadInfo.filename}`}</span>
                  </div>
                  <span className="ml-auto text-xs font-bold text-green-600 tracking-wider bg-green-500/20 px-2 py-1 rounded">{downloadInfo.size}</span>
                </div>
              )}
            </main>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-4 h-full border border-dashed border-borderColor">
                <span className="premium-badge mb-2">{t('p1num')}</span>
                <p className="text-sm font-medium text-textMain leading-relaxed">{t('p1desc')}</p>
              </div>
              <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-4 h-full border border-dashed border-borderColor">
                <span className="premium-badge mb-2">{t('p2num')}</span>
                <p className="text-sm font-medium text-textMain leading-relaxed">{t('p2desc')}</p>
              </div>
              <div className="glass-panel-inner p-6 flex flex-col items-center justify-center text-center gap-4 h-full border border-dashed border-borderColor">
                <span className="premium-badge mb-2">{t('p3num')}</span>
                <p className="text-sm font-medium text-textMain leading-relaxed">{t('p3desc')}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Configuration / Input */}
        <aside className="glass-panel-inner flex flex-col gap-6 p-6" >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-textMuted">{t('nameLabel')}</label>
            <input
              type="text"
              value={prospectName}
              onChange={e => setProspectName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full bg-bgMain border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accentSage focus:ring-1 focus:ring-accentSage transition-all text-textMain shadow-sm"
              style={{ borderColor: '#9CA3AF' }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-textMuted">{t('urlsLabel')}</label>
              <span className="premium-badge">
                {validUrlCount} {validUrlCount === 1 ? t('link') : t('links')}
              </span>
            </div>
            
            <div className="flex flex-col gap-2">
              {urls.map((u, i) => (
                <div key={i} className="flex items-center gap-2 w-full">
                  <div className="w-10 h-10 rounded-lg border bg-bgMain flex items-center justify-center text-xs font-bold text-textMuted shadow-sm flex-shrink-0" style={{ borderColor: '#9CA3AF' }}>
                    {i+1}
                  </div>
                  <input
                    type="text"
                    value={u}
                    onChange={e => updateUrl(i, e.target.value)}
                    onPaste={e => handlePaste(e, i)}
                    placeholder="https://"
                    className="flex-1 bg-bgMain border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accentSage focus:ring-1 focus:ring-accentSage transition-all text-textMain shadow-sm"
                    style={{ borderColor: '#9CA3AF' }}
                  />
                  <button onClick={() => removeUrl(i)} className="w-10 h-10 flex items-center justify-center text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <button onClick={addUrl} className="premium-btn px-4 py-2 text-xs self-start" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent-ink, var(--accent))' }}>
              + {t('addBtn')}
            </button>
            
            <div className="text-xs text-textMuted flex items-start gap-1.5 bg-bgMain/40 p-3 rounded-xl border border-borderColor/50 mt-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span><strong>{t('tipLabel')}</strong> {t('tipText')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-borderColor/50">
            <button
              onClick={startAnalysis}
              disabled={running}
              className={`py-3.5 px-6 text-sm w-full rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${running ? 'animate-pulse-gold' : ''}`}
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text, #fff)', border: 'none', boxShadow: '0 4px 14px rgba(197, 168, 128, 0.35)' }}
            >
              {running ? <><Loader2 size={18} className="animate-spin inline mr-2" /> {t('analyzingBtn')}</> : <><Search size={18} className="inline mr-2" /> {t('analyzeBtn')}</>}
            </button>
            <button onClick={clearAll} className="py-3 px-6 text-sm w-full font-bold opacity-80 hover:opacity-100 transition-all rounded-xl border" style={{ backgroundColor: 'transparent', color: 'var(--text-main)', borderColor: '#9CA3AF' }}>
              {t('clearBtn')}
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}
