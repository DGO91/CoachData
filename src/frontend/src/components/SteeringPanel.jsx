import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, Upload, Award, FileText, X, AlertTriangle, 
  Bot, CheckCircle2, Navigation, TrendingUp, ShieldCheck,
  Play, RotateCcw, Download, Loader2, ArrowRight
} from 'lucide-react';
import { useNotifications } from './common/Notifications';

export default function SteeringPanel({ translate, currentLang, theme }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const [formData, setFormData] = useState({
    tipoProfesional: '',
    mercadoObjetivo: '',
    curriculum: '',
    linkedin: '',
    fortalezas: '',
    debilidades: '',
    cursos: '',
    certificados: '',
  });

  const [cvFileName, setCvFileName] = useState('');
  const [cvFileLoading, setCvFileLoading] = useState(false);
  const [certFileName, setCertFileName] = useState('');
  const [certFileLoading, setCertFileLoading] = useState(false);

  // States: 'placeholder' | 'loading' | 'results'
  const [uiState, setUiState] = useState('placeholder');
  const [activeStep, setActiveStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [checkedActions, setCheckedActions] = useState({});

  const cvInputRef = useRef(null);
  const certInputRef = useRef(null);
  const reportRef = useRef(null);

  // Load external scripts for PDF parsing and PDF printing safely
  useEffect(() => {
    // PDF.js
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    } else {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    // html2pdf
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
    }
  }, []);

  // PDF Extract text helper
  const extractTextFromPDF = async (file) => {
    if (!window.pdfjsLib) throw new Error('PDF.js not loaded yet');
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText.trim();
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      notify(currentLang === 'en' ? 'Only PDF files are supported.' : 'Solo se admiten archivos en formato PDF.');
      return;
    }

    if (type === 'cv') {
      setCvFileLoading(true);
      setCvFileName(file.name);
      try {
        const text = await extractTextFromPDF(file);
        if (!text) throw new Error('Empty PDF');
        setFormData(prev => ({ ...prev, curriculum: text }));
      } catch (err) {
        notify(currentLang === 'en' ? 'Failed to process PDF CV.' : 'Error al procesar el PDF del CV.');
        setCvFileName('');
      } finally {
        setCvFileLoading(false);
      }
    } else {
      setCertFileLoading(true);
      setCertFileName(file.name);
      try {
        const text = await extractTextFromPDF(file);
        if (!text) throw new Error('Empty PDF');
        setFormData(prev => ({ ...prev, certificados: text }));
      } catch (err) {
        notify(currentLang === 'en' ? 'Failed to process PDF certificates.' : 'Error al procesar el PDF de certificados.');
        setCertFileName('');
      } finally {
        setCertFileLoading(false);
      }
    }
  };

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRunAnalysis = async (e) => {
    e.preventDefault();
    if (!formData.tipoProfesional || !formData.mercadoObjetivo || !formData.curriculum) {
      notify(currentLang === 'en' ? 'Please fill in all required fields.' : 'Por favor, completa todos los campos requeridos.');
      return;
    }

    setUiState('loading');
    setSubmitting(true);
    setActiveStep(0);
    setCheckedActions({});

    // Start sequential loading steps simulation
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 1500);

    try {
      // API call to the proxied Steering Analyzer microservice backend
      const res = await fetch('/svc/steering/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      clearInterval(interval);

      if (!result.success) {
        throw new Error(result.error || 'Server error');
      }

      setAnalysisResult(result.data);
      setUiState('results');
    } catch (err) {
      clearInterval(interval);
      notify((currentLang === 'en' ? 'Analysis failed: ' : 'Error en el análisis: ') + err.message);
      setUiState('placeholder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      tipoProfesional: '',
      mercadoObjetivo: '',
      curriculum: '',
      linkedin: '',
      fortalezas: '',
      debilidades: '',
      cursos: '',
      certificados: '',
    });
    setCvFileName('');
    setCertFileName('');
    setAnalysisResult(null);
    setUiState('placeholder');
  };

  const handleExportPDF = () => {
    if (!window.html2pdf || !reportRef.current) return;
    setExporting(true);

    const element = reportRef.current;
    const opt = {
      margin: [12, 12, 12, 12],
      filename: `${formData.tipoProfesional.trim().replace(/\s+/g, '_')}_Steering_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('pdf-report-content');
          if (el) el.classList.add('printing-in-progress');
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    window.html2pdf().from(element).set(opt).save().then(() => {
      setExporting(false);
    }).catch(err => {
      console.error(err);
      setExporting(false);
    });
  };

  const toggleAction = (idx) => {
    setCheckedActions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const loadingSteps = [
    currentLang === 'en' ? "Step 1: Data inventory & structure validation" : "Paso 1: Inventario de datos & validación de estructura",
    currentLang === 'en' ? "Step 2: Cross-referencing CV & LinkedIn anomalies" : "Paso 2: Cruce de CV y LinkedIn detectando inconsistencias",
    currentLang === 'en' ? "Step 3: Declared strengths vs empirical achievements" : "Paso 3: Contraste de fortalezas declaradas vs logros empíricos",
    currentLang === 'en' ? "Step 4: Target market positioning audit" : "Paso 4: Auditoría de posicionamiento en el mercado objetivo",
    currentLang === 'en' ? "Step 5: Competence updates & validation of training" : "Paso 5: Calificación de vigencia de formación & cursos",
    currentLang === 'en' ? "Step 6: Plan formatting and grading generation" : "Paso 6: Estructuración final de puntuaciones & plan de acción"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6 animate-fade-in w-full h-full">
      {/* Left panel inputs */}
      <aside className="glass-panel-inner p-6 flex flex-col h-full">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '40px', height: '40px', background: 'var(--accent-primary)',
            color: 'var(--bg-dark)', borderRadius: '8px', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Compass style={{ width: '22px', height: '22px' }} />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '700', margin: 0 }}>
            {translate('steering', 'Steering Analyzer')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {currentLang === 'en' 
              ? 'Elite system for professional profile steering & career path optimization.'
              : 'Sistema de élite para orientación profesional y optimización de trayectoria laboral.'}
          </p>
        </div>

        <form onSubmit={handleRunAnalysis} style={{ display: 'flex', flexDirection: 'column', flexGrow: '1', gap: '1rem' }}>
          <div className="form-group">
            <label>{currentLang === 'en' ? 'Professional Type' : 'Tipo Profesional'}</label>
            <input 
              type="text" 
              id="tipoProfesional" 
              value={formData.tipoProfesional}
              onChange={handleFormChange}
              placeholder={currentLang === 'en' ? 'E.g: Tech Lead Software Engineer, Creative Director' : 'Ej: Ingeniero de Software Tech Lead, Director Creativo'}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>{currentLang === 'en' ? 'Target Market' : 'Mercado Objetivo'}</label>
            <input 
              type="text" 
              id="mercadoObjetivo" 
              value={formData.mercadoObjetivo}
              onChange={handleFormChange}
              placeholder={currentLang === 'en' ? 'E.g: High-growth Fintech, SaaS Startups in the US' : 'Ej: Fintech de Alto Crecimiento, Startups SaaS en EE.UU.'}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{currentLang === 'en' ? 'Resume / CV (PDF)' : 'Currículum (CV)'}</label>
              {cvFileName && (
                <button 
                  type="button" 
                  onClick={() => { setCvFileName(''); setFormData(prev => ({ ...prev, curriculum: '' })); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', border: 'none', background: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  <X style={{ width: '12px', height: '12px' }} /> {currentLang === 'en' ? 'CLEAR' : 'ELIMINAR'}
                </button>
              )}
            </div>
            
            <div 
              onClick={() => !cvFileLoading && cvInputRef.current?.click()}
              className="border-2 border-dashed border-borderColor bg-bgMain/30 hover:bg-bgMain/50 transition-all rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer"
            >
              {cvFileLoading ? (
                <Loader2 className="animate-spin" style={{ color: 'var(--warning)', width: '20px', height: '20px' }} />
              ) : cvFileName ? (
                <CheckCircle2 style={{ color: 'var(--success)', width: '20px', height: '20px' }} />
              ) : (
                <FileText style={{ color: 'var(--accent-primary)', width: '20px', height: '20px' }} />
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                {cvFileLoading 
                  ? (currentLang === 'en' ? 'Extracting PDF…' : 'Extrayendo PDF…') 
                  : cvFileName 
                    ? cvFileName 
                    : (currentLang === 'en' ? 'Drag your PDF or click here' : 'Arrastra tu PDF o haz clic aquí')}
              </span>
              <input 
                type="file" 
                ref={cvInputRef} 
                onChange={(e) => handleFileUpload(e, 'cv')} 
                accept="application/pdf" 
                style={{ display: 'none' }} 
              />
            </div>

            <textarea 
              id="curriculum" 
              value={formData.curriculum}
              onChange={handleFormChange}
              placeholder={currentLang === 'en' ? 'Or paste the full content here…' : 'O pega el contenido completo aquí...'}
              rows="4" 
              required
              disabled={submitting}
              style={{ marginTop: '0.4rem' }}
            />
          </div>

          <div className="form-group">
            <label>{currentLang === 'en' ? 'LinkedIn Profile (Optional)' : 'Perfil de LinkedIn'}</label>
            <input 
              type="text" 
              id="linkedin" 
              value={formData.linkedin}
              onChange={handleFormChange}
              placeholder="https://linkedin.com/in/username"
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>{currentLang === 'en' ? 'Strengths' : 'Fortalezas'}</label>
              <textarea 
                id="fortalezas" 
                value={formData.fortalezas}
                onChange={handleFormChange}
                placeholder={currentLang === 'en' ? 'One per line…' : 'Una por línea…'} 
                rows="3"
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>{currentLang === 'en' ? 'Weaknesses' : 'Debilidades'}</label>
              <textarea 
                id="debilidades" 
                value={formData.debilidades}
                onChange={handleFormChange}
                placeholder={currentLang === 'en' ? 'One per line…' : 'Una por línea…'} 
                rows="3"
                disabled={submitting}
              />
            </div>
          </div>

          <button type="submit" className="premium-btn py-4 text-sm mt-6 w-full rounded-xl flex items-center justify-center gap-2 font-bold" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                <span>{currentLang === 'en' ? 'Analyzing…' : 'Analizando…'}</span>
              </>
            ) : (
              <>
                <Play style={{ width: '14px', height: '14px', fill: 'currentColor' }} />
                <span>{currentLang === 'en' ? 'Start Analysis' : 'Iniciar Análisis'}</span>
              </>
            )}
          </button>
        </form>
      </aside>

      {/* Right panel outputs */}
      <main className="glass-panel-inner p-8 flex flex-col h-full relative">
        
        {/* Placeholder state */}
        {uiState === 'placeholder' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: '1', padding: '3rem 1rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px', border: '1.5px dashed rgba(100,135,116,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', animation: 'spin 20s linear infinite' }}>
              <div style={{
                width: '60px', height: '60px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 25px var(--accent-primary)', animation: 'pulse 3s infinite'
              }}>
                <Navigation style={{ width: '28px', height: '28px', transform: 'rotate(45deg)' }} />
              </div>
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-title)', fontSize: '1.6rem', fontWeight: '400', marginBottom: '0.75rem' }}>
              Aura Steering Engine
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: '1.5' }}>
              {currentLang === 'en'
                ? 'Fill in your profile details on the left and start the steering analysis to generate your AI strategic diagnosis.'
                : 'Rellena los datos de tu perfil en la izquierda e inicia el análisis de rumbo para generar tu diagnóstico estratégico con Inteligencia Artificial.'}
            </p>
          </div>
        )}

        {/* Loading state */}
        {uiState === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: '1', padding: '2rem 1rem' }}>
            <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Loader2 className="animate-spin" style={{ color: 'var(--accent-primary)', width: '60px', height: '60px' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-title)', fontSize: '1.3rem', fontWeight: '400', marginBottom: '0.4rem' }}>
              {currentLang === 'en' ? 'Orchestrating Steering Agent…' : 'Orquestando Agente de Rumbo…'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
              {currentLang === 'en' 
                ? 'Processing profile inputs and certificates with Claude Sonnet 4.6.' 
                : 'Procesando inputs de currículum y autopercepción con Claude Sonnet 4.6.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: '480px', background: 'var(--upload-zone-bg)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {loadingSteps.map((step, idx) => {
                let stepClass = 'step-indicator';
                if (idx < activeStep) stepClass = 'step-indicator completed';
                else if (idx === activeStep) stepClass = 'step-indicator active';
                
                return (
                  <div key={idx} className={stepClass} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.76rem', color: idx === activeStep ? 'var(--text-title)' : 'var(--text-muted)' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '1.5px solid currentColor', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.6rem',
                      background: idx < activeStep ? 'var(--accent-primary)' : idx === activeStep ? 'var(--accent-primary)' : 'none',
                      borderColor: 'var(--accent-primary)',
                      color: idx <= activeStep ? 'var(--bg-primary)' : 'transparent'
                    }}>✓</div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Dashboard state */}
        {uiState === 'results' && analysisResult && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div id="pdf-report-content" ref={reportRef} className="printable-report" style={{ flexGrow: '1', overflowY: 'auto', paddingRight: '0.25rem' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-title)' }}>Aura Scale</span>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>Elite Suite</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="meta-tag" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600' }}>
                    {formData.tipoProfesional.trim().toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {new Date().toLocaleDateString(currentLang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: '400', color: 'var(--text-title)', marginBottom: '1.25rem', lineHeight: '1.2' }}>
                {currentLang === 'en' ? 'Strategic Professional Steering Diagnosis' : 'Diagnóstico Estratégico de Rumbo Profesional'}
              </h1>

              {/* Summary card */}
              <div className="report-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--upload-zone-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>
                  <Bot style={{ width: '16px', height: '16px' }} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-title)', fontWeight: '400' }}>
                    {currentLang === 'en' ? 'Executive Summary' : 'Resumen Ejecutivo'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-body)' }}>
                  {analysisResult.resumenEjecutivo}
                </p>
              </div>

              {/* Grid: Global score & dimension bars */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                
                {/* Score card */}
                <div className="report-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'var(--upload-zone-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {currentLang === 'en' ? 'Global Alignment Score' : 'Puntaje de Alineación Global'}
                  </h3>
                  <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '1rem', borderRadius: '50%', border: '5px solid var(--accent-secondary)', borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-title)' }}>
                      {analysisResult.puntuaciones.scoreGlobal.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/10</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {analysisResult.puntuaciones.explicacionScore}
                  </p>
                </div>

                {/* Dimension progress bars */}
                <div className="report-card" style={{ padding: '1.25rem', background: 'var(--upload-zone-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {currentLang === 'en' ? 'Core Dimension Analysis' : 'Análisis por Dimensiones Clave'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(analysisResult.analisisDimensiones).map(([key, dim], idx) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: '600' }}>
                          <div>
                            <span style={{ background: 'var(--accent-secondary)', color: '#ffffff', width: '16px', height: '16px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', marginRight: '0.4rem' }}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ color: 'var(--text-title)' }}>{dim.titulo}</span>
                          </div>
                          <span style={{ color: 'var(--accent-primary)' }}>{dim.puntuacion.toFixed(1)}/10</span>
                        </div>
                        <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))', width: `${dim.puntuacion * 10}%`, borderRadius: '3px' }}></div>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{dim.analisis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action plan table */}
              <div className="report-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--upload-zone-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-title)', fontWeight: '400', marginBottom: '0.2rem' }}>
                  {currentLang === 'en' ? 'Tactical Action Plan' : 'Plan de Acción Táctico'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {currentLang === 'en' ? 'Immediate checkpoints for competitive alignment:' : 'Puntos de control inmediatos para la alineación competitiva:'}
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.5rem 0.25rem', width: '30px' }}></th>
                        <th style={{ padding: '0.5rem 0.25rem', width: '60px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>{currentLang === 'en' ? 'PRIORITY' : 'PRIORIDAD'}</th>
                        <th style={{ padding: '0.5rem 0.25rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>{currentLang === 'en' ? 'ACTION' : 'ACCIÓN'}</th>
                        <th style={{ padding: '0.5rem 0.25rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>{currentLang === 'en' ? 'IMPACT' : 'IMPACTO'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.planDeAccion.map((act, idx) => {
                        const isChecked = !!checkedActions[idx];
                        const priorityClass = act.prioridad.toLowerCase() === 'p1' ? 'p1' : act.prioridad.toLowerCase() === 'p2' ? 'p2' : 'p3';
                        return (
                          <tr key={idx} style={{ 
                            borderBottom: '1px solid var(--border-color)', 
                            textDecoration: isChecked ? 'line-through' : 'none', 
                            opacity: isChecked ? '0.4' : '1',
                            transition: 'opacity 0.2s'
                          }}>
                            <td style={{ padding: '0.6rem 0.25rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => toggleAction(idx)}
                                style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                              />
                            </td>
                            <td style={{ padding: '0.6rem 0.25rem' }}>
                              <span className={`tag-priority ${priorityClass}`} style={{ fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                {act.prioridad.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 0.25rem', fontWeight: '500', color: 'var(--text-body)' }}>{act.accion}</td>
                            <td style={{ padding: '0.6rem 0.25rem', color: 'var(--text-muted)' }}>{act.impacto}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button onClick={handleReset} className="btn-neo-ghost" style={{ padding: '0.5rem 1rem' }}>
                <RotateCcw style={{ width: '14px', height: '14px' }} />
                <span>{currentLang === 'en' ? 'Reset' : 'Reiniciar'}</span>
              </button>
              <button 
                onClick={handleExportPDF} 
                className="btn-neo" 
                disabled={exporting}
                style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
              >
                {exporting ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} />
                    <span>{currentLang === 'en' ? 'Exporting…' : 'Exportando…'}</span>
                  </>
                ) : (
                  <>
                    <Download style={{ width: '14px', height: '14px' }} />
                    <span>{currentLang === 'en' ? 'Download PDF' : 'Descargar PDF'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
