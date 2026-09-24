'use strict';

const crypto = require('crypto');

/**
 * Buzón de eventos entrantes.
 *
 * Separa recibir de entender. El router de webhooks valida la firma y deja aquí
 * el evento tal como llegó; la normalización al modelo canónico ocurre después,
 * fuera de la petición del proveedor.
 *
 * Antes el dispatcher escribía en el modelo canónico con la petición todavía
 * abierta: un fallo de la base de datos devolvía un error al proveedor y el
 * evento sólo sobrevivía si él decidía reintentar. Stripe reintenta; Tally y
 * Kajabi no siempre.
 */
class WebhookInbox {
    constructor({ supabaseClient }) {
        if (!supabaseClient) throw new Error('[WebhookInbox] Falta el cliente de Supabase');
        this._db = supabaseClient;
    }

    /**
     * Huella para no procesar dos veces el mismo reenvío del proveedor.
     * Se prefiere el identificador propio del evento; si no lo trae, se usa un
     * resumen del cuerpo, que distingue reenvíos idénticos de eventos distintos.
     */
    static fingerprint(provider, payload, rawBody) {
        const propio = payload?.id || payload?.event_id || payload?.eventId
            || payload?.data?.id || payload?.entry?.[0]?.id;
        if (propio) return `${provider}:${propio}`;
        const material = rawBody || JSON.stringify(payload || {});
        return `${provider}:sha:${crypto.createHash('sha256').update(material).digest('hex')}`;
    }

    /**
     * Guarda un evento recibido. Devuelve { id, duplicado }.
     *
     * Un duplicado no es un error: significa que el proveedor reenvió algo que ya
     * teníamos, y la respuesta correcta sigue siendo 200 para que deje de
     * insistir.
     */
    async recibir({ tenantRef, provider, payload, rawBody, signature }) {
        const fingerprint = WebhookInbox.fingerprint(provider, payload, rawBody);

        const { data, error } = await this._db
            .from('webhook_inbox')
            .insert({
                tenant_ref: tenantRef,
                provider,
                payload: payload || {},
                raw_body: rawBody ? String(rawBody) : null,
                signature: signature || null,
                fingerprint,
            })
            .select('id')
            .single();

        // 23505 es la violación del índice único: ya lo teníamos.
        if (error && error.code === '23505') return { id: null, duplicado: true };
        if (error) throw new Error(`[WebhookInbox] No se pudo guardar el evento: ${error.message}`);

        return { id: data.id, duplicado: false };
    }

    /** Eventos por procesar, de los más antiguos a los más nuevos. */
    async pendientes(limite = 50) {
        const { data, error } = await this._db
            .from('webhook_inbox')
            .select('*')
            .in('status', ['pending', 'failed'])
            .order('received_at', { ascending: true })
            .limit(limite);

        if (error) throw new Error(`[WebhookInbox] No se pudieron leer los pendientes: ${error.message}`);
        return data || [];
    }

    async marcarProcesado(id, organizationId) {
        const { error } = await this._db
            .from('webhook_inbox')
            .update({
                status: 'processed',
                processed_at: new Date().toISOString(),
                last_error: null,
                ...(organizationId ? { organization_id: organizationId } : {}),
            })
            .eq('id', id);
        if (error) throw new Error(`[WebhookInbox] No se pudo marcar como procesado: ${error.message}`);
    }

    /**
     * Marca un intento fallido. A partir del máximo de intentos el evento pasa a
     * 'discarded' y deja de reintentarse: sin ese tope, un evento con un fallo
     * permanente —un payload que ningún conector sabe mapear— se reintentaría
     * para siempre y taparía a los que sí pueden avanzar.
     */
    async marcarFallo(id, mensaje, intentosPrevios, maxIntentos = 5) {
        const intentos = (intentosPrevios || 0) + 1;
        const { error } = await this._db
            .from('webhook_inbox')
            .update({
                status: intentos >= maxIntentos ? 'discarded' : 'failed',
                attempts: intentos,
                last_error: String(mensaje).slice(0, 500),
            })
            .eq('id', id);
        if (error) throw new Error(`[WebhookInbox] No se pudo registrar el fallo: ${error.message}`);
        return intentos >= maxIntentos;
    }
}

module.exports = { WebhookInbox };
