---
name: product_surfaces
description: Las superficies de producto que no son Revenue: Dashboard/OHS, Project Desk, Content Desk, Message Bank, Portal de Cliente y Centro de Configuración. Úsalo al tocar cualquiera de esas pantallas, al añadir una pestaña de configuración, o al mostrar métricas operativas. Reúne los antiguos dashboard_analytics_agent, content_desk_agent y client_portal_agent.
---

# Superficies de producto

Qué hay en cada zona y qué trampa tiene cada una.

## Dashboard y Salud Operativa (OHS)

`OperationalGoldDashboard.jsx` y `components/dashboard/*`. La puntuación OHS se
reparte en cinco tramos (ejecución, retrasos, actividad de equipo, uso del
sistema, inteligencia IA).

**Las métricas se calculan, no se rellenan.** Si no hay datos, el número es 0 y
se dice: no hay valores de relleno tipo `|| 1` para que la tarjeta "no se vea
vacía". Ese patrón ya estuvo y se quitó.

Los paneles se alimentan hoy de las tablas propias. No leen de las herramientas
externas que el coach conectó — ver `integration_agent`, capa 2 pendiente.

## Project Desk

`ProjectDesk.jsx` + `ProjectDesk.css`. Siete vistas (tablero, proyectos,
calendario, semana, línea de tiempo, equipo, carga), drag-and-drop nativo,
cajón de detalle y **su propio juego de 8 temas** con tokens propios
(`--on-accent`, no `--accent-text`). Recibe el tema por prop de React.

Trampas ya resueltas que no hay que reintroducir:
- Los campos de texto libre (título, notas) escriben con **debounce de 600ms**,
  no en cada tecla.
- El borrado de tarea pide confirmación en dos pasos, nunca borra al primer clic.

## Content Desk

`ContentDesk.jsx`. Persiste en **localStorage**, no en la base: serializa todo
el tablero, así que el guardado va con debounce de 500ms y un flush en
`pagehide` para no perder los últimos cambios. Si algún día pasa a Supabase, esa
es la pieza a rehacer.

## Message Bank

`MessageBank.jsx`. Biblioteca de mensajes con versionado (`libraryVersion`) y
temas propios. Sus confirmaciones ya usan `useNotifications()`.

## Portal de Cliente

`components/client/*`. Lo que ve el **cliente final del coach**, no el coach.
Regla de oro: no exponer nada de la organización más allá de sus propios
entregables, comentarios y aprobaciones. Al añadir un panel aquí, pregunta
primero qué no debe ver.

## Centro de Configuración

`OrganizationConfigurationCenter.jsx`, con siete pestañas: Perfil, Equipo y
Roles, Bóveda de Seguridad, Integraciones, Modelos de IA, Suscripción, Datos.

- Es el **único** sitio donde viven esos ajustes: Credenciales y Ajustes de IA
  se retiraron del menú lateral a propósito para no duplicarlos. Si añades algo
  de configuración, va aquí dentro, no como entrada nueva del sidebar.
- Las invitaciones de equipo funcionan por **código compartido a mano** — no hay
  infraestructura de email. La tabla `invitations` es global heredada, extendida
  con `organization_id` y `role`; un código con `organization_id IS NULL` es del
  registro global antiguo y debe rechazarse.
- Perfil y pipeline se guardan en `organizations.settings_json`, porque no hay
  columnas dedicadas.

## Regla común a todas

Estas pantallas se diseñaron con datos dentro. **Míralas siempre con la base
vacía** antes de darlas por hechas: es cuando aparecen las filas de ejemplo, los
contadores con fallback y los paneles rotos. Si no hay datos, `<EmptyState />`.
