// src/frontend/src/hooks/useAutomationDispatcher.js
// CoachData Operational OS v2 — Canonical Revenue Suite Automation Hook
//
// Usage:
//   const { dispatch, status, result, error, reset } = useAutomationDispatcher();
//   const r = await dispatch('leadhub_sync', { source: 'hubspot' });
//
// Status lifecycle: idle → processing → completed | failed | needs_reconnection

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Backend base URL — same origin in production
const API_BASE = '/api/revenue';

// Default organization slug — read from localStorage or env
function getOrgSlug() {
  return localStorage.getItem('coachdata_org_slug') ||
    import.meta.env.VITE_DEFAULT_ORG_SLUG ||
    'default';
}

// Exportada: toda ruta con tenant necesita Authorization + x-organization-slug,
// y no hay cliente API compartido. Reutilizarla evita que cada pantalla nueva
// se invente los headers y acabe hablando con la organización equivocada.
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'x-organization-slug': getOrgSlug(),
  };
}

export function useAutomationDispatcher() {
  const [status, setStatus] = useState('idle'); // idle | processing | completed | failed | needs_reconnection
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  /**
   * Dispatch an automation event to the backend.
   * @param {string} eventKey - One of: 'leadhub_sync' | 'revenue_chief_approved' | 'call_intelligence_approved' | 'proposal_approved'
   * @param {object} payload  - Event-specific data
   * @returns {object}        - { success, data, error }
   */
  const dispatch = useCallback(async (eventKey, payload = {}) => {
    setStatus('processing');
    setError(null);
    setResult(null);

    // Map event key to endpoint
    const ENDPOINT_MAP = {
      'leadhub_sync':               `${API_BASE}/leadhub-sync`,
      'revenue_chief_approved':     `${API_BASE}/chief-approve`,
      'call_intelligence_approved': `${API_BASE}/call-approve`,
      'proposal_approved':          `${API_BASE}/proposal-approve`,
    };

    const endpoint = ENDPOINT_MAP[eventKey];
    if (!endpoint) {
      const err = `Unknown automation event: ${eventKey}`;
      setStatus('failed');
      setError(err);
      return { success: false, error: err };
    }

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a reconnection error (401 / vault missing)
        if (response.status === 401 || response.status === 403) {
          setStatus('needs_reconnection');
          setError(data.message || 'Authentication required — please reconnect your account.');
          return { success: false, error: data.message, needs_reconnection: true };
        }

        setStatus('failed');
        setError(data.error || `HTTP ${response.status}`);
        return { success: false, error: data.error, data };
      }

      setStatus('completed');
      setResult(data);
      return { success: true, data };

    } catch (err) {
      // Network error or timeout
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const errorMsg = isTimeout
        ? 'Request timed out. Make.com may still process the event in background.'
        : `Network error: ${err.message}`;

      setStatus('failed');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Check Make.com webhook configuration status for this tenant.
   * Returns { leadhub_sync: { configured: bool }, ... }
   */
  const checkMakeStatus = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/make-status`, { headers });
      if (!response.ok) return null;
      const data = await response.json();
      return data.make_status;
    } catch {
      return null;
    }
  }, []);

  /**
   * Fetch real leads from the backend for the active tenant.
   */
  const fetchLeads = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/leads`, { headers });
      if (!response.ok) return [];
      const data = await response.json();
      return data.leads || [];
    } catch {
      return [];
    }
  }, []);

  return {
    dispatch,
    checkMakeStatus,
    fetchLeads,
    status,
    result,
    error,
    reset,
    isProcessing: status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    needsReconnection: status === 'needs_reconnection',
  };
}
