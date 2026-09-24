// src/frontend/src/components/client/ClientFilesPanel.jsx
import React, { useState, useRef } from 'react';
import { Folder, Download, FileText, UploadCloud, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { getSupabase } from '../../supabaseClient';

export function ClientFilesPanel({
  files = [],
  onUploadSuccess,
  onDeleteFile,
  organizationId = null,
  projectId = 'demo-client-proj',
  isStaff = false,
  language = 'es',
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const handleFileUpload = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(20);

    try {
      const file = selectedFiles[0];
      const supabase = await getSupabase();

      setUploadProgress(50);
      const storagePath = `${organizationId}/${projectId}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage Bucket 'client-uploads'
      let uploadError = null;
      if (supabase && supabase.storage) {
        const { error } = await supabase.storage
          .from('client-uploads')
          .upload(storagePath, file);
        uploadError = error;
      }

      setUploadProgress(80);

      // Register File Metadata
      const newFile = {
        id: `file_${Date.now()}`,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        created_at: new Date().toISOString(),
        url: URL.createObjectURL(file),
      };

      if (onUploadSuccess) onUploadSuccess(newFile);
      setUploadProgress(100);
    } catch (err) {
      console.warn('[ClientFilesPanel] Upload warning:', err);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="ogd-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <div className="ogd-panel-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.shared_files}</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{files.length} archivos</span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          background: dragActive ? 'rgba(184, 152, 90, 0.08)' : 'var(--bg-root)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '16px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Subiendo archivo... {uploadProgress}%
            </span>
            <div style={{ width: '100%', maxWidth: '200px', height: '4px', background: 'var(--bg-muted)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={24} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Arrastra archivos aquí o haz clic para explorar
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF, PNG, JPG, ZIP (Máximo 50MB)</span>
          </div>
        )}
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.no_files}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file, i) => (
            <div
              key={file.id || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {file.file_name || file.name}
                  </div>
                  {file.file_size && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={file.url || '#'}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-ink, var(--accent))',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} />
                  <span>{t.download_file}</span>
                </a>

                {isStaff && onDeleteFile && (
                  <button
                    onClick={() => onDeleteFile(file.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--crit, #ef4444)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
