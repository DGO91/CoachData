// src/frontend/src/components/command/CommandResultsList.jsx
import React from 'react';
import { Layout, CheckSquare, Layers, Bot, ArrowRight, FileText } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function CommandResultsList({ results = [], selectedIndex = 0, onSelectIndex, onSelectResult, language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const getIcon = (type) => {
    switch (type) {
      case 'task': return <CheckSquare size={16} style={{ color: 'var(--good)' }} />;
      case 'project': return <Layout size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />;
      case 'content': return <Layers size={16} style={{ color: 'var(--warn)' }} />;
      default: return <FileText size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />;
    }
  };

  if (results.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No se encontraron resultados para tu búsqueda.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px 0' }}>
      {results.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={item.id}
            onMouseEnter={() => onSelectIndex(index)}
            onClick={() => onSelectResult(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              cursor: 'pointer',
              background: isSelected ? 'var(--bg-muted)' : 'transparent',
              borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {getIcon(item.type)}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item.category}
                </div>
              </div>
            </div>

            {isSelected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-ink, var(--accent))', fontWeight: 700 }}>
                <span>{t.select}</span>
                <ArrowRight size={14} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
