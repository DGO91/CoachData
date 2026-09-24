import { supabase } from '../../supabaseClient';

/**
 * fetch para la API propia, con las cabeceras que exige el backend.
 *
 * Casi todas las rutas de /api están montadas detrás de `authMiddleware` +
 * `tenantContextMiddleware`, que necesitan el JWT de Supabase y el slug de la
 * organización. Cada componente se lo montaba por su cuenta (o se le olvidaba,
 * y entonces la pantalla salía vacía sin error visible).
 *
 * Ojo con el modo de fallo de esta app: una ruta que NO existe no devuelve 404,
 * cae en el `app.get('*')` que sirve el index.html del SPA — o sea 200 con HTML.
 * Por eso `apiJson` comprueba que la respuesta sea realmente JSON y lanza un
 * error explicativo en vez de dejar que `res.json()` reviente con
 * "Unexpected token '<'", que no dice nada sobre la causa.
 */
export async function authHeaders(extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
    ...extra,
  };
}

export async function authFetch(path, options = {}) {
  const { headers, ...rest } = options;
  return fetch(path, { ...rest, headers: await authHeaders(headers) });
}

/** authFetch + parseo seguro. Devuelve null si la ruta no responde JSON. */
export async function apiJson(path, options = {}) {
  const res = await authFetch(path, options);
  const text = await res.text();

  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(
      `[api] ${path} devolvió HTML en vez de JSON: esa ruta no existe en el backend ` +
      `(cayó en el fallback del SPA). Revisa el prefijo de montaje en app.js.`
    );
  }

  if (!res.ok) {
    let detail = text.slice(0, 120);
    try { detail = JSON.parse(text).error || detail; } catch {}
    throw new Error(`[api] ${path} → HTTP ${res.status}: ${detail}`);
  }

  return text ? JSON.parse(text) : null;
}
