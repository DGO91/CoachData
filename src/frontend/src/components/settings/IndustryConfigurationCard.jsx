import React from 'react';
import { Target, Users } from 'lucide-react';

export function IndustryConfigurationCard({ settings, onChange, language = 'es' }) {
  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Target size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Perfil de Cliente Ideal (ICP)' : 'Ideal Client Profile (ICP)'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Define quién es tu comprador o cliente perfecto para guiar las recomendaciones de la IA' : 'Define your target customer profile to guide AI recommendations'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
          <Users size={14} className="text-textMuted" />
          {language === 'es' ? 'Descripción del Cliente Ideal' : 'Ideal Client Profile Description'}
        </label>
        <textarea
          rows={3}
          className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
          placeholder="Ej. Business coaches, consultores de ventas y agencias de servicios premium facturando >$10k/mes..."
          value={settings.target_client_profile || ''}
          onChange={(e) => onChange('target_client_profile', e.target.value)}
        />
      </div>
    </section>
  );
}
