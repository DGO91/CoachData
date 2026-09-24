// src/frontend/src/components/revenue/LeadScoringCriteria.jsx
//
// La pantalla donde el coach define qué es un buen lead para él.
//
// Hasta ahora ese criterio solo se podía meter por SQL, así que la calificación
// existía pero nadie podía usarla. Sin criterio guardado, el calificador no
// puntúa nada y lo dice: por eso el estado "no se está calificando" se enseña
// arriba del todo y no escondido en un aviso.
import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';
import { getAuthHeaders } from '../../hooks/useAutomationDispatcher';
import { TextareaField, InputField, FieldLabel, FieldHint, FieldError } from '../common/FormInputs';
import { ButtonPrimary, ButtonSecondary } from '../common/Buttons';
import { useNotifications } from '../common/Notifications';

const ENDPOINT = '/api/revenue/lead-scoring-config';

// La base guarda `senales` como { nombre: peso }. La pantalla lo edita como
// lista ordenada para que el coach pueda añadir, renombrar y quitar filas.
function objetoASenales(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([nombre, peso]) => ({
    nombre,
    peso: Number.isFinite(Number(peso)) ? Number(peso) : 0,
  }));
}

function senalesAObjeto(lista) {
  return lista.reduce((acc, s) => {
    const nombre = s.nombre.trim();
    if (nombre) acc[nombre] = Number(s.peso) || 0;
    return acc;
  }, {});
}

function normalizar(estado) {
  return JSON.stringify({
    activo: estado.activo,
    criterio: estado.criterio.trim(),
    senales: senalesAObjeto(estado.senales),
    umbralAlto: estado.umbralAlto,
    umbralMedio: estado.umbralMedio,
  });
}

