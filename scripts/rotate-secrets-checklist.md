# 🔐 SECRET ROTATION CHECKLIST & INSTRUCTIONS — CoachData Operational OS v2

## 📋 Lista de Verificación y Guía de Rotación de Secretos

Esta guía detalla los pasos obligatorios para rotar las claves criptográficas y secretos sensibles en entornos de Staging y Producción.

---

### 1. Variables a Rotar Obligatoriamente
- `JWT_SECRET`: Clave privada de firma de tokens JWT internos.
- `INTERNAL_SECRET`: Clave de autenticación inter-servicio para agentes nativos.
- `STRIPE_WEBHOOK_SECRET`: Secreto HMAC de verificación de firmas de webhooks de Stripe.
- `EVOLUTION_API_TOKEN`: Token Bearer de autenticación con Evolution API WhatsApp.

---

### 2. Procedimiento de Rotación en 4 Pasos

#### Paso 1: Generación de Nuevos Secretos de Alta Entropía
```bash
# Generar clave JWT (256 bits)
openssl rand -hex 32

# Generar clave de servicio interno (256 bits)
openssl rand -hex 32
```

#### Paso 2: Actualización de Variables de Entorno en Servidor
Actualizar el archivo `.env` en producción o el gestor de secretos (ej. Supabase Vault / AWS Secrets Manager):
```env
JWT_SECRET=<NUEVO_TOKEN_HEX_32>
INTERNAL_SECRET=<NUEVO_TOKEN_HEX_32>
STRIPE_WEBHOOK_SECRET=whsec_<NUEVA_CLAVE_STRIPE>
EVOLUTION_GLOBAL_API_KEY=<NUEVO_API_KEY_EVOLUTION>
```

#### Paso 3: Reinicio Graceful del Servidor Backend
```bash
pm2 reload coachdata-backend --update-env
```

#### Paso 4: Verificación E2E de Firma y Autenticación
Ejecutar el validador de hardening:
```bash
node scripts/test-sprint25-production-hardening.js
```
