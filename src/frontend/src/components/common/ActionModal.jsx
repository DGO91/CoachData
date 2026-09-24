import React from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';

export default function ActionModal({ title, message, isError, onClose, buttonText = "OK" }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: `1px solid ${isError ? '#ef4444' : '#4ade80'}`, animation: 'modalSlideUp 0.3s ease-out' }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isError ? <XCircle color="#ef4444" /> : <CheckCircle2 color="#4ade80" />}
          {title}
        </h3>
        <p style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.6rem 1.5rem' }}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