export default function LeadScoringCriteria({ language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';
  const { notify } = useNotifications();

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [activo, setActivo] = useState(true);
  const [criterio, setCriterio] = useState('');
  const [senales, setSenales] = useState([]);
  const [umbralAlto, setUmbralAlto] = useState(70);
  const [umbralMedio, setUmbralMedio] = useState(40);
  const [guardado, setGuardado] = useState(null);

  const aplicar = useCallback((config) => {
    const estado = {
      activo: config.activo !== false,
      criterio: config.criterio_texto || '',
      senales: objetoASenales(config.senales),
      umbralAlto: Number.isFinite(Number(config.umbral_alto)) ? Number(config.umbral_alto) : 70,
      umbralMedio: Number.isFinite(Number(config.umbral_medio)) ? Number(config.umbral_medio) : 40,
    };
    setActivo(estado.activo);
    setCriterio(estado.criterio);
    setSenales(estado.senales);
    setUmbralAlto(estado.umbralAlto);
    setUmbralMedio(estado.umbralMedio);
    setGuardado(normalizar(estado));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(ENDPOINT, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      aplicar(data);
    } catch (err) {
      // El fallo se ve en pantalla con su motivo. Un formulario vacío que
      // parece "sin criterio" cuando en realidad la carga falló haría que el
      // coach sobrescribiera su propia configuración sin saberlo.
      setErrorCarga(err.message);
    } finally {
      setCargando(false);
    }
  }, [aplicar]);

  useEffect(() => { cargar(); }, [cargar]);

  const actual = { activo, criterio, senales, umbralAlto, umbralMedio };
  const hayCambios = guardado !== null && normalizar(actual) !== guardado;

  // ── Validación ────────────────────────────────────────────────────────────
  // Los errores solo se pintan cuando el coach ya ha tocado algo. Al entrar,
  // una organización sin criterio veria un error en rojo por un estado que no
  // ha provocado; para eso está el aviso azul de más abajo, que informa sin
  // acusar. El botón de guardar sigue bloqueado igual.
  const errores = {};
  const erroresVisibles = {};
  if (activo && !criterio.trim()) {
    errores.criterio = t.scoring_criterion_required;
  }
  if (senales.some((s) => !s.nombre.trim())) {
    errores.senales = t.scoring_signal_name_required;
  } else {
    const nombres = senales.map((s) => s.nombre.trim().toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      errores.senales = t.scoring_signal_duplicated;
    }
  }
  const fueraDeRango = [umbralAlto, umbralMedio].some(
    (n) => !Number.isInteger(n) || n < 0 || n > 100
  );
  if (fueraDeRango) {
    errores.umbrales = t.scoring_threshold_range;
  } else if (umbralAlto <= umbralMedio) {
    errores.umbrales = t.scoring_threshold_order;
  }
  const puedeGuardar = hayCambios && !guardando && Object.keys(errores).length === 0;

  // Con cambios sin guardar, los errores sí se muestran: ahí el coach ya está
  // editando y necesita saber por qué no puede guardar.
  if (hayCambios) Object.assign(erroresVisibles, errores);

  // Estado real que el coach no puede deducir de la pantalla: la calificación
  // figura activa pero, sin criterio, el agente no puntúa a nadie.
  const activaPeroSinCriterio = activo && !criterio.trim();

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          criterio_texto: criterio.trim(),
          senales: senalesAObjeto(senales),
          umbral_alto: umbralAlto,
          umbral_medio: umbralMedio,
          activo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      aplicar(data.config);
      notify(t.scoring_saved, { type: 'success' });
    } catch (err) {
      notify(`${t.scoring_save_error} ${err.message}`, { type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const numeroDesde = (valor) => {
    if (valor === '') return NaN;
    return Number(valor);
  };

  if (cargando) {
    return (
      <div style={{ padding: '2rem', fontSize: '13px', color: 'var(--text-muted)' }}>
        {isEs ? 'Cargando el criterio…' : 'Loading the criterion…'}
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '1rem', borderRadius: '10px',
          border: '1px solid var(--border)', background: 'var(--bg-surface)',
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t.scoring_load_error}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
              {errorCarga}
            </div>
            <ButtonSecondary icon={RefreshCw} onClick={cargar}>{t.scoring_retry}</ButtonSecondary>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {t.scoring_title}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 20px', lineHeight: 1.5 }}>
        {t.scoring_intro}
      </p>

      {/* Interruptor: el estado que decide si se califica algo o no */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', padding: '14px 16px', borderRadius: '10px',
        border: '1px solid var(--border)', background: 'var(--bg-surface)',
        marginBottom: '8px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t.scoring_active}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {t.scoring_active_hint}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label={t.scoring_active}
          onClick={() => setActivo((v) => !v)}
          style={{
            width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
            border: '1px solid var(--border)',
            background: activo ? 'var(--accent)' : 'var(--bg-muted)',
            position: 'relative', cursor: 'pointer', transition: 'all 140ms ease',
          }}
        >
          <span style={{
            position: 'absolute', top: '2px', left: activo ? '22px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: activo ? 'var(--accent-text)' : 'var(--text-muted)',
            transition: 'left 140ms ease',
          }} />
        </button>
      </div>

      {(!activo || activaPeroSinCriterio) && (
        <div style={{
          fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)',
          padding: '10px 16px', borderRadius: '10px', marginBottom: '20px',
          border: '1px solid var(--border)', background: 'var(--bg-muted)',
        }}>
          {t.scoring_inactive_notice}
        </div>
      )}
      {activo && !activaPeroSinCriterio && <div style={{ marginBottom: '20px' }} />}

      <TextareaField
        label={t.scoring_criterion_label}
        hint={t.scoring_criterion_hint}
        error={erroresVisibles.criterio}
        placeholder={t.scoring_criterion_placeholder}
        value={criterio}
        onChange={(e) => setCriterio(e.target.value)}
        style={{ minHeight: '140px' }}
      />

      {/* Señales y pesos */}
      <div style={{ marginBottom: '16px' }}>
        <FieldLabel>{t.scoring_signals_label}</FieldLabel>
        {senales.length === 0 ? (
          <div style={{
            fontSize: '12px', color: 'var(--text-muted)',
            padding: '14px 16px', borderRadius: '10px',
            border: '1px dashed var(--border)', background: 'var(--bg-surface)',
          }}>
            {t.scoring_signals_empty}
          </div>
        ) : (
          senales.map((senal, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                aria-label={t.scoring_signal_name}
                className="form-canonical-input"
                placeholder={t.scoring_signal_name}
                value={senal.nombre}
                onChange={(e) => setSenales((prev) =>
                  prev.map((s, j) => (j === i ? { ...s, nombre: e.target.value } : s))
                )}
                style={{
                  flex: 1, height: '38px', borderRadius: '10px', padding: '0 14px',
                  fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', border: '1px solid var(--border)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                aria-label={t.scoring_signal_weight}
                className="form-canonical-input"
                type="number"
                min="0"
                max="100"
                value={senal.peso}
                onChange={(e) => setSenales((prev) =>
                  prev.map((s, j) => (j === i ? { ...s, peso: numeroDesde(e.target.value) } : s))
                )}
                style={{
                  width: '96px', height: '38px', borderRadius: '10px', padding: '0 14px',
                  fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', border: '1px solid var(--border)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                aria-label={t.scoring_signal_remove}
                title={t.scoring_signal_remove}
                onClick={() => setSenales((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  border: '1px solid var(--border)', background: 'var(--bg-surface)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
        <FieldHint>{t.scoring_signals_hint}</FieldHint>
        <FieldError>{erroresVisibles.senales}</FieldError>
        <div style={{ marginTop: '8px' }}>
          <ButtonSecondary
            icon={Plus}
            onClick={() => setSenales((prev) => [...prev, { nombre: '', peso: 50 }])}
          >
            {t.scoring_signal_add}
          </ButtonSecondary>
        </div>
      </div>

      {/* Umbrales */}
      <FieldLabel>{t.scoring_thresholds_label}</FieldLabel>
      <div style={{ display: 'flex', gap: '12px' }}>
        <InputField
          label={t.scoring_threshold_high}
          type="number"
          min="0"
          max="100"
          value={Number.isNaN(umbralAlto) ? '' : umbralAlto}
          onChange={(e) => setUmbralAlto(numeroDesde(e.target.value))}
        />
        <InputField
          label={t.scoring_threshold_mid}
          type="number"
          min="0"
          max="100"
          value={Number.isNaN(umbralMedio) ? '' : umbralMedio}
          onChange={(e) => setUmbralMedio(numeroDesde(e.target.value))}
        />
      </div>
      <FieldHint>{t.scoring_thresholds_hint}</FieldHint>
      <FieldError>{erroresVisibles.umbrales}</FieldError>

      {/* Lo que el coach no puede adivinar: cambiar el criterio no reescribe el pasado */}
      <p style={{
        fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5,
        margin: '20px 0 16px', paddingTop: '16px', borderTop: '1px solid var(--border)',
      }}>
        {t.scoring_applies_forward}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ButtonPrimary icon={Save} onClick={guardar} disabled={!puedeGuardar}>
          {guardando ? t.saving : t.save}
        </ButtonPrimary>
        {hayCambios && (
          <>
            <ButtonSecondary onClick={cargar} disabled={guardando}>
              {t.scoring_discard}
            </ButtonSecondary>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {t.scoring_unsaved}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
