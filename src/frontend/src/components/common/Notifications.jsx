import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Avisos y confirmaciones compartidos.
 *
 * Sustituye a los alert() y window.confirm() repartidos por la app. Los nativos
 * bloquean el hilo, no se pueden traducir ni estilar, se muestran con el nombre
 * del host ("localhost:4000 dice…") y algunos navegadores los suprimen tras
 * varios seguidos, con lo que el usuario se queda sin enterarse del error.
 *
 *   const { notify, confirm } = useNotifications();
 *   notify('Guardado', { type: 'success' });
 *   if (await confirm({ message: '¿Eliminar?', danger: true })) { … }
 *
 * `confirm` devuelve una promesa que resuelve a true/false, así que la
 * migración desde window.confirm es un `await` de más.
 */

const NotificationsContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Un componente montado fuera del provider no debe reventar: degrada a consola.
    return {
      notify: (message) => console.warn('[Notifications] fuera del provider:', message),
      confirm: async () => false,
    };
  }
  return ctx;
}

const TONES = {
  success: { fg: 'var(--success)', bg: 'var(--success-bg)' },
  error: { fg: 'var(--danger)', bg: 'var(--danger-bg)' },
  warning: { fg: 'var(--warning)', bg: 'var(--warning-bg)' },
  info: { fg: 'var(--accent-ink, var(--accent))', bg: 'var(--bg-muted)' },
};

let nextId = 1;

export function NotificationsProvider({ children, language = 'es' }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, { type = 'info', duration = 5000 } = {}) => {
    if (!message) return;
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message: String(message), type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      if (current) current.resolve(result);
      return null;
    });
  }, []);

  return (
    <NotificationsContext.Provider value={{ notify, confirm }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} language={language} />
      {dialog && <ConfirmDialog {...dialog} onClose={closeDialog} language={language} />}
    </NotificationsContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss, language }) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        maxWidth: 'min(380px, calc(100vw - 48px))',
      }}
    >
      {toasts.map((t) => {
        const tone = TONES[t.type] || TONES.info;
        return (
          <div
            key={t.id}
            // Los errores interrumpen al lector de pantalla; el resto espera turno.
            role={t.type === 'error' ? 'alert' : 'status'}
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '14px 16px', borderRadius: '12px',
              background: tone.bg, border: `1px solid ${tone.fg}`, color: tone.fg,
              fontSize: '13px', fontWeight: 600, lineHeight: 1.5,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label={language === 'es' ? 'Cerrar aviso' : 'Dismiss notification'}
              style={{
                border: 'none', background: 'transparent', color: 'inherit',
                cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onClose, language }) {
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(false); return; }
      if (e.key !== 'Tab') return;
      // El foco no debe escaparse del diálogo mientras está abierto.
      const focusables = panelRef.current?.querySelectorAll('button');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ok = confirmLabel || (language === 'es' ? 'Confirmar' : 'Confirm');
  const cancel = cancelLabel || (language === 'es' ? 'Cancelar' : 'Cancel');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '16px',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
      }}
      onClick={() => onClose(false)}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title || (language === 'es' ? 'Confirmar acción' : 'Confirm action')}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '16px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '12px',
        }}
      >
        {title && (
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        )}
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => onClose(false)}
            style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            {cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              background: danger ? 'var(--danger-bg)' : 'var(--accent)',
              color: danger ? 'var(--danger)' : 'var(--accent-text)',
              border: danger ? '1px solid var(--danger)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            {ok}
          </button>
        </div>
      </div>
    </div>
  );
}
