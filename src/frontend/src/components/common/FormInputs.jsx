// src/frontend/src/components/common/FormInputs.jsx
import React from 'react';
import { Search } from 'lucide-react';

/**
 * Enterprise Form System v0.8.6
 * Inputs: 38px height, 10px radius, 14px padding-x, 13px font-size, var(--accent) focus-ring
 */

export function FieldLabel({ children, required, htmlFor }) {
  if (!children) return null;
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '6px',
      }}
    >
      {children}
      {required && <span style={{ color: 'var(--crit, #ef4444)', marginLeft: '4px' }}>*</span>}
    </label>
  );
}

export function FieldHint({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
      {children}
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: '11px', color: 'var(--crit, #ef4444)', marginTop: '4px', fontWeight: 600 }}>
      {children}
    </div>
  );
}

export function InputField({ label, hint, error, required, id, style, className = '', ...props }) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      <FieldLabel htmlFor={inputId} required={required}>{label}</FieldLabel>
      <input
        id={inputId}
        className={`form-canonical-input ${className}`}
        style={{
          width: '100%',
          height: '38px',
          borderRadius: '10px',
          padding: '0 14px',
          fontSize: '13px',
          fontFamily: 'inherit',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: error ? '1px solid var(--crit, #ef4444)' : '1px solid var(--border)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 140ms ease',
          ...style,
        }}
        {...props}
      />
      <FieldHint>{hint}</FieldHint>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', id, style, className = '', ...props }) {
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`form-canonical-input ${className}`}
        style={{
          width: '100%',
          height: '38px',
          borderRadius: '10px',
          padding: '0 14px 0 38px',
          fontSize: '13px',
          fontFamily: 'inherit',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 140ms ease',
          ...style,
        }}
        {...props}
      />
    </div>
  );
}

export function SelectField({ label, hint, error, required, children, id, style, className = '', ...props }) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      <FieldLabel htmlFor={selectId} required={required}>{label}</FieldLabel>
      <select
        id={selectId}
        className={`form-canonical-input ${className}`}
        style={{
          width: '100%',
          height: '38px',
          borderRadius: '10px',
          padding: '0 14px',
          fontSize: '13px',
          fontFamily: 'inherit',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: error ? '1px solid var(--crit, #ef4444)' : '1px solid var(--border)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 140ms ease',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
      <FieldHint>{hint}</FieldHint>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function TextareaField({ label, hint, error, required, id, style, className = '', ...props }) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      <FieldLabel htmlFor={textareaId} required={required}>{label}</FieldLabel>
      <textarea
        id={textareaId}
        className={`form-canonical-input ${className}`}
        style={{
          width: '100%',
          minHeight: '96px',
          borderRadius: '10px',
          padding: '14px',
          fontSize: '13px',
          fontFamily: 'inherit',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: error ? '1px solid var(--crit, #ef4444)' : '1px solid var(--border)',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          transition: 'all 140ms ease',
          ...style,
        }}
        {...props}
      />
      <FieldHint>{hint}</FieldHint>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function DateField({ label, hint, error, required, id, style, className = '', ...props }) {
  const dateId = id || (label ? `date-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div style={{ marginBottom: '16px', width: '100%' }}>
      <FieldLabel htmlFor={dateId} required={required}>{label}</FieldLabel>
      <input
        type="date"
        id={dateId}
        className={`form-canonical-input ${className}`}
        style={{
          width: '100%',
          height: '38px',
          borderRadius: '10px',
          padding: '0 14px',
          fontSize: '13px',
          fontFamily: 'inherit',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: error ? '1px solid var(--crit, #ef4444)' : '1px solid var(--border)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 140ms ease',
          ...style,
        }}
        {...props}
      />
      <FieldHint>{hint}</FieldHint>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function FormSection({ title, description, children, style }) {
  return (
    <div style={{ marginBottom: '24px', ...style }}>
      {title && (
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
          {title}
        </h3>
      )}
      {description && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
