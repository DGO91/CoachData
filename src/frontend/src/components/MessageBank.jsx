import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Minus,
  Plus,
  Maximize2,
  X,
  GripVertical,
  Copy,
  Pencil,
  CopyPlus,
  Trash2,
  Check,
  Download,
  ClipboardCopy,
  Upload,
  RotateCcw,
  MessageSquarePlus,
} from "lucide-react";
import { useNotifications } from './common/Notifications';
import { scopedKey, purgeLegacyKey } from '../core/storage/scopedStorage';
import "./MessageBank.css";

/* ================================================================
CoachData Message Bank — React 19 port of the original artifact.
Bilingual (EN/ES) outreach script library: category filters,
search, "in use only" toggle, 8 themes, zoom, drag-to-reorder,
a view/edit modal, and JSON import / export. State persists to
localStorage exactly like the original.
================================================================ */

/* ---------------------------------------------------------------- i18n */
const T = {
  en: {
    titleLead: "Message", titleAccent: "Bank",
    sub: "Outreach scripts for coaches and consultants. Pick the situation, copy the words, send it.",
    search: "Search",
    mode: "Mode", zoom: "Zoom", library: "Library",
    exportTxt: "Download a backup", resetTxt: "Restore the default set",
    exportCopyTxt: "Copy backup to clipboard",
    exportSaved: "Backup saved", exportCopied: "Backup copied — paste it wherever you're sending it",
    exportDeclined: "Not saved", exportFailed: "Downloads aren't working here, so it's copied instead — paste it wherever you're sending it",
    newTxt: "New message",
    onlyActive: "In use only", allStatuses: "All",
    dragHandle: "Drag to reorder", reorderedTxt: "Order saved",
    importTxt: "Load a backup file",
    importOk: "Library loaded",
    importBad: "That file is not a message bank backup. Use one downloaded from this page.",
    updateTitle: "This bank has newer messages",
    updateBody: "The shared version was updated. You have your own edits here, so nothing changed on its own.",
    updateTake: "Load the new set", updateKeep: "Keep mine",
    confirmTake: "Loading the new set replaces the messages you have here. Download a backup first if you want to keep them. Continue?",
    updateDone: "New set loaded",
    results: (n, t) => ({ n, t }),
    cats: { all: "Everything", opener: "Cold openers", faq: "Common questions", followup: "Follow ups", objection: "Objections" },
    status: { active: "In use", draft: "Draft", retired: "Retired" },
    bestFor: "Best for", message: "Message", copy: "Copy", copied: "Copied",
    chars: (n) => n + " characters",
    personalize: "Send to", personalizeHint: "Their first name swaps into the placeholder.",
    edit: "Edit", save: "Save", cancel: "Cancel", del: "Delete", duplicate: "Duplicate",
    emptyTitle: "Your message bank is empty",
    emptyBody: "Save the messages you send most often — cold openers, follow ups, objection replies — and reuse them in one click.",
    noResultsTitle: "No matches",
    noResultsBody: "Nothing matches your search or filters. Try clearing them, or write a new message for this category.",
    fTitleEn: "Title (English)", fTitleEs: "Title (Spanish)",
    fWhenEn: "Best for (English)", fWhenEs: "Best for (Spanish)",
    fBodyEn: "Message (English)", fBodyEs: "Message (Spanish)",
    fTitle: "Title", fWhen: "Best for", fBody: "Message",
    fCat: "Category", fStatus: "Status",
    editingIn: "Editing the English version",
    editingSwitch: "Switch the EN / ES toggle at the top to edit the Spanish one.",
    newTitle: "New message", untitled: "Untitled message",
    savedTxt: "Saved", deletedTxt: "Deleted", resetDone: "Default set restored",
    confirmDel: "Delete this message for good?",
    confirmReset: "This replaces your library with the default set of messages. Continue?",
    noSpanish: "No Spanish version written yet, so the English one shows here. Switch to EN to edit it, or add Spanish in the editor.",
    noEnglish: "No English version written yet, so the Spanish one shows here. Switch to ES to edit it, or add English in the editor.",
    missingTag: "EN only", missingTagEs: "ES only",
  },
  es: {
    titleLead: "Banco de", titleAccent: "Mensajes",
    sub: "Guiones de contacto para coaches y consultores. Elige la situación, copia el texto y envíalo.",
    search: "Buscar",
    mode: "Modo", zoom: "Zoom", library: "Biblioteca",
    exportTxt: "Descargar una copia", resetTxt: "Restaurar el conjunto por defecto",
    exportCopyTxt: "Copiar la copia al portapapeles",
    exportSaved: "Copia guardada", exportCopied: "Copia copiada — pégala donde la vayas a enviar",
    exportDeclined: "No se guardó", exportFailed: "Las descargas no funcionan aquí, así que se ha copiado en su lugar — pégala donde la vayas a enviar",
    newTxt: "Nuevo mensaje",
    onlyActive: "Solo en uso", allStatuses: "Todos",
    dragHandle: "Arrastra para reordenar", reorderedTxt: "Orden guardado",
    importTxt: "Cargar una copia",
    importOk: "Biblioteca cargada",
    importBad: "Ese archivo no es una copia del banco de mensajes. Usa una descargada desde esta página.",
    updateTitle: "Este banco tiene mensajes nuevos",
    updateBody: "La versión compartida se ha actualizado. Aquí tienes tus propios cambios, así que no se ha tocado nada.",
    updateTake: "Cargar la versión nueva", updateKeep: "Quedarme con la mía",
    confirmTake: "Cargar la versión nueva reemplaza los mensajes que tienes aquí. Descarga una copia primero si quieres conservarlos. ¿Seguimos?",
    updateDone: "Versión nueva cargada",
    results: (n, t) => ({ n, t }),
    cats: { all: "Todo", opener: "Primer contacto", faq: "Preguntas frecuentes", followup: "Seguimientos", objection: "Objeciones" },
    status: { active: "En uso", draft: "Borrador", retired: "Retirado" },
    bestFor: "Ideal para", message: "Mensaje", copy: "Copiar", copied: "Copiado",
    chars: (n) => n + " caracteres",
    personalize: "Para", personalizeHint: "Su nombre sustituye al hueco del mensaje.",
    edit: "Editar", save: "Guardar", cancel: "Cancelar", del: "Borrar", duplicate: "Duplicar",
    emptyTitle: "Tu banco de mensajes está vacío",
    emptyBody: "Guarda aquí los mensajes que más repites — primeros contactos, seguimientos, respuestas a objeciones — y reutilízalos con un clic.",
    noResultsTitle: "Sin coincidencias",
    noResultsBody: "Nada coincide con tu búsqueda o filtros. Prueba a limpiarlos o escribe un mensaje nuevo para esta categoría.",
    fTitleEn: "Título (inglés)", fTitleEs: "Título (español)",
    fWhenEn: "Ideal para (inglés)", fWhenEs: "Ideal para (español)",
    fBodyEn: "Mensaje (inglés)", fBodyEs: "Mensaje (español)",
    fTitle: "Título", fWhen: "Ideal para", fBody: "Mensaje",
    fCat: "Categoría", fStatus: "Estado",
    editingIn: "Editando la versión en español",
    editingSwitch: "Usa el botón EN / ES de arriba para editar la inglesa.",
    newTitle: "Mensaje nuevo", untitled: "Mensaje sin título",
    savedTxt: "Guardado", deletedTxt: "Borrado", resetDone: "Conjunto por defecto restaurado",
    confirmDel: "¿Borrar este mensaje para siempre?",
    confirmReset: "Esto reemplaza tu biblioteca con el conjunto de mensajes por defecto. ¿Seguimos?",
    noSpanish: "Todavía no hay versión en español, así que se muestra la inglesa. Cambia a ES para editarla, o añádela en el editor.",
    noEnglish: "Todavía no hay versión en inglés, así que se muestra la española. Cambia a EN para editarla, o añádela en el editor.",
    missingTag: "Solo EN", missingTagEs: "Solo ES",
  },
};

