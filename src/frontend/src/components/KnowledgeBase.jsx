import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, FileUp, Trash2, Calendar, Database, RefreshCw, Info } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { useNotifications } from './common/Notifications';

const TRANSLATIONS = {
  en: {
    title: 'Knowledge Assistant',
    subtitle: 'Feed and manage the knowledge base of your AI Agents.',
    uploadTitle: 'Upload your SOPs and Manuals',
    dragHere: 'Drag your document here',
    orClick: 'Or click to select from your computer',
    supports: 'Supports .TXT, .PDF, and .DOCX',
    processing: 'Processing document... this may take a few seconds depending on the size.',
    successVec: 'Vectorization Successful',
    errProc: 'Processing Error',
    howItWorks: 'How it works?',
    hw1: 'The system reads your document and smartly splits it into <strong>"Chunks"</strong>.',
    hw2: 'An advanced AI model converts the text into mathematical vectors of 384 dimensions.',
    hw3: 'They are stored in the Supabase vector database, ready to be instantly retrieved by the agents.',
    storedDocs: 'Stored Memory Documents',
    refresh: 'Refresh',
    loadingDocs: 'Loading documents…',
    noDocs: 'No documents stored',
    noDocsDesc: 'Upload PDFs, TXTs or DOCXs above to start feeding knowledge to your AI agents.',
    docName: 'Document Name',
    vecChunks: 'Vector Chunks',
    upDate: 'Upload Date',
    actions: 'Actions',
    chunks: 'chunks',
    delTitle: 'Delete permanently',
    errType: 'Only .pdf, .txt, and .docx files are allowed',
    errConn: 'Connection error with the RAG Brain. Ensure the container is running.'
  },
  es: {
    title: 'Asistente de Conocimiento',
    subtitle: 'Alimenta y gestiona la base de conocimientos de tus Agentes IA.',
    uploadTitle: 'Sube tus SOPs y Manuales',
    dragHere: 'Arrastra tu documento aquí',
    orClick: 'O haz clic para seleccionar desde tu computadora',
    supports: 'Soporta .TXT, .PDF y .DOCX',
    processing: 'Procesando documento... esto puede tardar unos segundos.',
    successVec: 'Vectorización Exitosa',
    errProc: 'Error de Procesamiento',
    howItWorks: '¿Cómo funciona?',
    hw1: 'El sistema lee tu documento y lo divide inteligentemente en <strong>"Chunks"</strong> (fragmentos lógicos).',
    hw2: 'Un modelo avanzado de IA convierte el texto en vectores matemáticos de 384 dimensiones.',
    hw3: 'Se almacenan en la base de datos vectorial de Supabase, listos para que los agentes los consulten al instante.',
    storedDocs: 'Documentos en Memoria',
    refresh: 'Actualizar',
    loadingDocs: 'Cargando documentos…',
    noDocs: 'No hay documentos almacenados',
    noDocsDesc: 'Sube archivos PDF, TXT o DOCX arriba para empezar a alimentar a tus agentes de IA.',
    docName: 'Nombre del Documento',
    vecChunks: 'Fragmentos (Chunks)',
    upDate: 'Fecha de Carga',
    actions: 'Acciones',
    chunks: 'fragmentos',
    delTitle: 'Eliminar permanentemente',
    errType: 'Solo se permiten archivos .pdf, .txt y .docx',
    errConn: 'Error de conexión con el Cerebro RAG. Asegúrate de que el contenedor esté corriendo.'
  }
};

