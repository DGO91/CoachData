import React from 'react';

export const CustomSingleSelect = ({ options, value, onChange, placeholder }) => {
  return (
    <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
      <select 
        className="form-input custom-border-input rounded-lg"
        style={{ padding: '0.5rem', paddingRight: '2rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', appearance: 'none', width: '100%' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {/* El sufijo permite ver de un vistazo cuales funcionan, sin tener que
            seleccionarlas una por una. Un <option> no admite estilos fiables
            entre navegadores, asi que va en el texto. */}
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.status && opt.status !== 'live' ? `${opt.name} — próximamente` : opt.name}
          </option>
        ))}
      </select>
      <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  );
};
