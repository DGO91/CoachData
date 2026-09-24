import React from 'react';

export const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ padding: '0.75rem 2.5rem 0.75rem 1rem', fontSize: '1rem', fontWeight: '600', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid #9CA3AF', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length > 0 ? selected.map(id => options.find(o => o.id === id)?.name || id).join(', ') : placeholder}
        </span>
      </div>
      <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>▼</div>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: 'var(--bg-surface)', border: '1px solid #9CA3AF', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
          {options.map(opt => {
            if (opt.isHeader) {
               return <div key={opt.id} style={{ padding: '0.5rem 1rem', background: 'var(--bg-muted)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{opt.name}</div>;
            }
            return (
            <div 
              key={opt.id}
              onClick={() => {
                if (selected.includes(opt.id)) {
                  onChange(selected.filter(x => x !== opt.id));
                } else {
                  onChange([...selected, opt.id]);
                }
              }}
              style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected.includes(opt.id) ? 'rgba(197, 168, 128, 0.05)' : 'transparent' }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--border)', background: selected.includes(opt.id) ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: selected.includes(opt.id) ? 'bold' : 'normal' }}>{opt.name}</span>
            </div>
          )})}
        </div>
      )}
    </div>
  );
};
