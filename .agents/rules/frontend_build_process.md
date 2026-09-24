# Troubleshooting: Frontend UI Not Updating After Code Changes

## El Problema
Cuando el usuario reporta que los cambios visuales o lógicos en el frontend (React/Vite) no se ven reflejados en la interfaz de producción, a pesar de:
- Haber actualizado el código en `src/frontend/src/components/...`
- Que el usuario haya refrescado la página (`Cmd + R` o `Cmd + Shift + R`).
- Haber revisado y reiniciado el servidor de desarrollo Vite.

El error principal radica en creer que el servidor de producción (Express en el puerto 4000) está sirviendo los archivos a través de Vite.
**El servidor de producción sirve el frontend desde la carpeta estática `src/frontend/public`.** (Según la configuración de `vite.config.js` donde `outDir: 'public'`).

## La Solución

1. **Revisar si es un problema de compilación estática**: 
   Si el servidor Node backend (`localhost:4000`) sirve la carpeta `public`, los cambios en React no tendrán efecto hasta que sean compilados.
2. **Ejecutar el comando de compilación**:
   Navegar a la carpeta del frontend y compilar el código de producción:
   ```bash
   cd "src/frontend"
   npm run build
   ```
   Esto transpilará el código JSX y lo inyectará en `src/frontend/public/assets`.
3. **Validar errores de sintaxis en Backend (si aplica)**:
   Si además el agente o backend tiene errores de sintaxis (`Unexpected end of input`, llaves `}` faltantes, o variables duplicadas), el orquestador no podrá iniciarlo. 
   - Ejecutar siempre `node -c server.js` para comprobar la sintaxis.
   - Una vez corregido, reiniciar el subsistema desde el orquestador: 
     ```bash
     curl -X POST http://localhost:4000/api/restart-subsystem -H "Content-Type: application/json" -d '{"key":"nombre-del-agente"}'
     ```
4. **Instruir al usuario**:
   Una vez compilado el frontend y corregido el backend, pedir al usuario que haga un Hard Refresh (`Cmd + R` / `Cmd + Shift + R`).
