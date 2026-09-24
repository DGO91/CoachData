import React from 'react';
import { Play, Settings, Loader2 } from 'lucide-react';

export const ActionsCard = ({ 
  t, scheduleActive, setScheduleActive, cronHour, setCronHour, cronMinute, setCronMinute,
  handleTestNow, isTesting, handleSaveSettings, savingSettings
}) => (
  <div className="flex flex-col gap-6">
    <div className="glass-panel-inner flex flex-col gap-5 p-6" >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-textMain text-lg agent-section-title">{t('scheduleTitle')}</span>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ marginRight: '0.75rem', fontSize: '0.8rem', color: scheduleActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
            {scheduleActive ? 'ON' : 'OFF'}
          </span>
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px', 
            background: scheduleActive ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            boxShadow: scheduleActive ? '0 0 10px rgba(197, 168, 128, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.2)',
            position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
              position: 'absolute', top: '2px', left: scheduleActive ? '22px' : '2px', 
              transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
            <input 
              type="checkbox" 
              className="sr-only"
              checked={scheduleActive} 
              onChange={(e) => setScheduleActive(e.target.checked)} 
            />
          </div>
        </label>
      </div>
      
      <p className="text-sm text-textMuted leading-relaxed m-0">{t('scheduleDesc')}</p>
      
      <div className="flex items-center justify-between mt-1 text-sm bg-bgMain/40 p-4 rounded-xl border border-borderColor/40">
        <span className="text-textMuted font-medium">{t('timeLabel')}</span>
        <div className="flex items-center gap-2">
          <select
            value={cronHour}
            onChange={(e) => setCronHour(parseInt(e.target.value, 10))}
            disabled={!scheduleActive}
            className="rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-40 font-bold"
            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF' }}
          >
            {Array.from({length: 24}).map((_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}h</option>
            ))}
          </select>
          <span className="text-textMuted font-bold">:</span>
          <select
            value={cronMinute}
            onChange={(e) => setCronMinute(parseInt(e.target.value, 10))}
            disabled={!scheduleActive}
            className="rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-40 font-bold"
            style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #9CA3AF' }}
          >
            {[0, 15, 30, 45].map(m => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}m</option>
            ))}
          </select>
        </div>
      </div>
    </div>

    <div className="glass-panel-inner flex flex-col gap-4 p-6">
      <button 
        className="py-3 px-6 text-sm rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2" 
        style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--borderColor)' }} 
        onClick={handleTestNow}
        disabled={isTesting}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {isTesting ? <Loader2 size={18} className="animate-spin text-accentSage" /> : <Play size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />}
        {t('Run Agent & Send to WhatsApp', 'Ejecutar Agente (Enviar a WhatsApp)')}
      </button>
      
      <button
        onClick={handleSaveSettings}
        disabled={savingSettings}
        className="py-3.5 px-6 text-sm w-full rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text, #fff)', border: 'none', boxShadow: '0 4px 14px rgba(197, 168, 128, 0.35)' }} 
        onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        {savingSettings ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
        {savingSettings ? t('savingButton') : t('saveButton')}
      </button>
    </div>
  </div>
);