const CATS = ["opener", "faq", "followup", "objection"];
const STATUSES = ["active", "draft", "retired"];
const THEMES = [
  { id: "clean", name: "Clean", ground: "#F7F7F5", accent: "#2D4A3A" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "slate", name: "Slate", ground: "#F4F5F6", accent: "#3F4A54" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "ivory", name: "Ivory", ground: "#F4F0E6", accent: "#B8985A" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "forest", name: "Forest", ground: "#111A15", accent: "#C9A96A" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "blush", name: "Blush", ground: "#FBF1F2", accent: "#C98B96" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "sky", name: "Sky", ground: "#EEF3F8", accent: "#7FA8C4" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "lilac", name: "Lilac", ground: "#F4F0F9", accent: "#A38CC0" }, // governance-allow: design-tokens — definicion de paleta del modulo
  { id: "apricot", name: "Apricot", ground: "#FCF2E9", accent: "#D9A273" }, // governance-allow: design-tokens — definicion de paleta del modulo
];
const ZOOMS = [80, 90, 100, 110, 125, 140, 160, 180];
const KEY = "coachdata.messagebank.v2";
const LIBRARY_VERSION = 3;
const EDIT_FLAG_SINCE = 1;


/* -------------------------------------------- default library (owner's) */
function seed() {
  return [
    {
      id: "m-value-first", cat: "opener", status: "active", order: 1,
      title: { en: "1. Old FB friend", es: "Valor primero" },
      when: {
        en: "Testing the waters with FB connections",
        es: "Contacto en frío cuando quieres empezar aportando valor sin sonar a venta.",
      },
      body: {
        en: "Hey [Name], I’m not sure if this would be helpful for you, but I just built a free 20-min training on how to save 15+ hours every week while also maximizing your revenue. One of our clients made $19k over the weekend while on a holiday using this strategy; another hit his first 6-figure month. \n\nWould you want me to send it? ",
        es: "Hola [Nombre], pensé que esto te podría venir bien. Acabo de preparar una formación gratuita de 20 minutos sobre cómo los coaches están ahorrando más de 15 horas cada semana mientras aumentan sus ingresos. Uno de nuestros clientes generó 19.000 $ en un fin de semana desde la playa en México. Si te suena útil, te la paso encantado.",
      },
    },
    {
      id: "m-1784806052915", cat: "opener", status: "active", order: 2,
      title: { en: "2. FB Loom", es: "Loom de valor" },
      when: {
        en: "Soft pitch on FB connections, only if we never had a conversation",
        es: "Contacto en frío con Loom directo",
      },
      body: {
        en: "Hey [Name], we've been connected for a while but never actually chatted, so I'm sorry if this is a bit random. I somehow landed on your page earlier and spotted five big opportunities that could help improve conversions and generate even more revenue. I'd be happy to record a quick Loom walking you through them, completely free. Could that be useful by any chance?",
        es: "Hola [Nombre], llevamos un tiempo conectados pero nunca habíamos hablado. Vi tu perfil y noté un par de oportunidades geniales para mejorar conversiones. Estaría encantado de grabarte un Loom rápido explicándotelo, sin compromiso. ¿Te serviría?",
      },
    },
    {
      id: "m-direct", cat: "opener", status: "active", order: 3,
      title: { en: "3. Website + Loom", es: "Directo y simple" },
      when: {
        en: "High-volume outreach where you want to get to the point quickly.",
        es: "Contacto de alto volumen donde quieres ir al grano rápido.",
      },
      body: {
        en: "Hey [Name], I randomly landed on your websie, and spotted a handful of opportunities that could help you maximize revenue. I'd be happy to record a quick Loom sharing my thoughts, completely free. No pitch, just value. Would you like me to send it over?\n",
        es: "Hola [Nombre], vi tu perfil y pensé que esto te podría servir. Hace poco preparé una formación gratuita de 20 minutos sobre cómo los coaches están ahorrando más de 15 horas cada semana mientras aumentan sus ingresos. ¿Quieres que te la envíe?",
      },
    },
    {
      id: "m-permission", cat: "opener", status: "active", order: 4,
      title: { en: "4. LinkedIN Connection", es: "Con permiso" },
      when: {
        en: "People that accepted our conenction request",
        es: "Gente que no te conoce de nada. Contacto suave y respetuoso que no resulta invasivo.",
      },
      body: {
        en: "Hey [Name], thanks for connecting! I love your vibe and think there is a great overlap in what we do. Would you be open to exploring ways we could collaborate, referrals, events, or anything else?",
        es: "Hola [Nombre], espero que no te importe que te escriba. Hace poco preparé una formación gratuita de 20 minutos sobre los sistemas que usamos para ayudar a coaches a ahorrar más de 15 horas cada semana mientras aumentan sus ingresos. Pensé que te podría resultar útil. Te la paso si te interesa.",
      },
    },
    {
      id: "m-low-pressure", cat: "opener", status: "draft", order: 5,
      title: { en: "Low-Pressure", es: "Sin presión" },
      when: {
        en: "Warmer audiences or people who receive a lot of DMs. Takes the pressure off immediately.",
        es: "Audiencias más cálidas o gente que recibe muchos DMs. Quita la presión desde el principio.",
      },
      body: {
        en: "Hey [Name], this might not be relevant, so feel free to ignore if not. I just finished a free 20-minute training showing how coaches can automate a huge part of their client journey, save 15+ hours every week, and increase revenue. Happy to send it over if you'd like it.",
        es: "Hola [Nombre], puede que esto no te encaje, así que ignóralo sin problema si no. Acabo de terminar una formación gratuita de 20 minutos que enseña cómo los coaches pueden automatizar gran parte del recorrido de sus clientes, ahorrar más de 15 horas cada semana y aumentar sus ingresos. Te la paso encantado si la quieres.",
      },
    },
    {
      id: "m-1784806178448", cat: "opener", status: "draft", order: 6,
      title: { en: "BIG ACCOUNTS", es: "Cuentas Grandes" },
      when: {
        en: "Dream clients we'd love to work with",
        es: "Clientes ideales con los que nos encantaría trabajar",
      },
      body: {
        en: "Hey [Name], I've been following your work for a while and genuinely love what you're building.\n\nI 'm sure you've already got a fantastic team, but if you're ever stuck on a tech decision, wondering whether an automation is worth building, or just want a second opinion on the backend side of your business, feel free to message me. Happy to help, even if we never work together. :) ",
        es: "Hola [Nombre], llevo tiempo siguiendo tu trabajo. Si alguna vez necesitas una segunda opinión técnica o sobre automatizaciones para tu negocio, escríbeme con total confianza. Encantado de ayudarte.",
      },
    },

    /* ── FAQ / Common Questions ─────────────────────────────────── */
    {
      id: "m-faq-what-we-do", cat: "faq", status: "active", order: 7,
      title: { en: "What do you do?", es: "¿Qué hacéis exactamente?" },
      when: {
        en: "When someone asks what your service is or what you actually do for clients.",
        es: "Cuando alguien te pregunta en qué consiste exactamente tu servicio.",
      },
      body: {
        en: "Great question! We help coaches and consultants build a backend system that handles the repetitive parts of their business automatically — onboarding, check-ins, reminders, follow-ups — so they can spend more time doing the work they love and less time chasing admin.\n\nMost clients save 15+ hours a week and see a noticeable jump in client retention and referrals within the first 60 days. Does that sound like something that might be relevant for where you're at right now?",
        es: "¡Buena pregunta! Ayudamos a coaches y consultores a construir un sistema de negocio que gestiona automáticamente las partes repetitivas — onboarding, check-ins, recordatorios, seguimientos — para que puedan dedicar más tiempo a su trabajo real y menos a perseguir tareas administrativas.\n\nLa mayoría de nuestros clientes ahorran más de 15 horas a la semana y ven una mejora notable en la retención de clientes y las referencias en los primeros 60 días. ¿Te suena relevante para donde estás tú ahora mismo?",
      },
    },
    {
      id: "m-faq-how-much", cat: "faq", status: "active", order: 8,
      title: { en: "How much does it cost?", es: "¿Cuánto cuesta?" },
      when: {
        en: "When someone asks for pricing before you've established the value. Reframe before you answer.",
        es: "Cuando alguien pregunta el precio antes de ver el valor. Reencuadra antes de responder.",
      },
      body: {
        en: "It depends on what you actually need — we don't do one-size-fits-all. Before I throw numbers at you, it helps to understand your setup a bit more so I'm not wasting your time.\n\nCan I ask — how are you currently handling your client onboarding and follow-ups? That'll give me a better idea of what would actually move the needle for you, and what it would cost.",
        es: "Depende de lo que realmente necesites, no hacemos un paquete único para todos. Antes de darte cifras, me ayuda entender un poco más tu situación para no hacerte perder el tiempo.\n\n¿Puedo preguntarte cómo estás gestionando ahora mismo el onboarding y los seguimientos de clientes? Eso me da una idea mucho mejor de lo que te va a mover la aguja, y de lo que costaría.",
      },
    },
    {
      id: "m-faq-is-it-for-me", cat: "faq", status: "active", order: 9,
      title: { en: "Is this right for me?", es: "¿Es para mí?" },
      when: {
        en: "When a prospect is unsure if your service applies to their situation.",
        es: "Cuando un prospecto no sabe si tu servicio aplica a su situación.",
      },
      body: {
        en: "Honestly, it's not for everyone — and I'd rather tell you that upfront than waste your time.\n\nThe people who get the most out of this are coaches and consultants who already have clients coming in but feel like the backend is eating them alive — constant follow-ups, manual admin, inconsistent onboarding. If that's not your problem, we're probably not the right fit.\n\nDoes any of that ring a bell for you?",
        es: "Sinceramente, no es para todo el mundo — y prefiero decírtelo desde el principio antes de hacerte perder el tiempo.\n\nLas personas que más provecho sacan de esto son coaches y consultores que ya tienen clientes entrando pero sienten que el backend les está comiendo vivos — seguimientos constantes, admin manual, onboarding inconsistente. Si ese no es tu problema, probablemente no somos el encaje perfecto.\n\n¿Algo de eso te suena familiar?",
      },
    },

    /* ── Follow Ups ─────────────────────────────────────────────── */
    {
      id: "m-followup-soft", cat: "followup", status: "active", order: 10,
      title: { en: "Soft Check-in", es: "Seguimiento suave" },
      when: {
        en: "First follow-up after no reply to your opener. Low-pressure, leaves the door open.",
        es: "Primer seguimiento tras no recibir respuesta. Sin presión, dejando la puerta abierta.",
      },
      body: {
        en: "Hey [Name], just wanted to circle back in case my last message got buried — totally understand if it wasn't the right time.\n\nStill happy to send over that free training if you'd find it useful. No worries either way!",
        es: "Hola [Nombre], solo quería retomar el hilo por si mi último mensaje se quedó enterrado — lo entiendo perfectamente si no era el momento.\n\nSigo encantado de mandarte esa formación gratuita si te resulta útil. ¡Sin problema de cualquier forma!",
      },
    },
    {
      id: "m-followup-value", cat: "followup", status: "active", order: 11,
      title: { en: "Value Bump", es: "Seguimiento con valor" },
      when: {
        en: "Second follow-up. Lead with a new piece of value or insight relevant to them.",
        es: "Segundo seguimiento. Abre con un nuevo recurso o insight relevante para ellos.",
      },
      body: {
        en: "Hey [Name], I've been sharing a quick case study with a few people in your space this week — a coach who went from working 60-hour weeks to having most of her client journey running on autopilot, and hit a record revenue month in the process.\n\nThought it might be interesting given what you're building. Want me to send it over?",
        es: "Hola [Nombre], esta semana estoy compartiendo un caso de estudio rápido con algunos profesionales de tu sector — una coach que pasó de trabajar 60 horas semanales a tener gran parte de su ciclo de cliente en piloto automático, y tuvo su mejor mes de ingresos en ese proceso.\n\nPensé que podría ser interesante dado lo que estás construyendo. ¿Te lo mando?",
      },
    },
    {
      id: "m-followup-final", cat: "followup", status: "active", order: 12,
      title: { en: "Final Touch", es: "Último contacto" },
      when: {
        en: "Last follow-up before moving on. Honest, respectful, leaves on a good note.",
        es: "Último seguimiento antes de seguir adelante. Honesto, respetuoso, termina en buenos términos.",
      },
      body: {
        en: "Hey [Name], I'll keep this short — I've tried reaching out a couple of times and I don't want to be that person who keeps pinging you.\n\nI'll leave it here, but if things change and you want to explore what we do, my door is always open. Wishing you the best with everything you're building!",
        es: "Hola [Name], seré breve — he intentado escribirte un par de veces y no quiero ser esa persona que no para de dar señales.\n\nLo dejo aquí, pero si las cosas cambian y quieres explorar lo que hacemos, mi puerta siempre está abierta. ¡Mucho ánimo con todo lo que estás construyendo!",
      },
    },

    /* ── Objections ─────────────────────────────────────────────── */
    {
      id: "m-obj-no-time", cat: "objection", status: "active", order: 13,
      title: { en: "\"No time right now\"", es: "\"No tengo tiempo ahora\"" },
      when: {
        en: "When they say they're too busy. Reframe: the system saves time, not costs it.",
        es: "Cuando dicen que están demasiado ocupados. Reencuadre: el sistema ahorra tiempo, no lo consume.",
      },
      body: {
        en: "I hear you — and honestly, that's exactly the problem we solve. The coaches who come to us are usually the ones who are way too busy, because everything is sitting on their plate manually.\n\nThe whole point is to get 15+ hours back every week, not add more to your list. The setup takes a couple of sessions and then it runs itself.\n\nWould it help if I just sent you a quick overview so you can see if it's even worth a conversation? Takes 5 minutes to read.",
        es: "Te entiendo — y honestamente, ese es exactamente el problema que resolvemos. Los coaches que nos contactan suelen ser los que están demasiado ocupados, porque todo les cae manualmente.\n\nEl objetivo es recuperar más de 15 horas semanales, no añadir más a tu lista. La configuración lleva un par de sesiones y luego funciona sola.\n\n¿Te ayudaría que te mandara un resumen rápido para que veas si merece la pena ni siquiera tener una conversación? Se lee en 5 minutos.",
      },
    },
    {
      id: "m-obj-no-budget", cat: "objection", status: "active", order: 14,
      title: { en: "\"Can't afford it\"", es: "\"No me lo puedo permitir\"" },
      when: {
        en: "Price objection. Don't discount — reframe the ROI and identify if it's real or a smokescreen.",
        es: "Objeción de precio. No hagas descuento — reencuadra el ROI e identifica si es real o una excusa.",
      },
      body: {
        en: "Totally fair — and I want to make sure we're both on the same page before going further.\n\nOn average, clients recover the cost within the first month just from the hours they get back, plus the extra capacity to take on more clients. So it's less of an expense and more of a trade.\n\nBut I also want to make sure it actually makes sense for your numbers. Can I ask — roughly how many clients do you work with, and what does an extra client typically mean for your revenue? That way I can give you an honest answer on whether the maths works.",
        es: "Totalmente razonable — y quiero asegurarme de que estamos en la misma página antes de seguir.\n\nDe media, los clientes recuperan la inversión en el primer mes solo con las horas que recuperan, más la capacidad extra para aceptar más clientes. Así que es menos un gasto y más un intercambio.\n\nPero también quiero asegurarme de que realmente tiene sentido para tus números. ¿Puedo preguntarte — cuántos clientes gestionas aproximadamente, y qué significa un cliente extra para tus ingresos? Así te puedo dar una respuesta honesta sobre si las cuentas cuadran.",
      },
    },
    {
      id: "m-obj-think-about-it", cat: "objection", status: "active", order: 15,
      title: { en: "\"Need to think about it\"", es: "\"Necesito pensarlo\"" },
      when: {
        en: "When they stall. Surface the real concern without being pushy.",
        es: "Cuando dilatan la decisión. Saca la preocupación real sin ser insistente.",
      },
      body: {
        en: "Of course — this isn't a decision to rush.\n\nCan I ask what part of it you're still thinking through? Sometimes there's a specific concern underneath that I can actually help with, and sometimes it genuinely just needs time. Either way I want to make sure you have everything you need to make the right call for you.",
        es: "Por supuesto — esta no es una decisión para tomar deprisa.\n\n¿Puedo preguntarte qué parte es la que estás pensando todavía? A veces hay una preocupación concreta debajo que puedo ayudarte a resolver, y a veces genuinamente solo necesita tiempo. De cualquier forma quiero asegurarme de que tienes todo lo que necesitas para tomar la decisión correcta para ti.",
      },
    },
  ];
}

