'use strict';

const { WebhookInbox } = require('./WebhookInbox');

/**
 * Consumidor del buzón de eventos.
 *
 * Toma lo que el webhook guardó y lo pasa por el dispatcher, que resuelve el
 * tenant y normaliza al modelo canónico. Al vivir fuera de la petición del
 * proveedor puede permitirse fallar y reintentar, que es justamente lo que antes
 * no se podía.
 *
 * Es deliberadamente secuencial. El volumen aquí son decenas de eventos por
 * coach y día, no miles por segundo: procesar de uno en uno hace que un evento
 * problemático se pueda leer en el log sin ruido alrededor, y evita abrir varias
 * conexiones a Supabase a la vez, que es el cuello de botella real de este
 * despliegue.
 */
class InboxConsumer {
    constructor({ supabaseClient, dispatcher, maxIntentos = 5 }) {
        if (!supabaseClient) throw new Error('[InboxConsumer] Falta el cliente de Supabase');
        if (!dispatcher) throw new Error('[InboxConsumer] Falta el dispatcher');
        this._inbox = new WebhookInbox({ supabaseClient });
        this._dispatcher = dispatcher;
        this._maxIntentos = maxIntentos;
    }

    /**
     * Procesa una tanda. Devuelve el recuento para que quien lo llame pueda
     * registrarlo o decidir si conviene volver a llamar enseguida.
     */
    async procesarTanda(limite = 50) {
        const pendientes = await this._inbox.pendientes(limite);
        const resumen = { leidos: pendientes.length, procesados: 0, fallidos: 0, descartados: 0 };

        for (const evento of pendientes) {
            try {
                const resultado = await this._dispatcher.dispatch({
                    tenantId: evento.tenant_ref,
                    provider: evento.provider,
                    payload: evento.payload,
                    rawBody: evento.raw_body,
                    signature: evento.signature,
                });

                // El dispatcher resuelve el tenant real; se guarda para que la
                // organización pueda ver sus propios eventos desde la aplicación.
                const organizationId = resultado?.organizationId || resultado?.tenant?.organizationId || null;
                await this._inbox.marcarProcesado(evento.id, organizationId);
                resumen.procesados++;
            } catch (err) {
                const descartado = await this._inbox.marcarFallo(
                    evento.id, err.message, evento.attempts, this._maxIntentos
                );
                if (descartado) {
                    resumen.descartados++;
                    console.error(`[InboxConsumer] Evento ${evento.id} descartado tras ${this._maxIntentos} intentos: ${err.message}`);
                } else {
                    resumen.fallidos++;
                    console.warn(`[InboxConsumer] Evento ${evento.id} falló (intento ${(evento.attempts || 0) + 1}): ${err.message}`);
                }
            }
        }

        return resumen;
    }
}

module.exports = { InboxConsumer };
