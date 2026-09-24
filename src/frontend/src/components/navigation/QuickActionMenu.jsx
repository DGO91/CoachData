// src/frontend/src/components/navigation/QuickActionMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, UserPlus, CreditCard, CheckSquare, MessageSquare, Bot } from 'lucide-react';

export function QuickActionMenu({ language = 'es', onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const isEs = language === 'es';

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const actions = [
    {
      id: 'new-lead',
      label: isEs ? 'Nuevo Prospecto' : 'New Lead',
      description: isEs ? 'Registrar contacto en Lead Hub' : 'Add contact to Lead Hub',
      icon: UserPlus,
      target: 'phase1',
    },
    {
      id: 'new-payment',
      label: isEs ? 'Cobro & Propuesta' : 'Payment & Proposal',
      description: isEs ? 'Generar enlace de cobro Stripe' : 'Generate Stripe payment link',
      icon: CreditCard,
      target: 'phase7',
    },
    {
      id: 'new-task',
      label: isEs ? 'Nueva Tarea Operativa' : 'New Operations Task',
      description: isEs ? 'Añadir al Project Desk' : 'Add to Project Desk',
      icon: CheckSquare,
      target: 'project-desk',
    },
    {
      id: 'new-message',
      label: isEs ? 'Mensaje WhatsApp' : 'WhatsApp Message',
      description: isEs ? 'Banco de mensajes y plantillas' : 'Message bank & templates',
      icon: MessageSquare,
      target: 'message-bank',
    },
    {
      id: 'run-briefing',
      label: isEs ? 'Briefing Matutino IA' : 'AI Morning Briefing',
      description: isEs ? 'Consultar agenda y correos' : 'Review agenda & emails',
      icon: Bot,
      target: 'personal-agent',
    },
  ];

  const handleAction = (target) => {
    setIsOpen(false);
    if (onNavigate) onNavigate(target);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isEs ? 'Acciones Rápidas (+)' : 'Quick Actions (+)'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm, 6px)',
          background: isOpen ? 'var(--accent)' : 'var(--bg-root)',
          border: '1px solid var(--border)',
          color: isOpen ? 'var(--accent-text, #ffffff)' : 'var(--accent-ink, var(--accent))',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--bg-surface)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-root)';
          }
        }}
      >
        <Plus size={16} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '260px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '6px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {isEs ? 'Acciones Rápidas' : 'Quick Actions'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={() => handleAction(act.target)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-root)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'var(--bg-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-ink, var(--accent))',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {act.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
