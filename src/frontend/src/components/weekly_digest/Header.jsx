import React from 'react';

export const Header = ({ title, desc }) => (
  <div className="agent-header">
    <h1 className="text-2xl font-bold text-textMain flex items-center gap-2 agent-section-title">
      {title}
    </h1>
    <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{desc}</p>
  </div>
);
