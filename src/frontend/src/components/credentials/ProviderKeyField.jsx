import React from 'react';
import { Save, Check, Clock, Plug } from 'lucide-react';
import { CustomSingleSelect } from './CustomSingleSelect';
import {
  getStatus,
  getFieldStatus,
  resolveFieldState,
  CONNECTED,
  AVAILABLE,
  COMING_SOON,
  LIVE,
  SOON,
} from '../../core/config/integrations.registry';

/**
 * One "select provider (optional) + secret input + save button" row.
 * Extracted from Credentials.jsx, where this exact block was copy-pasted
 * 12 times with drifting inline styles (some used var(--border), others a
 * hardcoded #9CA3AF) — single definition now, one source of truth for style.
 *
 * Muestra el estado real de la herramienta seleccionada. Si todavía no hay
 * integración, el campo de la clave se deshabilita: aceptar una credencial que
 * nadie va a leer hace creer al usuario que su negocio está conectado cuando
 * no lo está. Ver core/config/integrations.registry.js.
 */
export function ProviderKeyField({
  id,
  label,
  options,
  selectValue,
  onSelectChange,
  selectPlaceholder,
  inputValue,
  onInputChange,
  inputPlaceholder,
  inputType = 'password',
  onSave,
  saving,
  language = 'es',
  /** Campos sin selector: su estado se mira por esta clave, no por el <select>. */
  providerKey,
}) {
  const isEs = language === 'es';
  const inputId = id || (label ? `pkf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  // Con selector: el estado depende de la herramienta elegida, y hasta que el
  // usuario elija una no se bloquea nada.
  // Sin selector: el estado es fijo, se mira por providerKey.
  const chosen = selectValue || '';
  const hasSelect = Boolean(options);
  const hasChoice = Boolean(chosen);

  const registryStatus = hasSelect
    ? (hasChoice ? getStatus(chosen) : SOON)
    : (providerKey ? getFieldStatus(providerKey) : LIVE);

  const fieldState = resolveFieldState({ status: registryStatus, credentialValue: inputValue });

  const showState = hasSelect ? hasChoice : Boolean(providerKey);
  const blocked = showState && fieldState === COMING_SOON;

  const STATE_BADGE = {
    [CONNECTED]: {
      icon: <Check size={10} aria-hidden="true" />,
      text: isEs ? 'Conectado' : 'Connected',
      style: { background: 'var(--success-bg)', color: 'var(--success)' },
    },
    [AVAILABLE]: {
      icon: <Plug size={10} aria-hidden="true" />,
      text: isEs ? 'Disponible' : 'Available',
      style: { background: 'var(--bg-muted)', color: 'var(--accent-ink, var(--accent))' },
    },
    [COMING_SOON]: {
      icon: <Clock size={10} aria-hidden="true" />,
      text: isEs ? 'Próximamente' : 'Coming soon',
      style: { background: 'var(--bg-muted)', color: 'var(--text-muted)' },
    },
  };

  const badge = STATE_BADGE[fieldState];

  const statusId = inputId ? `${inputId}-status` : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* La fila de cabecera se pinta si hay etiqueta O si hay estado que
          mostrar: la mitad de los campos del Vault no tienen `label`, y
          anidar el estado dentro de `{label && …}` lo dejaba invisible
          justo donde mas hace falta. */}
      {(label || showState) && (
        <div className="flex items-center justify-between gap-2 min-h-[18px]">
          {label
            ? <label htmlFor={inputId} className="text-xs text-textMuted font-bold uppercase">{label}</label>
            : <span />}
          {showState && (
            <span
              id={statusId}
              className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"
              style={badge.style}
            >
              {badge.icon}
              {badge.text}
            </span>
          )}
        </div>
      )}

      {options && (
        <CustomSingleSelect
          options={options}
          value={chosen}
          onChange={onSelectChange}
          placeholder={selectPlaceholder}
        />
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type={inputType}
          placeholder={blocked
            ? (isEs ? 'Aún no disponible' : 'Not available yet')
            : inputPlaceholder}
          // Secrets, not login credentials — autocomplete="off" and a
          // non-guessable name keep browser password managers from treating
          // these like a username/password pair and offering to save them.
          autoComplete="off"
          name={inputId ? `${inputId}-secret` : undefined}
          spellCheck={false}
          disabled={blocked}
          aria-describedby={statusId}
          className="flex-1 bg-bgMain border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accentSage focus:ring-1 focus:ring-accentSage transition-colors text-textMain shadow-sm disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)', opacity: blocked ? 0.5 : 1 }}
          value={inputValue || ''}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={label || (isEs ? 'Guardar' : 'Save')}
          className="premium-btn px-4 flex items-center justify-center rounded-lg"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text, #ffffff)',
            border: 'none',
            cursor: blocked || saving ? 'not-allowed' : 'pointer',
            opacity: blocked ? 0.5 : 1,
          }}
          onClick={onSave}
          disabled={saving || blocked}
        >
          <Save size={16} aria-hidden="true" />
        </button>
      </div>

      {blocked && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isEs
            ? 'Todavía no leemos los datos de esta herramienta, así que no te pedimos la clave. Te avisaremos cuando esté lista.'
            : 'We do not read data from this tool yet, so we are not asking for your key. We will let you know when it is ready.'}
        </p>
      )}

      {showState && fieldState === AVAILABLE && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isEs
            ? 'Esta integración ya funciona. Pega tu clave y guárdala para empezar a recibir sus datos.'
            : 'This integration already works. Paste your key and save it to start receiving its data.'}
        </p>
      )}
    </div>
  );
}
