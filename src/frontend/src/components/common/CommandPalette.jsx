import React, { useState, useEffect, useRef } from 'react';
import { Search, LayoutDashboard, User, Settings, Key, Bot, Sun, Moon, Database } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onNavigate, onToggleTheme, language }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const isEs = language === 'es';

  const COMMANDS = [
    { id: 'dash', title: isEs ? 'Ir al Dashboard' : 'Go to Dashboard', category: 'Nav', icon: LayoutDashboard, action: () => onNavigate('dashboard') },
    { id: 'phase1', title: 'Fase 1: Prospect Capture & CRM', category: 'Flow', icon: Database, action: () => onNavigate('phase1') },
    { id: 'prospect', title: 'Prospect Analyzer Agent', category: 'Agent', icon: Bot, action: () => onNavigate('prospect') },
    { id: 'email', title: 'Email Organizer Agent', category: 'Agent', icon: Bot, action: () => onNavigate('email') },
    { id: 'mail', title: 'Smart Mail Responder', category: 'Agent', icon: Bot, action: () => onNavigate('mail-responder') },
    { id: 'profile', title: isEs ? 'Ver Mi Perfil' : 'View My Profile', category: 'Nav', icon: User, action: () => onNavigate('profile') },
    { id: 'creds', title: isEs ? 'Credenciales & CRM Keys' : 'Credentials & CRM Keys', category: 'Settings', icon: Key, action: () => onNavigate('credentials') },
    { id: 'settings', title: isEs ? 'Configuración de Sistema' : 'System Settings', category: 'Settings', icon: Settings, action: () => onNavigate('settings') },
    { id: 'theme', title: isEs ? 'Cambiar Tema (Claro/Oscuro)' : 'Toggle Theme (Light/Dark)', category: 'Action', icon: Sun, action: onToggleTheme },
  ];

  const filtered = COMMANDS.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Search size={20} color="var(--text-muted)" />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder={isEs ? 'Escribe un comando o busca un agente…' : 'Type a command or search agent…'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <span className="cmd-shortcut">ESC</span>
        </div>
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem 0' }}>
          {filtered.length > 0 ? (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => { cmd.action(); onClose(); }}
                >
                  <Icon size={18} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: isSelected ? '600' : '400' }}>{cmd.title}</span>
                  <span className="cmd-shortcut">{cmd.category}</span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isEs ? 'No se encontraron resultados.' : 'No commands found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
