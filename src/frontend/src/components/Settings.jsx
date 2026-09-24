import React from 'react';
import { Moon, Sun, Globe, Bell, Monitor, Palette, Settings as SettingsIcon } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    settings: 'Settings',
    settings_sub: 'Customize your workspace preferences.',
    appearance: 'Appearance',
    appearance_sub: 'Control how the interface looks.',
    dark_mode: 'Dark Mode',
    dark_mode_desc: 'Switch between light and dark interface.',
    language: 'Language & Region',
    language_sub: 'Set your preferred language.',
    interface_lang: 'Interface Language',
    interface_lang_desc: 'Choose between English and Spanish.',
    notifications: 'Notifications',
    notifications_sub: 'Manage your alert preferences.',
    system_alerts: 'System Alerts',
    system_alerts_desc: 'Receive alerts when an agent changes state.',
    compact_mode: 'Compact Mode',
    compact_mode_desc: 'Show a denser interface layout.',
    en_label: 'English',
    es_label: 'Español',
  },
  es: {
    settings: 'Configuración',
    settings_sub: 'Personaliza las preferencias de tu espacio de trabajo.',
    appearance: 'Apariencia',
    appearance_sub: 'Controla el aspecto de la interfaz.',
    dark_mode: 'Modo Oscuro',
    dark_mode_desc: 'Alterna entre interfaz clara y oscura.',
    language: 'Idioma y Región',
    language_sub: 'Define tu idioma preferido.',
    interface_lang: 'Idioma de la Interfaz',
    interface_lang_desc: 'Elige entre inglés y español.',
    notifications: 'Notificaciones',
    notifications_sub: 'Gestiona tus preferencias de alertas.',
    system_alerts: 'Alertas del Sistema',
    system_alerts_desc: 'Recibe alertas cuando un agente cambia de estado.',
    compact_mode: 'Modo Compacto',
    compact_mode_desc: 'Muestra una interfaz más densa.',
    en_label: 'English',
    es_label: 'Español',
  },
};

function Toggle({ id, checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className={`w-11 h-6 rounded-full peer transition-colors ${checked ? 'bg-[var(--accent)]' : 'bg-bgSurface border border-borderColor'}`}>
        <div className={`absolute top-[2px] left-[2px] bg-white border border-borderColor rounded-full h-5 w-5 transition-transform ${checked ? 'translate-x-full border-white' : ''}`}></div>
      </div>
    </label>
  );
}

export default function Settings({ language, theme, onToggleTheme, onToggleLanguage }) {
  const t = (key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  const isDark = theme === 'dark';
  const isEn = language === 'en';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="glass-panel-inner p-6 flex flex-col gap-2 " >
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
          {language === 'es' ? 'Configuración' : 'Settings'}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{t('settings_sub')}</p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        
        {/* ── Appearance ── */}
        <section className="glass-panel-inner p-8 flex flex-col gap-6">
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Palette size={20} style={{ color: 'var(--color-gold)' }} />
            <h2 className="font-bold text-textMain text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{t('appearance')}</h2>
            <span className="text-xs text-textMuted ml-2 mt-1">{t('appearance_sub')}</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Theme selection now lives in the top bar (8-theme picker). */}

            {/* Compact mode */}
            <div className="flex items-center justify-between p-4 bg-bgMuted border border-borderColor rounded-xl hover:border-[var(--color-gold)] transition-colors group opacity-70">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-bgSurface flex items-center justify-center text-textMuted group-hover:text-[var(--color-gold)] transition-colors">
                  <Monitor size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-textMain">{t('compact_mode')}</span>
                  <span className="text-xs text-textMuted mt-0.5">{t('compact_mode_desc')}</span>
                </div>
              </div>
              <Toggle id="toggle-compact" checked={false} onChange={() => {}} />
            </div>
          </div>
        </section>

        {/* ── Language ── */}
        <section className="glass-panel-inner p-8 flex flex-col gap-6">
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Globe size={20} style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold text-textMain text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{t('language')}</h2>
            <span className="text-xs text-textMuted ml-2 mt-1">{t('language_sub')}</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-bgMuted border border-borderColor rounded-xl hover:border-[var(--accent)] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-bgSurface flex items-center justify-center text-textMuted group-hover:text-[var(--accent)] transition-colors">
                  <Globe size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-textMain">{t('interface_lang')}</span>
                  <span className="text-xs text-textMuted mt-0.5">{t('interface_lang_desc')}</span>
                </div>
              </div>
              <div className="flex bg-bgSurface border border-borderColor rounded-lg overflow-hidden p-1 shadow-inner">
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${isEn ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-textMuted hover:text-textMain'}`}
                  onClick={() => !isEn && onToggleLanguage()}
                >
                  {t('en_label')}
                </button>
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!isEn ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-textMuted hover:text-textMain'}`}
                  onClick={() => isEn && onToggleLanguage()}
                >
                  {t('es_label')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="glass-panel-inner p-8 flex flex-col gap-6">
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Bell size={20} style={{ color: '#f0ad4e' }} />
            <h2 className="font-bold text-textMain text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{t('notifications')}</h2>
            <span className="text-xs text-textMuted ml-2 mt-1">{t('notifications_sub')}</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-bgMuted border border-borderColor rounded-xl hover:border-[#f0ad4e] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-bgSurface flex items-center justify-center text-textMuted group-hover:text-[#f0ad4e] transition-colors">
                  <Bell size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-textMain">{t('system_alerts')}</span>
                  <span className="text-xs text-textMuted mt-0.5">{t('system_alerts_desc')}</span>
                </div>
              </div>
              <Toggle id="toggle-alerts" checked={true} onChange={() => {}} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