function pair(v) {
  if (v && typeof v === "object") {
    return { en: typeof v.en === "string" ? v.en : "", es: typeof v.es === "string" ? v.es : "" };
  }
  return { en: typeof v === "string" ? v : "", es: "" };
}

function normalize(loaded, allowSeed = false) {
  const s = loaded && typeof loaded === "object" ? loaded : {};
  const out = {
    theme: THEMES.some((t) => t.id === s.theme) ? s.theme : "clean",
    lang: s.lang === "es" ? "es" : "en",
    zoom: ZOOMS.indexOf(s.zoom) > -1 ? s.zoom : 100,
    filter: s.filter === "all" || CATS.indexOf(s.filter) > -1 ? s.filter : "all",
    onlyActive: s.onlyActive === true,
    query: typeof s.query === "string" ? s.query : "",
    recipient: typeof s.recipient === "string" ? s.recipient : "",
    wide: s.wide === true,
    libraryVersion: typeof s.libraryVersion === "number" ? s.libraryVersion : 0,
    edited: s.edited === true,
    items: [],
  };

  // Sin items guardados: solo se siembra la biblioteca de CoachData en cuentas
  // Admin. Una cuenta nueva arranca vacia y escribe sus propios mensajes.
  const list = Array.isArray(s.items) ? s.items : (allowSeed ? seed() : []);
  out.items = list
    .map((raw, i) => {
      const r = raw && typeof raw === "object" ? raw : {};
      return {
        id: typeof r.id === "string" && r.id ? r.id : "m-" + Date.now() + "-" + i,
        cat: CATS.indexOf(r.cat) > -1 ? r.cat : "opener",
        status: STATUSES.indexOf(r.status) > -1 ? r.status : "active",
        order: typeof r.order === "number" ? r.order : i + 1,
        title: pair(r.title),
        when: pair(r.when),
        body: pair(r.body),
      };
    })
    .sort((a, b) => a.order - b.order);
  return out;
}

