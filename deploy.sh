#!/bin/bash
set -euo pipefail

# Configuración del servidor.
#
# La dirección del droplet no se versiona: se lee de deploy.env, que queda fuera
# de git (ver deploy.env.example). Así este script puede vivir en el repositorio
# sin dejar escrita la IP ni el usuario de acceso en el historial.
if [ -f "$(dirname "$0")/deploy.env" ]; then
    # shellcheck disable=SC1091
    source "$(dirname "$0")/deploy.env"
fi

SERVER_IP="${COACHDATA_SERVER_IP:-}"
SERVER_USER="${COACHDATA_SERVER_USER:-root}"
REMOTE_DIR="${COACHDATA_REMOTE_DIR:-/app/coachdata}"

if [ -z "$SERVER_IP" ]; then
    echo "❌ Falta COACHDATA_SERVER_IP."
    echo "   Copia deploy.env.example a deploy.env y rellena la dirección del servidor."
    exit 1
fi

echo "=========================================================="
echo "🚀 Iniciando despliegue hacia DigitalOcean ($SERVER_IP)"
echo "=========================================================="
echo ""

# Paso 0: construir el frontend AQUÍ.
#
# No es opcional ni redundante: Dockerfile.master tiene su `RUN npm run build`
# comentado porque el droplet se queda sin memoria al compilar, así que el
# servidor nunca construye nada. Lo que se publica es exactamente lo que rsync
# encuentre en src/frontend/public/assets/ al ejecutar este script.
#
# Antes esos artefactos viajaban dentro del repositorio y el paso podía omitirse
# sin consecuencias visibles. Ya no se versionan —eran 6.602 ficheros que hacían
# ilegible cualquier diff—, de modo que olvidar el build significa desplegar el
# frontend anterior, o ninguno en un clon limpio, sin ningún aviso.
echo "🏗️  Paso 0: Compilando el frontend en local..."
npm run build
echo "✅ Frontend compilado."
echo ""

echo "📦 Paso 1: Sincronizando código fuente con el servidor remoto..."
echo "⚠️  Atención: Es posible que se te solicite la contraseña de root a continuación."
# Usamos rsync para copiar todo excepto node_modules, git y otras carpetas pesadas/locales
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude '.DS_Store' --exclude 'deploy.env' --exclude 'logs' --exclude 'screenshots-linkedin' -e ssh ./ $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

if [ $? -eq 0 ]; then
    echo "✅ Archivos sincronizados correctamente."
else
    echo "❌ Error al sincronizar los archivos. Verifica la contraseña o la conexión."
    exit 1
fi

echo ""
echo "🏗️  Paso 2: Reconstruyendo y reiniciando contenedores Docker en el servidor..."
echo "⚠️  Atención: Es posible que se te solicite la contraseña de root nuevamente."
# Nos conectamos por SSH, entramos a la carpeta y levantamos docker-compose
# `set -e` dentro del heredoc no es opcional.
#
# Sin él, este bloque cantaba victoria pasara lo que pasara: el `if` de abajo
# mira el código de salida del ssh, que es el del ÚLTIMO comando. Como
# `docker image prune` siempre funciona, un fallo en `down` o en `up --build`
# quedaba enterrado en la salida y el script imprimía "Despliegue completado
# exitosamente" con el servidor sirviendo todavía la versión anterior.
#
# Pasó de verdad el 2026-09-02: la orden era `docker-compose` (v1, con guion) y
# el servidor sólo tiene el plugin v2 (`docker compose`, con espacio). Los
# ficheros se sincronizaron, los contenedores no se reconstruyeron, y el
# despliegue se dio por bueno durante media hora.
ssh $SERVER_USER@$SERVER_IP << 'EOF'
    set -e
    cd /app/coachdata
    echo "Tumbeando contenedores antiguos..."
    docker compose down
    echo "Construyendo e iniciando la nueva versión..."
    docker compose up -d --build
    echo "Limpiando imágenes antiguas que ya no se usan (opcional)..."
    docker image prune -f || true
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ¡Despliegue completado exitosamente!"
    echo "🌐 Tu actualización de CoachData Media OS ya está en vivo."
else
    echo ""
    echo "❌ Hubo un error al reiniciar los contenedores en el servidor."
    exit 1
fi
