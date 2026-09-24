import React from 'react';
import { Key } from 'lucide-react';

export const Header = ({ title, subtitle, isAdmin, zeroKnowledgeBanner }) => (
  <div className="glass-panel-inner p-6 flex flex-col gap-2 " >
    <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
            {title}
          </h1>
          <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{subtitle}</p>
        </div>
    </div>
    {!isAdmin && (
      <div className="mt-4 p-4 bg-accentSage/10 border border-accentSage rounded-xl flex items-start gap-3">
        <span className="text-accentSage font-bold mt-0.5">🔒</span>
        <p className="text-sm text-textMain m-0 leading-relaxed">
          <strong>Zero-Knowledge Security:</strong> {zeroKnowledgeBanner}
        </p>
      </div>
    )}
  </div>
);
