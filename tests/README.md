# Pruebas

Tres niveles, separados por lo que necesitan para correr. La separación no es
estética: mezclarlos daba un conjunto que fallaba siempre, y un conjunto que
falla siempre es uno que nadie ejecuta.

| Carpeta | Necesita | Comando |
|---|---|---|
| `unit/` | nada | `npm test` |
| `integration/` | `.env` y base de datos alcanzable | `npm run test:integration` |
| `e2e/` | navegador y servidor levantado | **no ejecutable hoy**, ver abajo |

## unit

Siete archivos, 32 comprobaciones. No tocan red, ni base de datos, ni
`process.env` de forma significativa. Corren en poco más de un segundo.

Es el conjunto que entra en CI y el que hay que mantener siempre en verde.

Conviven dos formas y las dos valen:

- **Con `node:test`**: `test_agent_schedules.js` y `test_validar_cuerpo.js`,
  que declaran sus casos con `test()` y `assert`.
- **Como script**: los otros cinco, que imprimen su resultado y salen con
  `process.exit(1)` si algo falla. `node --test` los trata como un caso
  implícito que pasa si el proceso termina con 0.

No hace falta reescribir los segundos. Si se tocan, es buen momento para
pasarlos a `node:test`, que da detalle de qué falló en vez de un código de
salida.

**Nota sobre el nombre de los archivos.** `node --test <directorio>` sólo
recoge los que casan con su patrón (`*.test.js`, `test-*.js`…), y aquí se usa
guion bajo. Por eso el script pasa un glob explícito, `"tests/unit/*.js"`, en
vez de la carpeta.

## integration

Cuatro archivos que hablan con Supabase o con un servidor en marcha. No entran
en CI porque necesitan credenciales y un entorno vivo.

Antes de ejecutarlos: el `.env` del proyecto apunta al **mismo proyecto de
Supabase que producción**. No hay entorno de desarrollo separado, así que
cualquier prueba que escriba lo hace sobre datos reales. Conviene revisar qué
escribe cada una antes de lanzarla.

## e2e

**No se puede ejecutar hoy.** Falta la dependencia `@playwright/test`: está
`playwright`, que es otra cosa. Y no hay `playwright.config`.

Además, los dos archivos están vacíos de contenido real:

- `leadhub.spec.ts` importa de un módulo que no está instalado, así que nunca
  llegó a correr.
- `prospect.e2e.test.js` declara cuatro `it()` con el cuerpo entero comentado.
  No comprueba nada.

Para habilitar este nivel haría falta instalar `@playwright/test`, escribir la
configuración con la URL del servidor, y escribir de verdad los cuatro casos
que hoy sólo están enunciados. Mientras tanto no hay script de npm que los
llame, porque un comando que falla siempre es peor que ninguno.

## Qué falta

- Los cinco scripts unitarios ganarían pasando a `node:test`.
- El nivel e2e está por construir, no por arreglar.
- `integration/` necesita un entorno propio antes de poder entrar en CI.
