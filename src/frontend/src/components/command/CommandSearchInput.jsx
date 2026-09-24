// src/frontend/src/components/command/CommandSearchInput.jsx
import React from 'react';
import { Search } from 'lucide-react';

export function CommandSearchInput({ query, setQuery, placeholder = 'Escribe un comando o busca en tu espacio…' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Search size={20} style={{ color: 'var(--accent-ink, var(--accent))', flexShrink: 0 }} />
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '16px',
          fontWeight: 500,
        }}
      />
      <kbd
        style={{
          fontSize: '11px',
          padding: '3px 6px',
          borderRadius: '4px',
          background: 'var(--bg-muted)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          fontFamily: 'monospace',
        }}
      >
        ESC
      </kbd>
    </div>
  );
}
