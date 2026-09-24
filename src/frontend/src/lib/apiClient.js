/**
 * apiClient.js
 * Canonical Standardized Multi-Tenant API Client — CoachData Operational OS v2
 */

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('supabase.auth.token') || localStorage.getItem('token');
  const orgSlug = localStorage.getItem('organization_slug') || 'default-org';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(orgSlug ? { 'x-organization-slug': orgSlug } : {}),
    ...options.headers
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    console.warn(`[apiClient] Auth/Tenant error on ${endpoint}:`, response.status);
  }

  return response;
}
