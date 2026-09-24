'use strict';

const Ajv = require('ajv');

/**
 * Validación del cuerpo de las peticiones.
 *
 * El backend no tenía ninguna: ni ajv, ni zod, ni joi. `agentRoutes.js` tenía
 * tres comprobaciones en 322 líneas y `tenantVaultRoutes.js`, que guarda
 * credenciales cifradas, tenía una. Lo que llegaba se pasaba tal cual a la capa
 * de aplicación.
 *
 * Se eligió ajv y no zod porque este proyecto es JavaScript puro: la mayor
 * ventaja de zod es inferir tipos de TypeScript, que aquí no existe. Los
 * esquemas son JSON Schema, así que además sirven para generar el contrato de
 * API el día que se escriba, sin tener que declararlos dos veces.
 */

const ajv = new Ajv({
  allErrors: true,
  /* Convierte "8" en 8 cuando el esquema pide un entero. Los formularios y las
     URL mandan todo como texto, y rechazar por eso sería rechazar peticiones
     correctas. */
  coerceTypes: true,
  /* Quita del cuerpo lo que el esquema no declara, en vez de rechazar la
     petición entera. Una propiedad de más suele ser un cliente antiguo, no un
     ataque; y así la capa de aplicación nunca ve campos que nadie revisó. */
  removeAdditional: true,
  useDefaults: true
});

/** Mensajes en la forma en que los lee una persona, no como los da ajv. */
function describir(errores) {
  return errores.map((e) => {
    const campo = e.instancePath ? e.instancePath.replace(/^\//, '') : e.params?.missingProperty;
    if (e.keyword === 'required') return `falta ${e.params.missingProperty}`;
    if (e.keyword === 'pattern') return `${campo} tiene caracteres no permitidos`;
    if (e.keyword === 'maxLength') return `${campo} es demasiado largo (máximo ${e.params.limit})`;
    if (e.keyword === 'minLength') return `${campo} es demasiado corto (mínimo ${e.params.limit})`;
    if (e.keyword === 'type') return `${campo} debe ser ${e.params.type}`;
    if (e.keyword === 'enum') return `${campo} debe ser uno de: ${e.params.allowedValues.join(', ')}`;
    if (e.keyword === 'maximum' || e.keyword === 'minimum') {
      return `${campo} debe estar entre los límites permitidos`;
    }
    return `${campo || 'el cuerpo'} no es válido`;
  });
}

/**
 * Middleware que valida `req.body` contra un esquema. El cuerpo se sustituye
 * por el ya saneado, con los valores por defecto puestos y sin las propiedades
 * que el esquema no declara.
 *
 * El esquema se compila una vez, al montar la ruta, no en cada petición.
 */
function validarCuerpo(esquema) {
  const validar = ajv.compile(esquema);

  return function (req, res, next) {
    const cuerpo = req.body ?? {};

    if (!validar(cuerpo)) {
      const detalles = describir(validar.errors || []);
      /* Se registra el motivo, nunca el cuerpo: por aquí pasan credenciales. */
      console.warn(`[Validación] ${req.method} ${req.originalUrl} rechazado: ${detalles.join('; ')}`);
      return res.status(400).json({
        error: 'Cuerpo de la petición no válido',
        detalles
      });
    }

    req.body = cuerpo;
    next();
  };
}

module.exports = { validarCuerpo, describir, ajv };
