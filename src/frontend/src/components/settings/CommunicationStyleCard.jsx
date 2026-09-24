import React from 'react';
import { MessageSquare, Volume2, Globe } from 'lucide-react';

export function CommunicationStyleCard({ communicationStyle = {}, onChange, language = 'es' }) {
  const currentTone = communicationStyle.tone || 'executive';
  const currentStyle = communicationStyle.style || 'balanced';
  const currentLang = communicationStyle.language || 'es';

  const updateSubField = (field, value) => {
    onChange('communication_style', {
      ...communicationStyle,
      [field]: value
    });
  };

  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Estilo de Comunicación' : 'Communication Style'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Ajusta el tono, extensión e idioma que utilizará tu asistente virtual' : 'Adjust tone, length and language used by your virtual assistant'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Volume2 size={14} className="text-textMuted" />
            {language === 'es' ? 'Tono de Voz' : 'Tone of Voice'}
          </label>
          <select
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            value={currentTone}
            onChange={(e) => updateSubField('tone', e.target.value)}
          >
            <option value="executive">Ejecutivo & Formal</option>
            <option value="consultative">Consultivo & Estratégico</option>
            <option value="analytical">Analítico & Técnico</option>
            <option value="friendly">Profesional & Cercano</option>
          </select>
        </div>

        {/* Style / Detail */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <MessageSquare size={14} className="text-textMuted" />
            {language === 'es' ? 'Extensión de Respuesta' : 'Response Detail Style'}
          </label>
          <select
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            value={currentStyle}
            onChange={(e) => updateSubField('style', e.target.value)}
          >
            <option value="concise">Conciso & Directo (Bullet Points)</option>
            <option value="balanced">Balanceado (Estándar)</option>
            <option value="detailed">Exhaustivo & Explicativo</option>
          </select>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textMain flex items-center gap-1.5">
            <Globe size={14} className="text-textMuted" />
            {language === 'es' ? 'Idioma de Salida' : 'Output Language'}
          </label>
          <select
            className="w-full px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
            value={currentLang}
            onChange={(e) => updateSubField('language', e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </section>
  );
}
