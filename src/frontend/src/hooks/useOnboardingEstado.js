// src/frontend/src/hooks/useOnboardingEstado.js
import { useState, useEffect, useCallback } from 'react';
import { apiJson, authFetch } from '../core/api/authFetch';

/**
 * Qué le falta a esta organización para que el panel deje de estar vacío.
 *
 * El primer día no hay datos que enseñar, y ése es el momento de mayor abandono:
 * sin saber qué falta, el coach ve una pantalla vacía y no sabe por dónde
 * empezar. El backend calcula el estado mirando qué proveedores han enviado
 * eventos de verdad, no cuáles tienen credencial guardada.
 */
export function useOnboardingEstado() {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setEstado(await apiJson('/api/onboarding/estado'));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aplicarPack = useCallback(async (sector = 'business_coach_consulting') => {
    const res = await authFetch('/api/onboarding/aplicar-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'No se pudo aplicar la configuración');
    }
    const data = await res.json();
    await cargar();
    return data;
  }, [cargar]);

  return { estado, cargando, error, recargar: cargar, aplicarPack };
}
