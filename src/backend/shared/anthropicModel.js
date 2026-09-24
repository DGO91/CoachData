// src/backend/shared/anthropicModel.js
//
// El ID del modelo de Anthropic, en un solo sitio, para el backend y para los
// agentes que se lanzan como procesos aparte.
//
// Estaba escrito a mano en cada agente, y así fue como cuatro acabaron
// llamando a modelos retirados (`claude-3-5-sonnet-20240620`,
// `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-latest`) o directamente
// inventados (`claude-4.6-sonnet`, `claude-4-5-haiku`). Un modelo retirado
// devuelve 404 en cada llamada: el agente parece vivo y no responde nunca, y
// nadie se entera hasta que alguien lee los logs.
//
// Los IDs de Anthropic no llevan sufijo de fecha. Antes de cambiar este valor,
// comprueba que el ID existe de verdad.
const MODELO_ANTHROPIC = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// Aviso para quien suba de modelo un agente: los modelos Claude 5 rechazan con
// 400 cualquier `temperature`, `top_p` o `top_k` que no sea el valor por
// defecto. Un 400 tras cambiar el ID es casi siempre una temperature heredada.
module.exports = { MODELO_ANTHROPIC };
