'use strict';

const crypto = require('crypto');
const { IConnector }     = require('../../application/ports/IConnector');
const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes }    = require('../../domain/EntityTypes');
const { AppError }       = require('../../../../shared/errors/AppError');

/**
 * CalendlyConnector — maps Calendly invitee webhooks to canonical entities.
 *
 * A Calendly webhook delivers an invitee event (created or canceled).
 * This connector maps it to a canonical_session and optionally a
 * canonical_contact if the invitee has an email.
 *
 * Calendly signature format: `Calendly-Webhook-Signature: t=<unix_ts>,v1=<hex_hmac>`
 * Signed payload: `${t}.${rawBody}`
 * Algorithm: HMAC-SHA256 in hex
 */
class CalendlyConnector extends IConnector {
  get id() { return 'calendly'; }
  get category() { return 'scheduling'; }
  get auth() { return 'oauth'; }
  get capabilities() { return ['sessions', 'contacts']; }

  /**
   * Maximum age (in seconds) for a webhook timestamp before rejection.
   * Calendly includes a timestamp in its signature header — unlike Tally,
   * which doesn't — so we enforce a window to prevent replay attacks.
   */
  static get TIMESTAMP_TOLERANCE_SECONDS() { return 300; } // 5 minutes

  /**
   * Verify Calendly HMAC-SHA256 signature with timestamp validation.
   * Fails closed — every path that cannot verify throws.
   *
   * Header format: `Calendly-Webhook-Signature: t=<unix_timestamp>,v1=<hex_hmac>`
   */
  verifySignature(rawBody, headers, secret) {
    if (!secret) {
      throw new AppError(
        'No Calendly webhook secret configured',
        500,
        'WEBHOOK_NOT_CONFIGURED'
      );
    }

    const signatureHeader = headers['calendly-webhook-signature'];
    if (!signatureHeader || !rawBody) {
      throw new AppError(
        'Missing Calendly-Webhook-Signature header',
        400,
        'MISSING_SIGNATURE'
      );
    }

    // Parse header: t=<timestamp>,v1=<signature>
    const parts = {};
    for (const segment of signatureHeader.split(',')) {
      const eqIdx = segment.indexOf('=');
      if (eqIdx > 0) {
        parts[segment.substring(0, eqIdx).trim()] = segment.substring(eqIdx + 1).trim();
      }
    }

    const timestamp = parts.t;
    const providedSig = parts.v1;

    if (!timestamp || !providedSig) {
      throw new AppError(
        'Malformed Calendly-Webhook-Signature header (missing t or v1)',
        400,
        'MISSING_SIGNATURE'
      );
    }

    // Timestamp replay protection: reject if older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const tsNum = parseInt(timestamp, 10);
    if (isNaN(tsNum) || Math.abs(now - tsNum) > CalendlyConnector.TIMESTAMP_TOLERANCE_SECONDS) {
      throw new AppError(
        `Calendly webhook timestamp too old or too far in the future (t=${timestamp}, now=${now})`,
        400,
        'STALE_TIMESTAMP'
      );
    }

    // Compute expected: HMAC-SHA256( secret, t + "." + rawBody ) → hex
    const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const signedPayload = `${timestamp}.${rawBodyStr}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new AppError('Invalid Calendly signature', 400, 'INVALID_SIGNATURE');
    }

    return true;
  }

  /**
   * Parse a verified Calendly webhook payload into canonical events.
   *
   * Calendly webhook payload shape:
   * {
   *   event: 'invitee.created' | 'invitee.canceled',
   *   created_at: '2026-...',
   *   payload: {
   *     uri: 'https://api.calendly.com/scheduled_events/.../invitees/...',
   *     email: 'client@example.com',
   *     name: 'Jane Doe',
   *     status: 'active' | 'canceled',
   *     event: 'https://api.calendly.com/scheduled_events/...',
   *     ...
   *   }
   * }
   *
   * Note: start_time and end_time are NOT in the webhook payload.
   * The CalendlyWebhookHandler enriches them before calling this method
   * by injecting `_enriched.start_time`, `_enriched.end_time`, and
   * `_enriched.event_type_name` into the payload object.
   *
   * @param {object} payload — the full webhook JSON
   * @param {string} organizationId — UUID of the owning organization
   * @returns {CanonicalEvent[]}
   */
  parseWebhook(payload, organizationId) {
    const events = [];
    const invitee = payload?.payload;
    if (!invitee) return events;

    const eventType = payload.event; // 'invitee.created' or 'invitee.canceled'
    const sourceId = invitee.uri || `calendly_${Date.now()}`;
    const email = typeof invitee.email === 'string' ? invitee.email.toLowerCase().trim() : null;
    const name = invitee.name || null;
    const occurredAt = payload.created_at ? new Date(payload.created_at) : new Date();

    // Enriched fields (injected by CalendlyWebhookHandler before calling parseWebhook)
    const enriched = payload._enriched || {};

    // Session event
    const isCanceled = eventType === 'invitee.canceled' || invitee.status === 'canceled';

    // For created sessions, start_time is mandatory. If enrichment failed, fail closed
    // so Calendly can retry and no orphan canonical_session with starts_at = null is created.
    if (!isCanceled && !enriched.start_time) {
      throw new AppError(
        'Calendly session start_time missing from enrichment payload',
        422,
        'CALENDLY_ENRICHMENT_REQUIRED'
      );
    }

    events.push(new CanonicalEvent({
      entityType:     EntityTypes.SESSION,
      organizationId,
      sourceProvider: 'calendly',
      sourceId,
      fields: {
        starts_at:      new Date(enriched.start_time).toISOString(),
        ends_at:        enriched.end_time ? new Date(enriched.end_time).toISOString() : null,
        attendee_email: email,
        attendee_name:  name,
        session_type:   enriched.event_type_name || 'Unknown',
      },
      rawPayload: { ...payload, _canceled: isCanceled },
      occurredAt,
    }));


    // Contact event (only for created, not canceled — don't create contacts from cancellations)
    if (email && !isCanceled) {
      events.push(new CanonicalEvent({
        entityType:     EntityTypes.CONTACT,
        organizationId,
        sourceProvider: 'calendly',
        sourceId:       `calendly_contact_${email.replace(/[^a-z0-9]/g, '_')}`,
        fields: {
          email,
          full_name: name,
          phone:     null,
        },
        rawPayload: { source_event: eventType, email, name },
        occurredAt,
      }));
    }

    return events;
  }

  async backfill(credentials, since, organizationId) {
    // Sin organización no se escribe nada. Antes caía a un UUID de pruebas,
    // lo que habría mezclado los datos de un cliente con los de cualquier
    // otro backfill que fallara igual. Mejor romper ruidosamente.
    if (!organizationId) {
      throw new Error('CalendlyConnector.backfill() requiere organizationId; recibido: ' + String(organizationId));
    }
    const events = [];
    // credentials.calendly is the Nango connection_id
    const connectionId = credentials?.calendly;
    if (!connectionId) {
      console.warn('[CalendlyConnector] No Calendly connection — skipping backfill');
      return events;
    }

    const nangoSecretKey = process.env.NANGO_SECRET_KEY;
    if (!nangoSecretKey) {
      console.warn('[CalendlyConnector] NANGO_SECRET_KEY not set — skipping backfill');
      return events;
    }

    // 1. Get access token from Nango
    let accessToken;
    try {
      const tokenRes = await fetch(
        `https://api.nango.dev/connection/${connectionId}?provider_config_key=calendly`,
        { headers: { 'Authorization': `Bearer ${nangoSecretKey}` } }
      );
      if (!tokenRes.ok) throw new Error(`Nango HTTP ${tokenRes.status}`);
      const tokenData = await tokenRes.json();
      accessToken = tokenData?.credentials?.access_token;
      if (!accessToken) throw new Error('No access_token in Nango response');
    } catch (err) {
      console.error('[CalendlyConnector] Failed to fetch Nango token for backfill:', err.message);
      return events;
    }

    // 2. Get user organization URI
    let userUri;
    try {
      const meRes = await fetch('https://api.calendly.com/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!meRes.ok) throw new Error(`Calendly /users/me HTTP ${meRes.status}`);
      const meData = await meRes.json();
      userUri = meData?.resource?.uri;
    } catch (err) {
      console.error('[CalendlyConnector] Failed to fetch Calendly user:', err.message);
      return events;
    }

    // 3. Fetch scheduled events with pagination
    const sinceDate = (since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).toISOString();
    let nextPageToken = null;

    try {
      do {
        const url = new URL('https://api.calendly.com/scheduled_events');
        url.searchParams.set('user', userUri);
        url.searchParams.set('min_start_time', sinceDate);
        url.searchParams.set('count', '100');
        url.searchParams.set('status', 'active');
        if (nextPageToken) url.searchParams.set('page_token', nextPageToken);

        const res = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Calendly /scheduled_events HTTP ${res.status}`);
        const data = await res.json();

        for (const ev of (data?.collection || [])) {
          const startTime = ev.start_time;
          if (!startTime) continue;

          events.push(new CanonicalEvent({
            entityType:     EntityTypes.SESSION,
            organizationId: organizationId,
            sourceProvider: 'calendly',
            sourceId:       ev.uri?.split('/').pop() || `calendly_${Date.now()}`,
            fields: {
              starts_at:  startTime,
              ends_at:    ev.end_time,
              event_type: ev.name || ev.event_type,
              status:     ev.status,
              location:   ev.location?.join_url || ev.location?.location,
            },
            rawPayload: { uri: ev.uri, name: ev.name, start_time: startTime },
            occurredAt: new Date(startTime),
          }));
        }

        nextPageToken = data?.pagination?.next_page_token || null;
      } while (nextPageToken);

      console.log(`[CalendlyConnector] Backfill: ${events.length} scheduled events fetched`);
    } catch (err) {
      console.error('[CalendlyConnector] Backfill events error:', err.message);
    }

    return events;
  }

  async healthCheck(credentials) {
    if (credentials?.calendly) {
      return { ok: true, message: 'Calendly connection configured via Nango' };
    }
    return { ok: false, message: 'No Calendly connection configured' };
  }
}

module.exports = { CalendlyConnector };
