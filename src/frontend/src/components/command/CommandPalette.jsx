// src/frontend/src/components/command/CommandPalette.jsx
import React, { useState, useEffect } from 'react';
import { CommandSearchInput } from './CommandSearchInput';
import { CommandResultsList } from './CommandResultsList';
import { useGlobalSearch } from './useGlobalSearch';
import { useActiveOrganizationId } from '../../hooks/useActiveOrganizationId';

export function CommandPalette({ isOpen, onClose, onNavigate, organizationId: organizationIdProp = null }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  // El valor por defecto era el UUID de pruebas 00000000-…-0001, que no
  // corresponde a ninguna fila de `organizations`, y App.jsx nunca pasa este
  // prop: la paleta llevaba buscando en una organización inexistente y no
  // encontraba jamás una tarea, un proyecto ni un contenido reales. Mismo
  // fallo que ya se corrigió en OperationalGoldDashboard, y misma solución.
  const { organizationId: activeOrganizationId } = useActiveOrganizationId();
  const organizationId = organizationIdProp ?? activeOrganizationId;
  const { results } = useGlobalSearch(organizationId, query);

  // Keyboard shortcut listener (⌘K / Ctrl+K & ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Arrow Navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleNavigation = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (item) => {
    if (onNavigate && item.target) {
      onNavigate(item.target);
    }
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        <CommandSearchInput query={query} setQuery={setQuery} />
        <CommandResultsList
          results={results}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onSelectResult={handleSelectResult}
        />
      </div>
    </div>
  );
}

export default CommandPalette;