const KnowledgeBase = ({ language = 'es' }) => {
  const { notify, confirm: askConfirm } = useNotifications();
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang][key] || key;

  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

  // Multi-tenant RAG State
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const fetchDocuments = useCallback(async (client, tid) => {
    if (!client || !tid) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await client
        .from('knowledge_documents')
        .select('id, metadata')
        .eq('metadata->>tenant_id', tid);

      if (error) throw error;

      const uniqueDocs = {};
      (data || []).forEach(item => {
        const source = item.metadata?.source || 'Unnamed Document';
        const uploadedAt = item.metadata?.uploaded_at;
        if (!uniqueDocs[source]) {
          uniqueDocs[source] = {
            name: source,
            chunkCount: 0,
            uploadedAt: uploadedAt ? new Date(uploadedAt).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Unknown date'
          };
        }
        uniqueDocs[source].chunkCount++;
      });

      setDocuments(Object.values(uniqueDocs));
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [lang]);

  useEffect(() => {
    async function init() {
      const client = await getSupabase();
      setSupabaseClient(client);
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
          const { data: tenant } = await client
            .from('tenants')
            .select('id')
            .or(`auth_user_id.eq.${session.user.id},id.eq.${session.user.id}`)
            .maybeSingle();
          if (tenant) {
            setTenantId(tenant.id);
            await fetchDocuments(client, tenant.id);
          } else {
            setLoadingDocs(false);
          }
        } else {
          setLoadingDocs(false);
        }
      } else {
        setLoadingDocs(false);
      }
    }
    init();
  }, [fetchDocuments]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf' && file.type !== 'text/plain' && file.name.indexOf('.docx') === -1) {
      setUploadStatus('error');
      setMessage(t('errType'));
      return;
    }

    setFileName(file.name);
    setUploadStatus('uploading');
    setMessage(t('processing'));

    try {
      const client = supabaseClient || await getSupabase();
      if (!client) throw new Error('Database connection failed');

      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Auth session invalid or expired');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/svc/knowledge-agent/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadStatus('success');
        setMessage(data.message || t('successVec'));
        if (tenantId) await fetchDocuments(client, tenantId);
      } else {
        setUploadStatus('error');
        setMessage(data.error || t('errProc'));
      }
    } catch (error) {
      setUploadStatus('error');
      setMessage(t('errConn'));
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [supabaseClient, tenantId]);

  const onFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDeleteDocument = async (sourceName) => {
    if (!supabaseClient || !tenantId) return;
    const ok = await askConfirm({
      message: `¿Eliminar permanentemente "${sourceName}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    setDeletingDoc(sourceName);
    try {
      const { error } = await supabaseClient
        .from('knowledge_documents')
        .delete()
        .eq('metadata->>source', sourceName)
        .eq('metadata->>tenant_id', tenantId);

      if (error) throw error;
      await fetchDocuments(supabaseClient, tenantId);
    } catch (err) {
      notify('Error al eliminar.', { type: 'error' });
    } finally {
      setDeletingDoc(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2 agent-section-title">
          <Database className="animate-pulse" style={{ color: 'var(--accent-ink, var(--accent))' }} size={24} />
          {t('title')}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Upload & Documents */}
        <div className="flex flex-col gap-6">
          
          <div className="glass-panel-inner flex flex-col gap-6 p-6">
            <div className="border-b border-borderColor pb-4 flex items-center gap-3">
              <FileUp size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <h2 className="font-bold text-textMain text-xl agent-section-title">{t('uploadTitle')}</h2>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                isDragging 
                  ? 'border-[var(--accent)] bg-[var(--accent-glow)] scale-[1.01]' 
                  : 'border-borderColor hover:border-[var(--accent)] hover:bg-[var(--bg-muted)]'
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input type="file" accept=".pdf,.txt,.docx" className="hidden" id="file-upload" onChange={onFileInput} />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                <UploadCloud className={`w-14 h-14 mb-4 transition-colors ${isDragging ? 'text-[var(--accent)]' : 'text-textMuted'}`} />
                <h3 className="text-xl font-bold mb-2 text-textMain">{t('dragHere')}</h3>
                <p className="mb-4 text-sm text-textMuted">{t('orClick')}</p>
                <div className="px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 bg-bgMuted border border-borderColor text-textSecondary">
                  <FileText className="w-4 h-4" />
                  {t('supports')}
                </div>
              </label>
            </div>

            {uploadStatus === 'uploading' && (
              <div className="bg-bgMuted border border-[var(--accent)] rounded-xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 border-4 border-[var(--accent)] border-r-transparent rounded-full animate-spin"></div>
                <div>
                  <h4 className="font-bold text-sm text-textMain">{fileName}</h4>
                  <p className="text-[var(--accent)] text-xs mt-1">{message}</p>
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.3)] rounded-xl p-4 flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[var(--success)]" />
                <div>
                  <h4 className="text-[var(--success)] font-bold text-sm">{t('successVec')}</h4>
                  <p className="text-xs mt-1 text-textMuted">{message}</p>
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="bg-[rgba(217,83,79,0.1)] border border-[rgba(217,83,79,0.3)] rounded-xl p-4 flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-[var(--danger)]" />
                <div>
                  <h4 className="text-[var(--danger)] font-bold text-sm">{t('errProc')}</h4>
                  <p className="text-xs mt-1 text-textMuted">{message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel-inner flex flex-col gap-6 p-6">
            <div className="border-b border-borderColor pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                <h2 className="font-bold text-textMain text-xl agent-section-title">{t('storedDocs')}</h2>
              </div>
              <button 
                onClick={() => fetchDocuments(supabaseClient, tenantId)} 
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-bgMuted transition-colors border border-transparent hover:border-borderColor text-textMuted hover:text-textMain"
                title={t('refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loadingDocs ? 'animate-spin text-[var(--accent)]' : ''}`} />
              </button>
            </div>

            {loadingDocs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-[var(--accent)] animate-spin" />
                <p className="text-sm text-textMuted">{t('loadingDocs')}</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-borderColor rounded-2xl bg-bgMuted">
                <Database className="w-10 h-10 mx-auto mb-3 text-textMuted opacity-50" />
                <h4 className="font-bold text-sm mb-1 text-textMain">{t('noDocs')}</h4>
                <p className="text-xs max-w-sm mx-auto text-textMuted">{t('noDocsDesc')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-borderColor">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bgMuted border-b border-borderColor">
                      <th className="p-3 font-bold text-xs uppercase tracking-wider text-textMain">{t('docName')}</th>
                      <th className="p-3 font-bold text-xs uppercase tracking-wider text-textMain">{t('vecChunks')}</th>
                      <th className="p-3 font-bold text-xs uppercase tracking-wider text-textMain">{t('upDate')}</th>
                      <th className="p-3 font-bold text-xs uppercase tracking-wider text-textMain text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-bgMuted transition-colors border-b border-borderColor last:border-0">
                        <td className="p-3 text-sm flex items-center gap-2 text-textMain">
                          <FileText className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          <span className="truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                        </td>
                        <td className="p-3 text-sm">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-glow)] text-[var(--accent)]">
                            {doc.chunkCount} {t('chunks')}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-textSecondary">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {doc.uploadedAt}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteDocument(doc.name)}
                            disabled={deletingDoc !== null}
                            className={`p-1.5 rounded-md text-textMuted hover:text-[var(--danger)] hover:bg-[rgba(217,83,79,0.1)] transition-all ${deletingDoc === doc.name ? 'opacity-50' : ''}`}
                            title={t('delTitle')}
                          >
                            {deletingDoc === doc.name ? <RefreshCw className="w-4 h-4 animate-spin text-[var(--danger)]" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Info Sidebar */}
        <div className="glass-panel-inner p-6 flex flex-col gap-6 sticky top-6">
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Info size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-textMain text-xl agent-section-title">{t('howItWorks')}</h2>
          </div>
          
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-3 bg-bgMuted border border-borderColor p-3 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              <span className="text-xs text-textMain leading-relaxed" dangerouslySetInnerHTML={{ __html: t('hw1') }} />
            </li>
            <li className="flex items-start gap-3 bg-bgMuted border border-borderColor p-3 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              <span className="text-xs text-textMain leading-relaxed">{t('hw2')}</span>
            </li>
            <li className="flex items-start gap-3 bg-bgMuted border border-borderColor p-3 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              <span className="text-xs text-textMain leading-relaxed">{t('hw3')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
