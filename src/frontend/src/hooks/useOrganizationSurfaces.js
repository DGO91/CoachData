// src/frontend/src/hooks/useOrganizationSurfaces.js
import { useState, useEffect, useCallback } from 'react';
import { apiJson, authFetch } from '../core/api/authFetch';

/**
 * Qué zonas del producto están activas para la organización actual.
 *
 * El producto llegó a nueve zonas navegables mientras su promesa es un único
 * centro de mando. Esto permite apagar las que no forman parte de esa promesa
 * sin borrar código: se ocultan, se mide si alguien las echa en falta, y sólo
 * entonces se decide si se eliminan.
 *
 * Mientras carga se devuelven las del núcleo y nada más. Es deliberado: es
 * preferible que una entrada de menú aparezca un instante después a que
 * parpadee una zona que esta organización tiene apagada.
 */

const NUCLEO = { dashboard: true, 'agents-hub': true, 'reports-hub': true };

export function useOrganizationSurfaces() {
  const [surfaces, setSurfaces] = useState(NUCLEO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const data = await apiJson('/api/organization/surfaces');
      setSurfaces({ ...NUCLEO, ...(data.surfaces || {}) });
      setError(null);
    } catch (err) {
      // Si la consulta falla no se abre el producto entero por si acaso: se
      // deja el núcleo, que es lo que toda organización tiene garantizado.
      setSurfaces(NUCLEO);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = useCallback(async (cambios) => {
    const res = await authFetch('/api/organization/surfaces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surfaces: cambios }),
    });
    if (!res.ok) {
      const detalle = await res.json().catch(() => ({}));
      throw new Error(detalle.error || 'No se pudo guardar');
    }
    const data = await res.json();
    setSurfaces({ ...NUCLEO, ...(data.surfaces || {}) });
    return data.surfaces;
  }, []);

  const activa = useCallback((clave) => surfaces[clave] !== false, [surfaces]);

  return { surfaces, activa, loading, error, guardar, recargar: cargar };
}
