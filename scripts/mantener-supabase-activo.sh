#!/bin/bash
#
# Evita que Supabase pause el proyecto por inactividad, y de paso vigila la pila.
#
# El plan Free pausa un proyecto tras 7 días sin peticiones. Cuando eso pasa el
# subdominio deja de resolver en DNS y la aplicación se queda a medias: la
# pantalla de acceso se pinta —es HTML y JS ya descargados— pero nada carga, y
# sin un solo error en consola. Ocurrió el 2026-09-02 y costó una mañana.
#
# QUÉ PINCHA Y POR QUÉ
#
# Llama a /api/system/health, que por dentro ejecuta
#   supabase.from('organizations').select('id').limit(1)
# con el cliente de servicio. Es una consulta REAL contra la base, que es lo que
# cuenta como actividad.
#
# Se descartó pinchar Supabase directamente: la tabla `organizations` está
# cerrada al rol anónimo desde la migración 036 (cerrar tablas solo backend), así
# que devuelve 401. Cerrarla es correcto; lo que no vale es usarla como blanco.
#
# Ventaja de este camino: verifica la cadena entera —nginx, contenedor,
# Supabase— y no necesita ninguna clave. Desventaja: si el contenedor está
# caído no hay ping. Por eso ese caso se registra como AVISO en lugar de pasar
# desapercibido.
#
# INSTALACIÓN EN EL SERVIDOR (una vez)
#   scp scripts/mantener-supabase-activo.sh root@<ip>:/app/coachdata/scripts/
#   ssh root@<ip> "chmod +x /app/coachdata/scripts/mantener-supabase-activo.sh"
#   ssh root@<ip> "(crontab -l 2>/dev/null | grep -v mantener-supabase-activo; \
#       echo '17 4 * * * /app/coachdata/scripts/mantener-supabase-activo.sh') | crontab -"
#
# Diario a las 04:17 UTC. Diario y no semanal a propósito: con un margen de 7
# días, fallar seis veces seguidas todavía deja el proyecto en pie.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRO="${DIR}/logs/supabase-keepalive.log"
mkdir -p "$(dirname "$REGISTRO")"

URL="${KEEPALIVE_URL:-https://app.coachdata.example/api/system/health}"
AHORA="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

RESPUESTA="$(curl -sS -m 30 -w $'\n%{http_code}' "$URL" 2>/dev/null || printf '\n000')"
CODIGO="$(printf '%s' "$RESPUESTA" | tail -n1)"
CUERPO="$(printf '%s' "$RESPUESTA" | sed '$d')"

apuntar() { echo "${AHORA}  $*" >> "$REGISTRO"; }

if [ "$CODIGO" = "200" ]; then
  # Un 200 no basta, y por partida doble.
  #
  # 1. Una ruta que no existe cae en el respaldo de la SPA (app.get('*')) y
  #    devuelve el index.html CON código 200. Si no se distingue, un endpoint
  #    mal escrito parecería estar sano para siempre.
  # 2. Aunque sea JSON de verdad, el endpoint responde igual con la base caída:
  #    lo que decide es databaseStatus.
  if ! printf '%s' "$CUERPO" | grep -q '"status":"ok"'; then
    apuntar "AVISO respuesta 200 pero NO es el JSON de salud (¿respaldo SPA? ¿ruta mal escrita?)"
  else
    ESTADO_BD="$(printf '%s' "$CUERPO" | grep -o '"databaseStatus":"[^"]*"' | cut -d'"' -f4)"
    LATENCIA="$(printf '%s' "$CUERPO" | grep -o '"databaseLatencyMs":[0-9-]*' | cut -d: -f2)"

    if [ "$ESTADO_BD" = "connected" ]; then
      apuntar "ok    base conectada, ${LATENCIA:-?} ms"
    else
      apuntar "AVISO la app responde pero la base NO: databaseStatus=${ESTADO_BD:-desconocido}"
    fi
  fi
elif [ "$CODIGO" = "000" ]; then
  apuntar "AVISO sin respuesta — ¿DNS caído, droplet apagado o proyecto pausado?"
else
  apuntar "AVISO http ${CODIGO} — nginx contesta pero la aplicación no (revisa: docker compose ps)"
fi

# Mantener el registro pequeño: 200 líneas son más de medio año de historial.
tail -n 200 "$REGISTRO" > "${REGISTRO}.tmp" 2>/dev/null && mv "${REGISTRO}.tmp" "$REGISTRO"