function initApp(storageKey = KEY, allowSeed = false) {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(storageKey));
  } catch (e) {
    raw = null;
  }
  const fresh = raw === null;
  const state = normalize(raw, allowSeed);
  let updateWaiting = false;

  if (fresh) {
    state.libraryVersion = LIBRARY_VERSION;
  } else if (state.libraryVersion < LIBRARY_VERSION) {
    const trustworthy = state.libraryVersion >= EDIT_FLAG_SINCE;
    if (trustworthy && !state.edited && allowSeed) {
      state.items = normalize({ items: seed() }, true).items;
      state.libraryVersion = LIBRARY_VERSION;
    } else {
      updateWaiting = true;
    }
  }
  return { state, updateWaiting };
}

function statusClass(st) {
  return st === "active" ? "mb-good" : st === "draft" ? "mb-warn" : "mb-neutral";
}

function themeById(id) {
  return THEMES.find((x) => x.id === id) || THEMES[0];
}

const PH = /\[(?:Name|Nombre)\]/g;
function personalized(text, recipient) {
  const n = (recipient || "").trim();
  return n ? String(text == null ? "" : text).replace(PH, n) : String(text == null ? "" : text);
}

function highlightNodes(text, recipient) {
  const n = (recipient || "").trim();
  const parts = String(text == null ? "" : text).split(/(\[(?:Name|Nombre)\])/g);
  return parts.map((p, i) =>
    /^\[(?:Name|Nombre)\]$/.test(p) ? (
      <span className="mb-ph" key={i}>{n || p}</span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

function copyText(text) {
  return new Promise((resolve) => {
    const done = () => resolve(true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, done));
    } else {
      legacyCopy(text, done);
    }
  });
}

function legacyCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
  done();
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================================================================ view */
export default function MessageBank({ language = 'es', orgScope, allowSeed = false }) {
  const { notify, confirm: askConfirm } = useNotifications();
  // Ambito por organizacion: sin esto todas las cuentas compartian la misma
  // biblioteca de mensajes guardada en localStorage.
  const storageKey = useMemo(() => scopedKey(KEY, orgScope), [orgScope]);
  const initial = useMemo(() => initApp(storageKey, allowSeed), [storageKey, allowSeed]);
  const [state, setState] = useState(initial.state);
  const [updateWaiting, setUpdateWaiting] = useState(initial.updateWaiting);

  useEffect(() => {
    if (language && (language === 'es' || language === 'en') && state.lang !== language) {
      setState((prev) => ({ ...prev, lang: language }));
    }
  }, [language]);
  const [modeOpen, setModeOpen] = useState(false);
  const [optOpen, setOptOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);

  const [modal, setModal] = useState({ mounted: false, on: false, editing: false, openId: null, draft: null });
  const [drag, setDrag] = useState({ id: null, overId: null, before: true });

  const rootRef = useRef(null);
  const modeWrapRef = useRef(null);
  const optWrapRef = useRef(null);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const closeTimer = useRef(null);

  const L = T[state.lang] || T.es;
  const other = state.lang === "en" ? "es" : "en";

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {}
  }, [state, storageKey]);

  useEffect(() => { purgeLegacyKey(KEY); }, []);

  const patch = useCallback((upd) => {
    setState((prev) => ({ ...prev, ...(typeof upd === "function" ? upd(prev) : upd) }));
  }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    const duration = msg.length > 40 ? 3600 : 1900;
    toastTimer.current = setTimeout(() => setToastOn(false), duration);
  }, []);

  const shown = useCallback(
    (p) => (p ? p[state.lang] || p[other] || "" : ""),
    [state.lang, other]
  );
  const hasCurrent = useCallback((p) => !!(p && p[state.lang]), [state.lang]);

  const counts = useMemo(() => {
    const c = { all: state.items.length };
    CATS.forEach((cat) => {
      c[cat] = state.items.filter((m) => m.cat === cat).length;
    });
    return c;
  }, [state.items]);

  const visible = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    return state.items.filter((m) => {
      if (state.filter !== "all" && m.cat !== state.filter) return false;
      if (state.onlyActive && m.status !== "active") return false;
      if (!q) return true;
      const hay = [m.title.en, m.title.es, m.when.en, m.when.es, m.body.en, m.body.es].join(" ").toLowerCase();
      return hay.indexOf(q) > -1;
    });
  }, [state.items, state.filter, state.onlyActive, state.query]);

  useEffect(() => {
    function onDocClick(e) {
      if (modeOpen && modeWrapRef.current && !modeWrapRef.current.contains(e.target)) setModeOpen(false);
      if (optOpen && optWrapRef.current && !optWrapRef.current.contains(e.target)) setOptOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [modeOpen, optOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (modeOpen || optOpen) {
        setModeOpen(false);
        setOptOpen(false);
        return;
      }
      if (modal.mounted) closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modeOpen, optOpen, modal.mounted]);

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  const setTheme = (id) => {
    patch({ theme: id });
    setModeOpen(false);
  };
  const setLang = (lang) => patch({ lang });
  const stepZoom = (dir) => {
    patch((prev) => {
      let i = ZOOMS.indexOf(prev.zoom);
      i = Math.max(0, Math.min(ZOOMS.length - 1, i + dir));
      return { zoom: ZOOMS[i] };
    });
  };

  const takeUpdate = async () => {
    if (!(await askConfirm({ message: L.confirmTake }))) return;
    patch({ items: normalize({ items: seed() }, true).items, libraryVersion: LIBRARY_VERSION, edited: false });
    setUpdateWaiting(false);
    toast(L.updateDone);
  };
  const keepMine = () => {
    patch({ libraryVersion: LIBRARY_VERSION });
    setUpdateWaiting(false);
  };

  function openView(id) {
    clearTimeout(closeTimer.current);
    setModal({ mounted: true, on: false, editing: false, openId: id, draft: null });
    requestAnimationFrame(() => setModal((m) => ({ ...m, on: true })));
  }

  function openEdit(id, preset) {
    clearTimeout(closeTimer.current);
    let draft;
    if (preset) {
      draft = preset;
    } else if (id) {
      const found = state.items.find((m) => m.id === id);
      draft = found ? JSON.parse(JSON.stringify(found)) : blankMessage();
    } else {
      draft = blankMessage();
    }
    setModal({ mounted: true, on: false, editing: true, openId: draft.id, draft });
    requestAnimationFrame(() => setModal((m) => ({ ...m, on: true })));
  }

  function blankMessage() {
    return {
      id: "m-" + Date.now(),
      cat: state.filter === "all" ? "opener" : state.filter,
      status: "draft",
      order: state.items.length + 1,
      title: { en: "", es: "" },
      when: { en: "", es: "" },
      body: { en: "", es: "" },
    };
  }

  function closeModal() {
    setModal((m) => ({ ...m, on: false }));
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setModal((m) => (m.on ? m : { mounted: false, on: false, editing: false, openId: null, draft: null }));
    }, 260);
  }

  const currentItem = () => state.items.find((m) => m.id === modal.openId) || null;

  function updateDraft(upd) {
    setModal((m) => ({ ...m, draft: { ...m.draft, ...upd } }));
  }

  function updateDraftPair(field, value) {
    setModal((m) => ({ ...m, draft: { ...m.draft, [field]: { ...m.draft[field], [state.lang]: value } } }));
  }

  function commitDraft() {
    const d = modal.draft;
    setState((prev) => {
      const items = prev.items.slice();
      const idx = items.findIndex((m) => m.id === d.id);
      if (idx > -1) items[idx] = d;
      else items.push(d);
      return { ...prev, items, edited: true };
    });
    setModal({ mounted: true, on: true, editing: false, openId: d.id, draft: null });
    toast(L.savedTxt);
  }

  function duplicateCurrent() {
    const src = currentItem();
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = "m-" + Date.now();
    copy.order = state.items.length + 1;
    copy.status = "draft";
    if (src.title.en) copy.title.en = src.title.en + " v2";
    if (src.title.es) copy.title.es = src.title.es + " v2";
    setState((prev) => ({ ...prev, items: [...prev.items, copy], edited: true }));
    openEdit(copy.id, JSON.parse(JSON.stringify(copy)));
  }

  async function deleteDraft() {
    if (!(await askConfirm({ message: L.confirmDel, danger: true }))) return;
    const did = modal.draft ? modal.draft.id : modal.openId;
    setState((prev) => ({ ...prev, items: prev.items.filter((m) => m.id !== did), edited: true }));
    closeModal();
    toast(L.deletedTxt);
  }

  function cancelEdit() {
    if (modal.draft && state.items.some((m) => m.id === modal.draft.id)) {
      setModal((m) => ({ ...m, editing: false, draft: null }));
    } else {
      closeModal();
    }
  }

  function copyMessage(m) {
    copyText(personalized(shown(m.body), state.recipient)).then(() => toast(L.copied));
  }

  const backupJson = () => JSON.stringify(state.items, null, 2);

  function doExport() {
    setOptOpen(false);
    downloadJson("coachdata-message-bank.json", backupJson());
    toast(L.exportSaved);
  }

  function doExportCopy() {
    setOptOpen(false);
    copyText(backupJson()).then(() => toast(L.exportCopied));
  }

  function doImportClick() {
    if (fileRef.current) fileRef.current.click();
  }

  function onImportFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = null;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        parsed = null;
      }
      const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.items) ? parsed.items : null;
      if (!list || !list.length) {
        toast(L.importBad);
        return;
      }
      patch({ items: normalize({ items: list }, true).items, edited: true, libraryVersion: LIBRARY_VERSION });
      setUpdateWaiting(false);
      setOptOpen(false);
      toast(L.importOk);
    };
    reader.onerror = () => toast(L.importBad);
    reader.readAsText(f);
    e.target.value = "";
  }

  async function doReset() {
    if (!(await askConfirm({ message: L.confirmReset, danger: true }))) return;
    patch({ items: normalize({ items: seed() }, true).items, edited: false, libraryVersion: LIBRARY_VERSION });
    setUpdateWaiting(false);
    setOptOpen(false);
    toast(L.resetDone);
  }

  function onHandlePointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    dragState.current = { id, dragging: false, startX: e.clientX, startY: e.clientY, before: true, overId: null };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  const dragState = useRef({ id: null, dragging: false, startX: 0, startY: 0, before: true, overId: null });

  function onPointerMove(e) {
    const ds = dragState.current;
    if (!ds.id) return;
    if (!ds.dragging) {
      if (Math.abs(e.clientX - ds.startX) < 4 && Math.abs(e.clientY - ds.startY) < 4) return;
      ds.dragging = true;
      setDrag((d) => ({ ...d, id: ds.id }));
    }
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el && el.closest ? el.closest("[data-mb-id]") : null;
    if (card && card.getAttribute("data-mb-id") !== ds.id) {
      const rect = card.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / rect.width + (e.clientY - rect.top) / rect.height;
      ds.before = frac < 1;
      ds.overId = card.getAttribute("data-mb-id");
      setDrag({ id: ds.id, overId: ds.overId, before: ds.before });
    } else {
      ds.overId = null;
      setDrag((d) => ({ ...d, overId: null }));
    }
  }

  function onPointerUp() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    const ds = dragState.current;
    if (ds.dragging && ds.overId && ds.id) {
      reorderItems(ds.id, ds.overId, ds.before);
    }
    dragState.current = { id: null, dragging: false, startX: 0, startY: 0, before: true, overId: null };
    setDrag({ id: null, overId: null, before: true });
  }

  function reorderItems(sourceId, targetId, before) {
    if (sourceId === targetId) return;
    setState((prev) => {
      const items = prev.items.slice();
      const srcIdx = items.findIndex((m) => m.id === sourceId);
      if (srcIdx === -1) return prev;
      const [srcItem] = items.splice(srcIdx, 1);
      let tgtIdx = items.findIndex((m) => m.id === targetId);
      items.splice(tgtIdx === -1 ? items.length : before ? tgtIdx : tgtIdx + 1, 0, srcItem);
      items.forEach((m, i) => (m.order = i + 1));
      return { ...prev, items, edited: true };
    });
    toast(L.reorderedTxt);
  }

  const zoomStyle = { zoom: state.zoom / 100 };

  function renderView() {
    const m = currentItem();
    if (!m) return null;
    const body = shown(m.body);
    const missing = !hasCurrent(m.body) && body;
    const shownFlag = (hasCurrent(m.body) ? state.lang : other).toUpperCase();

    return (
      <>
        <div className="mb-tagrow">
          <span className="mb-tag">{L.cats[m.cat]}</span>
          <span className={"mb-tag " + statusClass(m.status)}>{L.status[m.status]}</span>
        </div>
        <h2 className="mb-sheet-title">{shown(m.title) || L.untitled}</h2>
        {shown(m.when) && (
          <div className="mb-panel" style={{ marginBottom: 14 }}>
            <span className="mb-caplabel">{L.bestFor}</span>
            <p>{shown(m.when)}</p>
          </div>
        )}
        {missing && (
          <div className="mb-panel" style={{ borderColor: "var(--crit)", marginBottom: 14 }}>
            <p style={{ color: "var(--crit)", fontSize: 13 }}>
              {state.lang === "es" ? L.noSpanish : L.noEnglish}
            </p>
          </div>
        )}
        <div className="mb-panel">
          <span className="mb-caplabel">
            <b>{shownFlag}</b> {L.message}
          </span>
          <p>{highlightNodes(body, state.recipient)}</p>
          <p className="mb-card-when" style={{ marginTop: 12 }}>
            {L.chars(personalized(body, state.recipient).length)}
          </p>
        </div>
      </>
    );
  }

  function renderEditor() {
    const d = modal.draft;
    const lg = state.lang;
    const flag = lg === "es" ? "ES" : "EN";

    return (
      <>
        <div className="mb-editcap">
          <span className="mb-caplabel">
            <b>{flag}</b> {L.editingIn}
          </span>
          <p className="mb-card-when" style={{ margin: 0 }}>
            {L.editingSwitch}
          </p>
        </div>
        <div className="mb-cols">
          <div className="mb-field">
            <label htmlFor="mb-f-cat">{L.fCat}</label>
            <select
              className="mb-select"
              id="mb-f-cat"
              value={d.cat}
              onChange={(e) => updateDraft({ cat: e.target.value })}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {L.cats[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-field">
            <label htmlFor="mb-f-status">{L.fStatus}</label>
            <select
              className="mb-select"
              id="mb-f-status"
              value={d.status}
              onChange={(e) => updateDraft({ status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {L.status[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-field">
          <label htmlFor="mb-f-title">{L.fTitle}</label>
          <input
            className="mb-input"
            id="mb-f-title"
            value={d.title[lg]}
            onChange={(e) => updateDraftPair("title", e.target.value)}
          />
        </div>
        <div className="mb-field">
          <label htmlFor="mb-f-when">{L.fWhen}</label>
          <textarea
            className="mb-textarea"
            id="mb-f-when"
            style={{ minHeight: 92 }}
            value={d.when[lg]}
            onChange={(e) => updateDraftPair("when", e.target.value)}
          />
        </div>
        <div className="mb-field">
          <label htmlFor="mb-f-body">{L.fBody}</label>
          <textarea
            className="mb-textarea"
            id="mb-f-body"
            value={d.body[lg]}
            onChange={(e) => updateDraftPair("body", e.target.value)}
          />
        </div>
      </>
    );
  }

  function renderFoot() {
    if (modal.editing) {
      const isExisting = state.items.some((m) => m.id === modal.draft.id);
      return (
        <>
          <button className="mb-btn mb-solid" type="button" onClick={commitDraft}>
            <Check size={14} />
            {L.save}
          </button>
          <button className="mb-btn mb-ghost" type="button" onClick={cancelEdit}>
            <X size={14} />
            {L.cancel}
          </button>
          <span className="mb-spacer" />
          {isExisting && (
            <button className="mb-btn mb-danger" type="button" onClick={deleteDraft}>
              <Trash2 size={14} />
              {L.del}
            </button>
          )}
        </>
      );
    }
    const m = currentItem();
    return (
      <>
        <button
          className="mb-btn mb-solid"
          type="button"
          onClick={() => {
            if (m) copyMessage(m);
          }}
        >
          <Copy size={14} />
          {L.copy}
        </button>
        <button className="mb-btn" type="button" onClick={() => openEdit(modal.openId)}>
          <Pencil size={14} />
          {L.edit}
        </button>
        <button className="mb-btn mb-ghost" type="button" onClick={duplicateCurrent}>
          <CopyPlus size={14} />
          {L.duplicate}
        </button>
      </>
    );
  }

  function modalKicker(modal, state, L) {
    if (modal.editing) {
      const isExisting = state.items.some((m) => m.id === modal.draft.id);
      return isExisting ? L.edit : L.newTitle;
    }
    const m = state.items.find((x) => x.id === modal.openId);
    return m ? L.cats[m.cat] : "Message";
  }

  return (
    <div ref={rootRef} className={"mb-root" + (tucked ? " mb-mast-hidden" : "")} data-theme={state.theme} lang={state.lang}>
      {/* ---- masthead ---- */}
      <header className={"mb-masthead" + (tucked ? " mb-tucked" : "")}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div>
            <h1 className="mb-mast-title">
              {L.titleLead} <em>{L.titleAccent}</em>
            </h1>
            <p className="mb-mast-sub">{L.sub}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="mb-searchwrap">
              <Search size={14} aria-hidden="true" />
              <label className="mb-sr" htmlFor="mb-search">
                {L.search}
              </label>
              <input
                id="mb-search"
                type="search"
                autoComplete="off"
                placeholder={L.search}
                value={state.query}
                onChange={(e) => patch({ query: e.target.value })}
              />
            </div>
            <div ref={optWrapRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="mb-iconbtn"
                aria-haspopup="true"
                aria-expanded={optOpen}
                title={L.library}
                onClick={(e) => {
                  e.stopPropagation();
                  setModeOpen(false);
                  setOptOpen((v) => !v);
                }}
              >
                <MoreHorizontal size={15} />
              </button>
              {optOpen && (
                <div className="mb-pop mb-optMenu">
                  <div className="mb-menu-group">
                    <p className="mb-menu-label">{L.zoom}</p>
                    <div className="mb-zoomrow">
                      <button className="mb-iconbtn mb-sm" type="button" title="Zoom out" onClick={() => stepZoom(-1)}>
                        <Minus size={14} />
                      </button>
                      <span className="mb-zoomval">{state.zoom}%</span>
                      <button className="mb-iconbtn mb-sm" type="button" title="Zoom in" onClick={() => stepZoom(1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mb-menu-group">
                    <p className="mb-menu-label">{L.library}</p>
                    <button className="mb-menu-action" type="button" onClick={doExport}>
                      <Download size={14} style={{ verticalAlign: "-2px", marginRight: 8 }} />
                      {L.exportTxt}
                    </button>
                    <button className="mb-menu-action" type="button" onClick={doExportCopy}>
                      <ClipboardCopy size={14} style={{ verticalAlign: "-2px", marginRight: 8 }} />
                      {L.exportCopyTxt}
                    </button>
                    <button className="mb-menu-action" type="button" onClick={doImportClick}>
                      <Upload size={14} style={{ verticalAlign: "-2px", marginRight: 8 }} />
                      {L.importTxt}
                    </button>
                    <button className="mb-menu-action mb-danger" type="button" onClick={doReset}>
                      <RotateCcw size={14} style={{ verticalAlign: "-2px", marginRight: 8 }} />
                      {L.resetTxt}
                    </button>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
            </div>
          </div>
        </div>

        <div className="mb-navwrap" style={{ marginTop: '1rem' }}>
          <div className="mb-navstrip" role="group" aria-label="Categories">
            {["all", ...CATS].map((c) => (
              <button
                key={c}
                type="button"
                className="mb-pill"
                aria-pressed={state.filter === c}
                onClick={() => patch({ filter: c })}
              >
                {L.cats[c]}
                <span className="mb-count">{counts[c]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ---- content ---- */}
      <main className="mb-content" style={zoomStyle}>
        {updateWaiting && (
          <div className="mb-banner">
            <div className="mb-bnote mb-warn">
              <div className="mb-brow">
                <div className="mb-btxt">
                  <h3>{L.updateTitle}</h3>
                  <p>{L.updateBody}</p>
                </div>
                <div className="mb-bactions">
                  <button className="mb-btn mb-solid" type="button" onClick={takeUpdate}>
                    {L.updateTake}
                  </button>
                  <button className="mb-btn mb-ghost" type="button" onClick={keepMine}>
                    {L.updateKeep}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-toolbar">
          <div className="mb-toolbar-left">
            <p className="mb-resultline">
              {state.lang === "en" ? (
                <>
                  <b>{visible.length}</b> of <b>{state.items.length}</b> messages
                </>
              ) : (
                <>
                  <b>{visible.length}</b> de <b>{state.items.length}</b> mensajes
                </>
              )}
            </p>
            <button
              className="mb-statuschip"
              type="button"
              aria-pressed={state.onlyActive}
              onClick={() => patch((p) => ({ onlyActive: !p.onlyActive }))}
            >
              <span className="mb-dot-in-use" aria-hidden="true" />
              <span>{L.onlyActive}</span>
            </button>
          </div>
          <button className="mb-btn mb-solid" type="button" onClick={() => openEdit(null)}>
            <Plus size={16} />
            {L.newTxt}
          </button>
        </div>

        <div className="mb-grid">
          {visible.length === 0 ? (
            <div className="mb-empty">
              <div className="mb-empty-icon" aria-hidden="true">
                {state.items.length === 0 ? <MessageSquarePlus size={26} /> : <Search size={26} />}
              </div>
              <h3>{state.items.length === 0 ? L.emptyTitle : L.noResultsTitle}</h3>
              {/* Sin boton de accion: la barra superior ya tiene "Nuevo mensaje"
                  a la vista, y duplicarlo aqui reparte la atencion entre dos
                  controles que hacen lo mismo. */}
              <p>{state.items.length === 0 ? L.emptyBody : L.noResultsBody}</p>
            </div>
          ) : (
            visible.map((m) => {
              const body = shown(m.body);
              const missing = !hasCurrent(m.body) && body;
              const dropCls = drag.overId === m.id ? (drag.before ? " mb-drop-before" : " mb-drop-after") : "";
              const draggingCls = drag.id === m.id ? " mb-dragging" : "";
              return (
                <article
                  key={m.id}
                  className={"mb-card" + draggingCls + dropCls}
                  data-mb-id={m.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => openView(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openView(m.id);
                    }
                  }}
                >
                  <button
                    className="mb-draghandle"
                    type="button"
                    tabIndex={-1}
                    aria-label={L.dragHandle}
                    title={L.dragHandle}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => onHandlePointerDown(e, m.id)}
                  >
                    <GripVertical size={13} />
                  </button>
                  <div className="mb-tagrow">
                    <span className="mb-tag">{L.cats[m.cat]}</span>
                    <span className={"mb-tag " + statusClass(m.status)}>{L.status[m.status]}</span>
                    {missing && (
                      <span className="mb-tag mb-crit">
                        {state.lang === "en" ? L.missingTagEs : L.missingTag}
                      </span>
                    )}
                  </div>
                  <h2 className="mb-card-title">{shown(m.title) || L.untitled}</h2>
                  {shown(m.when) && <p className="mb-card-when">{shown(m.when)}</p>}
                  <p className="mb-excerpt">
                    <span className="mb-clip">{highlightNodes(body, state.recipient)}</span>
                  </p>
                  <div className="mb-card-foot">
                    <span className="mb-meta">{L.chars(personalized(body, state.recipient).length)}</span>
                    <button
                      className="mb-copybtn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyMessage(m);
                      }}
                    >
                      <Copy size={13} />
                      {L.copy}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      {/* ---- modal ---- */}
      {modal.mounted && (
        <div
          className={"mb-modal" + (modal.on ? " mb-on" : "") + (state.wide ? " mb-wide" : "")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="mb-sheet" role="dialog" aria-modal="true">
            <div className="mb-sheet-head">
              <p className="mb-brandline">{modalKicker(modal, state, L)}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="mb-iconbtn mb-sm"
                  type="button"
                  title="Expand"
                  onClick={() => patch((p) => ({ wide: !p.wide }))}
                >
                  <Maximize2 size={14} />
                </button>
                <button className="mb-iconbtn mb-sm" type="button" title="Close" onClick={closeModal}>
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="mb-sheet-scroll" style={zoomStyle}>
              {modal.editing ? renderEditor() : renderView()}
            </div>
            <div className="mb-sheet-foot">{renderFoot()}</div>
          </div>
        </div>
      )}

      {/* ---- toast ---- */}
      <div className={"mb-toast" + (toastOn ? " mb-on" : "")} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}
