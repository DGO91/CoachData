import React from 'react';

export function TableSkeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', padding: '1rem 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div className="shimmer-skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <div className="shimmer-skeleton" style={{ width: '40%', height: '16px' }} />
              <div className="shimmer-skeleton" style={{ width: '60%', height: '12px' }} />
            </div>
          </div>
          <div className="shimmer-skeleton" style={{ width: '100px', height: '28px', borderRadius: '50px' }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="shimmer-skeleton" style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-md)' }} />
  );
}
