'use strict';

const crypto = require('crypto');
const { IConnector }     = require('../../application/ports/IConnector');
const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes }    = require('../../domain/EntityTypes');
const { AppError }       = require('../../../../shared/errors/AppError');

/**
 * TallyConnector — maps Tally form submission webhooks to canonical entities.
 *
 * A Tally webhook delivers a form submission. This connector maps it to
 * a canonical_form_entry and optionally a canonical_contact if the
 * submission contains an email field.
 */
class TallyConnector extends IConnector {
  get id() { return 'tally'; }
  get category() { return 'forms'; }
  get auth() { return 'apikey'; }
  get capabilities() { return ['form_entries', 'contacts']; }

  /**
   * Verify Tally HMAC-SHA256 signature (base64 encoded).
   * Fails closed.
   */
  verifySignature(rawBody, headers, secret) {
    if (!secret) {
      throw new AppError('No Tally webhook secret configured', 500, 'WEBHOOK_NOT_CONFIGURED');
    }
    const signature = headers['tally-signature'];
    if (!signature || !rawBody) {
      throw new AppError('Missing Tally-Signature header', 400, 'MISSING_SIGNATURE');
    }

    const expected    = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const provided    = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
      throw new AppError('Invalid Tally signature', 400, 'INVALID_SIGNATURE');
    }
    return true;
  }

  /**
   * Parse a verified Tally webhook payload into canonical events.
   *
   * Tally payload shape (simplified):
   * {
   *   eventId: 'evt_xxx',
   *   eventType: 'FORM_RESPONSE',
   *   createdAt: '2026-...',
   *   data: {
   *     responseId: 'resp_xxx',
   *     formId: 'form_xxx',
   *     formName: 'Lead Capture',
   *     fields: [
   *       { key: 'question_xxx', label: 'Email', type: 'INPUT_EMAIL', value: 'foo@bar.com' },
   *       { key: 'question_yyy', label: 'Name', type: 'INPUT_TEXT', value: 'Jane Doe' },
   *       ...
   *     ]
   *   }
   * }
   */
  parseWebhook(payload, organizationId) {
    const events = [];
    const data = payload?.data;

    if (!data) return events;

    const responseId = data.responseId || data.response_id || `tally_${Date.now()}`;
    const formName   = data.formName || data.form_name || 'Unknown Form';
    const fields     = Array.isArray(data.fields) ? data.fields : [];

    // Extract email and name from fields
    let respondentEmail = null;
    let respondentName  = null;
    const answers = {};

    for (const field of fields) {
      const label = (field.label || '').toLowerCase();
      const value = field.value;

      if (field.type === 'INPUT_EMAIL' || label.includes('email') || label.includes('correo')) {
        respondentEmail = typeof value === 'string' ? value.toLowerCase() : null;
      }
      if (field.type === 'INPUT_TEXT' && (label.includes('name') || label.includes('nombre'))) {
        respondentName = value;
      }
      answers[field.key || field.label || `field_${fields.indexOf(field)}`] = value;
    }

    // Form entry event
    events.push(new CanonicalEvent({
      entityType:     EntityTypes.FORM_ENTRY,
      organizationId,
      sourceProvider: 'tally',
      sourceId:       responseId,
      fields: {
        form_name:        formName,
        respondent_email: respondentEmail,
        respondent_name:  respondentName,
        answers,
      },
      rawPayload: payload,
      occurredAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    }));

    // Contact event if email is present
    if (respondentEmail) {
      events.push(new CanonicalEvent({
        entityType:     EntityTypes.CONTACT,
        organizationId,
        sourceProvider: 'tally',
        sourceId:       `tally_contact_${respondentEmail.replace(/[^a-z0-9]/g, '_')}`,
        fields: {
          email:     respondentEmail,
          full_name: respondentName,
          phone:     null,
        },
        rawPayload: { source_event: 'FORM_RESPONSE', formName, respondentEmail },
        occurredAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
      }));
    }

    return events;
  }

  async backfill(credentials, since, organizationId) {
    // Sin organización no se escribe nada. Antes caía a un UUID de pruebas,
    // lo que habría mezclado los datos de un cliente con los de cualquier
    // otro backfill que fallara igual. Mejor romper ruidosamente.
    if (!organizationId) {
      throw new Error('TallyConnector.backfill() requiere organizationId; recibido: ' + String(organizationId));
    }
    const events = [];
    const apiKey = credentials?.tally_api_key || credentials?.form_secret || credentials?.tally;
    if (!apiKey) {
      console.warn('[TallyConnector] No Tally API key configured — skipping backfill');
      return events;
    }

    try {
      // 1. List user forms from Tally API
      const formsRes = await fetch('https://api.tally.so/users/me/forms', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!formsRes.ok) {
        console.warn(`[TallyConnector] Tally API /forms returned HTTP ${formsRes.status} (key might be webhook signing secret only)`);
        return events;
      }

      const formsData = await formsRes.json();
      const forms = formsData?.forms || [];

      for (const form of forms) {
        const formId = form.id;
        const formName = form.name || 'Tally Form';

        // 2. Fetch submissions for each form
        const subsRes = await fetch(`https://api.tally.so/forms/${formId}/submissions`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!subsRes.ok) continue;

        const subsData = await subsRes.json();
        const submissions = subsData?.submissions || [];

        for (const sub of submissions) {
          const subDate = sub.createdAt ? new Date(sub.createdAt) : new Date();
          if (since && subDate < since) continue;

          let respondentEmail = sub.respondentEmail || null;
          let respondentName = sub.respondentName || null;
          const answers = {};

          for (const field of (sub.fields || [])) {
            const label = field.label || field.key;
            answers[label] = field.value;
            if (!respondentEmail && (field.type === 'EMAIL' || label.toLowerCase().includes('email'))) {
              respondentEmail = field.value;
            }
            if (!respondentName && (field.type === 'NAME' || label.toLowerCase().includes('nombre') || label.toLowerCase().includes('name'))) {
              respondentName = typeof field.value === 'object' ? `${field.value.first || ''} ${field.value.last || ''}`.trim() : field.value;
            }
          }

          events.push(new CanonicalEvent({
            entityType: EntityTypes.FORM_ENTRY,
            organizationId: organizationId,
            sourceProvider: 'tally',
            sourceId: sub.id,
            fields: {
              form_name: formName,
              respondent_name: respondentName,
              respondent_email: respondentEmail,
              answers
            },
            rawPayload: { formId, formName, submissionId: sub.id, createdAt: sub.createdAt },
            occurredAt: subDate,
          }));

          if (respondentEmail) {
            events.push(new CanonicalEvent({
              entityType: EntityTypes.CONTACT,
              organizationId: organizationId,
              sourceProvider: 'tally',
              sourceId: `tally_contact_${respondentEmail.toLowerCase()}`,
              fields: {
                email: respondentEmail.toLowerCase(),
                full_name: respondentName,
              },
              rawPayload: { source_form: formName, submissionId: sub.id },
              occurredAt: subDate,
            }));
          }
        }
      }
      console.log(`[TallyConnector] Backfill: ${events.length} events fetched`);
    } catch (err) {
      console.error('[TallyConnector] Backfill error:', err.message);
    }

    return events;
  }

  async healthCheck(credentials) {
    // Tally doesn't have a public API for health checks; we can only
    // verify that the webhook secret is configured
    if (credentials?.tally) {
      return { ok: true, message: 'Tally webhook secret configured' };
    }
    return { ok: false, message: 'No Tally webhook secret configured' };
  }
}

module.exports = { TallyConnector };
