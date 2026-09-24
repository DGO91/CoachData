// src/frontend/src/components/common/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-surface, #1e293b)', color: 'var(--text-primary, #f8fafc)', borderRadius: '16px', margin: '20px', border: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Se ha producido un error al cargar este módulo.</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginBottom: '20px' }}>
            {this.state.error?.message || 'Error inesperado de renderizado.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ padding: '10px 20px', background: 'var(--accent, #3b82f6)', color: 'var(--accent-text, #fff)', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
          >
            Reintentar Carga
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
