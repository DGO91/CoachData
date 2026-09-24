// src/frontend/src/components/common/Buttons.jsx
import React from 'react';

/**
 * Enterprise Canonical Button System v0.8.5
 * Heights: 38px, Radius: 10px, Font-weight: 600, Transition: 140ms ease
 */

export function ButtonPrimary({ children, icon: Icon, onClick, disabled, style, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-canonical btn-primary ${className}`}
      style={{
        height: 'var(--btn-height, 38px)',
        borderRadius: 'var(--btn-radius, 10px)',
        padding: '0 var(--btn-padding-x, 16px)',
        fontSize: 'var(--btn-font-size, 13px)',
        fontWeight: 'var(--btn-font-weight, 600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--btn-gap, 8px)',
        background: 'var(--accent)',
        color: 'var(--accent-text, #ffffff)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function ButtonSecondary({ children, icon: Icon, onClick, disabled, style, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-canonical btn-secondary ${className}`}
      style={{
        height: 'var(--btn-height, 38px)',
        borderRadius: 'var(--btn-radius, 10px)',
        padding: '0 var(--btn-padding-x, 16px)',
        fontSize: 'var(--btn-font-size, 13px)',
        fontWeight: 'var(--btn-font-weight, 600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--btn-gap, 8px)',
        background: 'var(--bg-muted, rgba(255,255,255,0.05))',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function ButtonGhost({ children, icon: Icon, onClick, disabled, style, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-canonical btn-ghost ${className}`}
      style={{
        height: 'var(--btn-height, 38px)',
        borderRadius: 'var(--btn-radius, 10px)',
        padding: children ? '0 var(--btn-padding-x, 16px)' : '0 10px',
        fontSize: 'var(--btn-font-size, 13px)',
        fontWeight: 'var(--btn-font-weight, 600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--btn-gap, 8px)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, title, onClick, disabled, style, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`btn-canonical btn-icon ${className}`}
      style={{
        width: 'var(--btn-height, 38px)',
        height: 'var(--btn-height, 38px)',
        borderRadius: 'var(--btn-radius, 10px)',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-muted, rgba(255,255,255,0.05))',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={16} />}
    </button>
  );
}
