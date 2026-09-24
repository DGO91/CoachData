// src/frontend/src/components/client/ClientCommentsPanel.jsx
import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function ClientCommentsPanel({ comments = [], onAddComment, language = 'es' }) {
  const [text, setText] = useState('');
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const safeComments = Array.isArray(comments) ? comments : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (onAddComment) onAddComment(text);
    setText('');
  };

  return (
    <div className="ogd-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <div className="ogd-panel-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.comments_collaboration}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
        {safeComments.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.no_comments}</div>
        ) : (
          safeComments.map((c, i) => (
            <div
              key={c?.id || i}
              style={{
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{c?.author_name || 'Cliente'}</strong>
                <span style={{ color: 'var(--text-muted)' }}>{c?.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{c?.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.feedback_placeholder || 'Escribe un comentario…'}
          style={{
            flex: 1,
            background: 'var(--bg-root)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text, #fff)',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
