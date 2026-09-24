import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, MoreHorizontal, Minus, Plus, Maximize2, X } from "lucide-react";
import { SEED_CATS, SEED, SEED_FORMULAS, SEED_SERIES } from "./contentDeskSeed";
import { useNotifications } from './common/Notifications';
import { scopedKey, purgeLegacyKey } from '../core/storage/scopedStorage';
import "./ContentDesk.css";

/* ================================================================
   CoachData Content Desk
   Six views: Pillars · Status · Table · Calendar · Dashboard · Playbook
   Drag-and-drop (ref-based, no state), card drawer, zoom, JSON I/O.
   Inherits OS theme, language and mode.
================================================================ */

const STATUSES = [
  "Inbox", "Ideas", "Writing", "Scripted",
  "Ready to Film", "Filming", "Editing",
  "Ready to Post", "Scheduled", "Posted", "Archived",
];

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Threads", "Pinterest", "Other"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const FORMATS    = ["Reel", "Carousel", "B-roll reel", "Story", "Threads", "Photo", "Video"];

const METRICS = [
  { k: "views",     l: "Views" },
  { k: "reach",     l: "Reach" },
  { k: "nonfollow", l: "Non-follower %" },
  { k: "watch",     l: "Avg watch time" },
  { k: "retention", l: "Retention %" },
  { k: "replays",   l: "Replays" },
  { k: "likes",     l: "Likes" },
  { k: "comments",  l: "Comments" },
  { k: "saves",     l: "Saves" },
  { k: "shares",    l: "Shares" },
  { k: "visits",    l: "Profile visits" },
  { k: "clicks",    l: "Link clicks" },
  { k: "follows",   l: "New follows" },
];

const VIEWS = [
  { v: "board",     label: "Pillars" },
  { v: "status",    label: "Status" },
  { v: "table",     label: "Table" },
  { v: "calendar",  label: "Calendar" },
  { v: "dashboard", label: "Dashboard" },
  { v: "playbook",  label: "Playbook" },
];

const ZOOM_STEPS = [80, 90, 100, 110, 125, 140, 160];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOWS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const KEY        = "coachdata-content-desk-v2";
const ZOOM_KEY   = "coachdata-cd-zoom";
const SAMPLE_KEY = "coachdata-cd-sample";

/* ── Helpers ── */
function uid(p)    { return p + "-" + Math.random().toString(36).slice(2, 8); }
function iso(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
function todayISO() { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); }
function num(v)    { const n = parseFloat(v); return isFinite(n) ? n : 0; }
function fmtNum(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function hookOf(card) { return (card.script || "").split(/[.!?]/)[0].trim() || card.title; }

/* ── State normalizer ── */
function normalize(p) {
  if (!Array.isArray(p.series))   p.series   = SEED_SERIES.map(x => ({ ...x }));
  if (!Array.isArray(p.formulas)) {
    p.formulas = SEED_FORMULAS.map(f => ({ ...f, steps: f.steps.map(x => ({ ...x, id: x.id || uid("step") })) }));
  } else {
    p.formulas.forEach(f => {
      if (!Array.isArray(f.steps)) f.steps = [];
      f.steps.forEach(s => {
        if (!s.id) s.id = uid("step");
      });
    });
  }
  p.series.forEach(x => {
    ["editing","hooks","visuals","notes"].forEach(k => { if (typeof x[k] !== "string") x[k] = ""; });
    if (!Array.isArray(x.links)) x.links = [];
  });
  p.cards.forEach(c => {
    if (typeof c.date     !== "string") c.date     = "";
    if (typeof c.time     !== "string") c.time     = "";
    if (typeof c.client   !== "string") c.client   = "";
    if (typeof c.creator  !== "string") c.creator  = "";
    if (typeof c.caption  !== "string") c.caption  = "";
    if (typeof c.notes    !== "string") c.notes    = "";
    if (typeof c.format   !== "string") c.format   = "Reel";
    if (typeof c.platform !== "string") c.platform = "Instagram";
    if (typeof c.priority !== "string") c.priority = "Normal";
    if (!Array.isArray(c.tags))   c.tags   = [];
    if (!Array.isArray(c.scenes)) c.scenes = [];
    if (!Array.isArray(c.links))  c.links  = [];
    if (typeof c.metrics !== "object" || !c.metrics) c.metrics = {};
    if (typeof c.locked  !== "boolean") c.locked = false;
    if (typeof c.order   !== "number")  c.order  = 0;
    if (!STATUSES.includes(c.status))   c.status = "Ideas";
  });
  return p;
}

/**
 * Tablero de contenido vacio: es lo que ve una cuenta nueva. SEED/SEED_CATS son
 * el contenido real de CoachData y no deben aparecer en la cuenta de otro.
 */
function emptyBoard() {
  return normalize({ cats: [], formulas: [], series: [], cards: [] });
}

function fresh() {
  return normalize({
    cats: SEED_CATS.map(c => ({ id: c.id, name: c.name, hue: c.hue || 152 })),
    formulas: SEED_FORMULAS.map(f => ({ id: f.id, name: f.name, summary: f.summary, steps: f.steps.map(x => ({ ...x, id: uid("step") })) })),
    series: SEED_SERIES.map(x => ({ ...x })),
    cards: SEED.map((s, i) => ({
      id: s.id, cat: s.cat, ref: s.ref || "", title: s.title, script: s.script || "",
      order: i, status: s.status || "Ideas", scenes: (s.scenes || []).slice(),
      caption: "", notes: s.notes || "", date: "", time: "", format: s.format || "Reel",
      client: "", creator: "", platform: s.platform || "Instagram", priority: s.priority || "Normal",
      tags: (s.tags || []).slice(), links: [], metrics: {}, locked: false,
    })),
  });
}

function loadState(storageKey = KEY, allowSeed = false) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.cards && p.cats) return normalize(p);
    }
  } catch {}
  return allowSeed ? fresh() : emptyBoard();
}

/* ── Badge helpers ── */
function priorityClass(pr) {
  if (pr === "High")   return "cd-badge cd-badge-pr-high";
  if (pr === "Urgent") return "cd-badge cd-badge-pr-urgent";
  if (pr === "Low")    return "cd-badge cd-badge-pr-low";
  return "cd-badge cd-badge-pr-normal";
}

function statusClass(st) {
  const s = (st || "").toLowerCase().replace(/\s+/g, "-");
  return `cd-badge cd-badge-status cd-badge-status-${s}`;
}

const T = {
  en: {
    title: "Content Desk",
    sub: "Plan, script and track every piece of content in one place.",
    search: "Search ideas…",
    board: "Pillars",
    status: "Status",
    table: "Table",
    calendar: "Calendar",
    dashboard: "Dashboard",
    playbook: "Playbook",
    total_ideas: "Total Ideas",
    inbox: "Inbox",
    writing: "Writing",
    filming: "Filming",
    editing: "Editing",
    scheduled: "Scheduled",
    posted: "Posted",
    not_scheduled: "NOT SCHEDULED",
    no_ideas_scheduled: "All ideas are scheduled.",
    export_backup: "Export backup",
    import_backup: "Import backup",
    reset_defaults: "Reset to defaults",
    reset_confirm: "Reset all ideas to defaults?",
    zoom: "Zoom",
    previous: "PREVIOUS",
    today: "TODAY",
    next: "NEXT",
    new_idea: "+ New idea",
    add_idea: "+ Add idea",
    delete_idea_confirm: "Delete this idea?",
    delete_series_confirm: "Delete this series?",
    delete_formula_confirm: "Delete this formula?",
    reference: "Reference",
    status_label: "Status",
    format_label: "Format",
    platform_label: "Platform",
    priority_label: "Priority",
    pillar_label: "Pillar",
    publish_date: "Publish date",
    time_label: "Time",
    client_label: "Client",
    creator_label: "Creator",
    hook_script: "Hook / Script",
    caption_label: "Caption",
    notes_label: "Notes",
    scenes_shots: "Scenes / Shots",
    tags_label: "Tags",
    performance: "Performance",
    delete_btn: "Delete idea",
    delete_series_btn: "Delete series",
    delete_formula_btn: "Delete formula",
    cadence: "Cadence",
    what_it_is: "What it is",
    summary: "Summary",
    steps: "Steps",
    new_formula: "+ New",
    new_series: "+ New",
    formula_name_prompt: "Formula name",
    series_name_prompt: "Series name",
    pickup_rate_label: "Pickup rate",
    pickup_rate_desc: "Saves plus shares divided by reach. The number that tracks what people act on.",
    engagement_rate: "Engagement rate",
    non_follower_reach: "Non-follower reach",
    follows_per_1k: "Follows per 1k reached",
    visit_to_follow: "Visit to follow",
    replay_rate: "Replay rate",
    profile_visit_rate: "Profile visit rate",
    saves: "Saves",
    shares: "Shares",
    views: "Views",
    posts: "posts",
    best_hooks: "Best hooks",
    best_content_pillars: "Best content pillars",
    best_formats: "Best formats",
    top_performing_posts: "Top performing posts",
    preview_mode_msg: "Preview mode — sample numbers. Nothing here is saved.",
    real_numbers_msg: "Showing only the numbers you've entered on each idea card.",
    show_real_numbers_btn: "Show my real numbers",
    preview_sample_numbers_btn: "Preview with sample numbers",
    no_numbers_title: "No numbers yet",
    no_numbers_desc: "Open any idea card and fill in the Performance fields.",
    hook_formulas: "Hook Formulas",
    content_series: "Content Series",
    no_formulas_title: "No formulas yet",
    no_formulas_desc: "Add your first hook formula above.",
    no_series_title: "No series yet",
    no_series_desc: "Add your first content series above.",
  },
  es: {
    title: "Mesa de Contenido",
    sub: "Planifica, escribe y haz seguimiento de cada pieza de contenido en un solo lugar.",
    search: "Buscar ideas…",
    board: "Pilares",
    status: "Estado",
    table: "Tabla",
    calendar: "Calendario",
    dashboard: "Métricas",
    playbook: "Playbook",
    total_ideas: "Total Ideas",
    inbox: "Inbox",
    writing: "Redacción",
    filming: "Grabación",
    editing: "Edición",
    scheduled: "Programado",
    posted: "Publicado",
    not_scheduled: "NO PROGRAMADO",
    no_ideas_scheduled: "Todas las ideas están programadas.",
    export_backup: "Exportar copia",
    import_backup: "Importar copia",
    reset_defaults: "Restaurar por defecto",
    reset_confirm: "¿Restaurar todas las ideas por defecto?",
    zoom: "Zoom",
    previous: "ANTERIOR",
    today: "HOY",
    next: "SIGUIENTE",
    new_idea: "+ Nueva idea",
    add_idea: "+ Añadir idea",
    delete_idea_confirm: "¿Eliminar esta idea?",
    delete_series_confirm: "¿Eliminar esta serie?",
    delete_formula_confirm: "¿Eliminar esta fórmula?",
    reference: "Referencia",
    status_label: "Estado",
    format_label: "Formato",
    platform_label: "Plataforma",
    priority_label: "Prioridad",
    pillar_label: "Pillar",
    publish_date: "Fecha de publicación",
    time_label: "Hora",
    client_label: "Cliente",
    creator_label: "Creador",
    hook_script: "Gancho / Guión",
    caption_label: "Copia / Texto",
    notes_label: "Notas de Producción",
    scenes_shots: "Escenas / Tomas",
    tags_label: "Etiquetas",
    performance: "Rendimiento",
    delete_btn: "Eliminar idea",
    delete_series_btn: "Eliminar serie",
    delete_formula_btn: "Eliminar fórmula",
    cadence: "Cadencia",
    what_it_is: "Qué es",
    summary: "Resumen",
    steps: "Pasos",
    new_formula: "+ Nuevo",
    new_series: "+ Nuevo",
    formula_name_prompt: "Nombre de la fórmula",
    series_name_prompt: "Nombre de la serie",
    pickup_rate_label: "Tasa de Adopción (Pickup)",
    pickup_rate_desc: "Guardados más compartidos divididos por alcance. Mide lo que realmente activa a tu audiencia.",
    engagement_rate: "Tasa de Interacción",
    non_follower_reach: "Alcance de No Seguidores",
    follows_per_1k: "Seguidores por 1k alcanzados",
    visit_to_follow: "Conversión Visita a Seguidor",
    replay_rate: "Tasa de Reproducción",
    profile_visit_rate: "Tasa de Visita al Perfil",
    saves: "Guardados",
    shares: "Compartidos",
    views: "Visualizaciones",
    posts: "publicaciones",
    best_hooks: "Mejores ganchos",
    best_content_pillars: "Mejores pilares de contenido",
    best_formats: "Mejores formatos",
    top_performing_posts: "Publicaciones más vistas",
    preview_mode_msg: "Modo vista previa — números de ejemplo. Nada aquí es real.",
    real_numbers_msg: "Mostrando únicamente las métricas ingresadas en tus tarjetas de ideas.",
    show_real_numbers_btn: "Ver mis números reales",
    preview_sample_numbers_btn: "Ver con números de ejemplo",
    no_numbers_title: "Sin métricas aún",
    no_numbers_desc: "Abre cualquier tarjeta de idea y rellena la sección de Rendimiento.",
    hook_formulas: "Fórmulas de Ganchos",
    content_series: "Series de Contenido",
    no_formulas_title: "Sin fórmulas aún",
    no_formulas_desc: "Agrega tu primera fórmula de gancho arriba.",
    no_series_title: "Sin series aún",
    no_series_desc: "Agrega tu primera serie de contenido arriba.",
  }
};

function translateStatus(st, lang) {
  if (lang !== "es") return st;
  const statusMap = {
    "Inbox": "Inbox",
    "Ideas": "Ideas",
    "Writing": "Redacción",
    "Scripted": "Guionizado",
    "Ready to Film": "Listo para Grabar",
    "Filming": "Grabación",
    "Editing": "Edición",
    "Ready to Post": "Listo para Publicar",
    "Scheduled": "Programado",
    "Posted": "Publicado",
    "Archived": "Archivado"
  };
  return statusMap[st] || st;
}

function translatePriority(pr, lang) {
  if (lang !== "es") return pr;
  const priorityMap = {
    "Low": "Baja",
    "Normal": "Normal",
    "High": "Alta",
    "Urgent": "Urgente"
  };
  return priorityMap[pr] || pr;
}

function translateFormat(fmt, lang) {
  if (lang !== "es") return fmt;
  const formatMap = {
    "Reel": "Reel",
    "Carousel": "Carrusel",
    "B-roll reel": "Reel B-roll",
    "Story": "Historia",
    "Threads": "Threads",
    "Photo": "Foto",
    "Video": "Video"
  };
  return formatMap[fmt] || fmt;
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════ */
export default function ContentDesk({ language = "es", orgScope, allowSeed = false }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const lang = language === "en" || language === "es" ? language : "es";
  const t = k => T[lang][k] || k;
  // Ambito por organizacion: sin esto todas las cuentas compartian el mismo
  // tablero de contenido guardado en localStorage.
  const storageKey = useMemo(() => scopedKey(KEY, orgScope), [orgScope]);
  const [state,      setState]      = useState(() => loadState(storageKey, allowSeed));
  const [zoomPct,    setZoomPct]    = useState(() => {
    try { const z = parseInt(localStorage.getItem(ZOOM_KEY), 10); return ZOOM_STEPS.includes(z) ? z : 100; } catch { return 100; }
  });
  const [sampleOn,   setSampleOn]   = useState(() => {
    try { return localStorage.getItem(SAMPLE_KEY) === "1"; } catch { return false; }
  });
  const [view,       setViewState]  = useState("board");
  const [search,     setSearch]     = useState("");
  const [kanFilters, setKanFilters] = useState({ client: "", platform: "", cat: "", creator: "", priority: "", tag: "" });
  const [sortKey,    setSortKey]    = useState("cat");
  const [sortDir,    setSortDir]    = useState(1);
  const [calYM,      setCalYM]      = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [openId,     setOpenId]     = useState(null);
  const [drawerMode, setDrawerMode] = useState("card");
  const [drawerOn,   setDrawerOn]   = useState(false);
  const [drawerWide, setDrawerWide] = useState(false);
  const [moreMenu,   setMoreMenu]   = useState(false);
  const [overKey,    setOverKey]    = useState(null);
  const [toastMsg,   setToastMsg]   = useState("");
  const [toastShow,  setToastShow]  = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  /* ── Sample rows for dashboard (unconditional hooks) ── */
  const sampleRows = useMemo(() => state.cards.slice(0, 6).map(c => ({
    card: c, m: {
      views: 5000 + Math.floor(Math.random() * 20000),
      reach: 4000 + Math.floor(Math.random() * 15000),
      saves: 50 + Math.floor(Math.random() * 400),
      shares: 20 + Math.floor(Math.random() * 200),
      likes: 100 + Math.floor(Math.random() * 1000),
      comments: 10 + Math.floor(Math.random() * 200),
      follows: 5 + Math.floor(Math.random() * 100),
      replays: 200 + Math.floor(Math.random() * 2000),
      visits: 50 + Math.floor(Math.random() * 500),
      clicks: 20 + Math.floor(Math.random() * 300),
      nonfollow: 20 + Math.floor(Math.random() * 60),
      retention: 30 + Math.floor(Math.random() * 50),
      watch: 2 + Math.random() * 20,
    },
  })), [state.cards]);

  /* ── Drag via refs — avoids state re-render / scroll reset ── */
  const dragIdRef   = useRef(null);
  const moreWrapRef = useRef(null);
  const fileRef     = useRef(null);
  const titleRef    = useRef(null);
  const toastTimer  = useRef(null);
  const closeTimer  = useRef(null);

  /* ── Persistence ── */
  // Serializar el board entero en cada pulsación de tecla bloqueaba el hilo principal.
  const persistTimer = useRef(null);
  useEffect(() => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { toast("Couldn't save — storage full"); }
    }, 500);
    const flush = () => {
      clearTimeout(persistTimer.current);
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); clearTimeout(persistTimer.current); };
  }, [state, storageKey]);

  useEffect(() => { purgeLegacyKey(KEY); }, []);
  useEffect(() => { try { localStorage.setItem(ZOOM_KEY, String(zoomPct)); } catch {} }, [zoomPct]);
  useEffect(() => { try { localStorage.setItem(SAMPLE_KEY, sampleOn ? "1" : "0"); } catch {} }, [sampleOn]);
  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(closeTimer.current); }, []);

  /* ── Close menus on outside click / Escape ── */
  useEffect(() => {
    function onDoc(e) {
      if (moreMenu && moreWrapRef.current && !moreWrapRef.current.contains(e.target)) setMoreMenu(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [moreMenu]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      setMoreMenu(false);
      if (openId) closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  /* ── Core mutations — optimized shallow copying to prevent scroll reset during drag/drop ── */
  const mutate = useCallback(fn => {
    setState(prev => {
      const next = {
        ...prev,
        cards: prev.cards.map(c => ({ ...c, metrics: { ...c.metrics }, tags: [...c.tags], scenes: [...c.scenes] })),
        cats: prev.cats.map(c => ({ ...c })),
        series: prev.series.map(s => ({ ...s, links: [...s.links] })),
        formulas: prev.formulas.map(f => ({ ...f, steps: f.steps.map(s => ({ ...s })) }))
      };
      fn(next);
      return next;
    });
  }, []);

  const toast = useCallback(msg => {
    setToastMsg(msg); setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2200);
  }, []);

  /* ── Lookups ── */
  const cardById   = id => state.cards.find(c => c.id === id);
  const catById    = id => state.cats.find(k => k.id === id);
  const seriesById = id => state.series.find(x => x.id === id);

  /* ── Filters ── */
  const filter = search.trim().toLowerCase();
  const matchesFilter = c => {
    if (!filter) return true;
    const hay = [c.title, c.script, c.caption, c.notes, c.ref, c.format || "", c.status,
      c.client || "", c.creator || "", c.platform || "", ...(c.tags || []), ...(c.scenes || [])].join(" ").toLowerCase();
    return hay.includes(filter);
  };
  const passesFilters = c => {
    const cat = catById(c.cat);
    if (kanFilters.client   && c.client   !== kanFilters.client)   return false;
    if (kanFilters.platform && c.platform !== kanFilters.platform) return false;
    if (kanFilters.creator  && c.creator  !== kanFilters.creator)  return false;
    if (kanFilters.priority && c.priority !== kanFilters.priority) return false;
    if (kanFilters.cat      && (!cat || cat.name !== kanFilters.cat)) return false;
    if (kanFilters.tag      && !c.tags.includes(kanFilters.tag))   return false;
    return true;
  };
  const uniqueValues = fn => {
    const vals = state.cards.flatMap(c => { const v = fn(c); return Array.isArray(v) ? v : (v ? [v] : []); });
    return [...new Set(vals)].sort();
  };

  /* ── View ── */
  function setView(v) { setMoreMenu(false); setViewState(v); }
  const stepZoom = d => setZoomPct(z => {
    const i = ZOOM_STEPS.indexOf(z);
    return ZOOM_STEPS[i + d] !== undefined ? ZOOM_STEPS[i + d] : z;
  });
  const zoomI = ZOOM_STEPS.indexOf(zoomPct);

  /* ── Drag & Drop — use refs + data attribute to avoid scroll reset ── */
  function startDrag(e, id) {
    dragIdRef.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  }

  function endDrag(id) {
    dragIdRef.current = null;
    setDraggingId(null);
    setOverKey(null);
  }

  const getDragId = e => dragIdRef.current || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");

  function dropBoard(e, catId) {
    e.preventDefault();
    const id = getDragId(e);
    endDrag(id);
    if (!id) return;
    const y = e.clientY;
    const cardEls = [...e.currentTarget.querySelectorAll("[data-cd-id]")].filter(el => el.getAttribute("data-cd-id") !== id);
    let idx = cardEls.length;
    for (let i = 0; i < cardEls.length; i++) {
      const b = cardEls[i].getBoundingClientRect();
      if (y < b.top + b.height / 2) { idx = i; break; }
    }
    mutate(d => {
      const card = d.cards.find(c => c.id === id);
      if (!card) return;
      card.cat = catId;
      const catCards = d.cards.filter(c => c.cat === catId && c.id !== id).sort((a, b) => a.order - b.order);
      catCards.splice(idx, 0, card);
      catCards.forEach((c, i) => (c.order = i));
    });
  }

  function dropStatus(e, st) {
    e.preventDefault();
    const id = getDragId(e);
    endDrag(id);
    if (!id) return;
    const y = e.clientY;
    const cardEls = [...e.currentTarget.querySelectorAll("[data-cd-id]")].filter(el => el.getAttribute("data-cd-id") !== id);
    let idx = cardEls.length;
    for (let i = 0; i < cardEls.length; i++) {
      const b = cardEls[i].getBoundingClientRect();
      if (y < b.top + b.height / 2) { idx = i; break; }
    }
    mutate(d => {
      const card = d.cards.find(c => c.id === id);
      if (!card) return;
      card.status = st;
      const statusCards = d.cards.filter(c => c.status === st && c.id !== id).sort((a, b) => a.order - b.order);
      statusCards.splice(idx, 0, card);
      statusCards.forEach((c, i) => (c.order = i));
    });
    toast("Moved to " + st);
  }

  function dropDate(e, dateKey) {
    e.preventDefault();
    const id = getDragId(e);
    endDrag(id);
    mutate(d => { const c = d.cards.find(x => x.id === id); if (c) c.date = dateKey; });
    toast("Scheduled for " + dateKey);
  }

  function dropUnschedule(e) {
    e.preventDefault();
    const id = getDragId(e);
    endDrag(id);
    mutate(d => { const c = d.cards.find(x => x.id === id); if (c) c.date = ""; });
    toast("Unscheduled");
  }

  /* ── Cards / Cats ── */
  function addCard(catId, defaultStatus) {
    const id = uid("n");
    mutate(d => {
      const maxOrder = d.cards.filter(c => c.cat === catId).reduce((m, c) => Math.max(m, c.order), -1);
      d.cards.push({
        id, cat: catId, ref: "New", title: "Untitled idea", script: "", order: maxOrder + 1,
        status: defaultStatus || "Ideas", scenes: [], caption: "", notes: "", date: "", time: "",
        format: "Reel", client: "", creator: "", platform: "Instagram", priority: "Normal",
        tags: [], links: [], metrics: {}, locked: false,
      });
    });
    openCard(id);
    setTimeout(() => { if (titleRef.current) titleRef.current.select(); }, 320);
  }

  /* ── Drawer ── */
  function openCard(id) {
    clearTimeout(closeTimer.current);
    setDrawerMode("card"); setOpenId(id);
    requestAnimationFrame(() => setDrawerOn(true));
  }
  function openSeries(id) {
    clearTimeout(closeTimer.current);
    setDrawerMode("series"); setOpenId(id);
    requestAnimationFrame(() => setDrawerOn(true));
  }
  function openFormula(id) {
    clearTimeout(closeTimer.current);
    setDrawerMode("formula"); setOpenId(id);
    requestAnimationFrame(() => setDrawerOn(true));
  }
  function closeDrawer() {
    setDrawerOn(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), 280);
  }

  const openCardObj    = openId && drawerMode === "card"    ? cardById(openId)    : null;
  const openSeriesObj  = openId && drawerMode === "series"  ? seriesById(openId)  : null;
  const openFormulaObj = openId && drawerMode === "formula" ? state.formulas.find(f => f.id === openId) : null;

  /* ── Card/Series mutations ── */
  function patchCard(id, patch) {
    mutate(d => { const c = d.cards.find(x => x.id === id); if (c) Object.assign(c, patch); });
  }
  function patchSeries(id, patch) {
    mutate(d => { const s = d.series.find(x => x.id === id); if (s) Object.assign(s, patch); });
  }
  function deleteCard(id) {
    closeDrawer();
    setTimeout(() => mutate(d => { d.cards = d.cards.filter(c => c.id !== id); }), 280);
    toast("Idea deleted");
  }

  /* ── Import / Export ── */
  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "coachdata-content-desk.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Backup exported");
  }
  function onImportFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        if (!p.cards || !p.cats) throw new Error("shape");
        setState(normalize(p));
        toast("Imported " + p.cards.length + " ideas");
      } catch { toast("That file isn't a Content Desk export"); }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  /* ── Sort ── */
  function sortValue(c, k) {
    if (k === "cat") { const ct = catById(c.cat); return ct ? ct.name : ""; }
    return c[k] || "";
  }
  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(1); }
  }

  /* ══════════════════════════════════════════
     VIEWS
  ══════════════════════════════════════════ */

  /* ── PILLARS ── */
  const renderBoardView = () => {
    return (
      <main className="cd-board">
        {state.cats.map(cat => {
          const cards = state.cards.filter(c => c.cat === cat.id).filter(matchesFilter).sort((a, b) => a.order - b.order);
          const dotColor = `hsl(${cat.hue || 152}, 40%, 50%)`;
          return (
            <section
              key={cat.id}
              className={"cd-col" + (overKey === cat.id ? " drag-over" : "")}
              onDragOver={e => { e.preventDefault(); if (overKey !== cat.id) setOverKey(cat.id); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverKey(null); }}
              onDrop={e => dropBoard(e, cat.id)}
            >
              <div className="cd-col-head">
                <span className="cd-col-dot" style={{ background: dotColor }} />
                <span className="cd-col-name">{cat.name}</span>
                <span className="cd-col-count">{cards.length}</span>
              </div>
              <div className="cd-col-cards">
                {cards.map(card => (
                  <div
                    key={card.id}
                    data-cd-id={card.id}
                    className={"cd-card" + (draggingId === card.id ? " dragging" : "")}
                    draggable
                    onDragStart={e => startDrag(e, card.id)}
                    onDragEnd={() => endDrag(card.id)}
                    onClick={() => openCard(card.id)}
                  >
                    <div className="cd-card-badges">
                      <span className="cd-badge cd-badge-cat" style={{ borderColor: dotColor + "55", color: dotColor }}>{cat.name}</span>
                      {card.priority !== "Normal" && <span className={priorityClass(card.priority)}>{card.priority}</span>}
                    </div>
                    <div className="cd-card-title">{card.title}</div>
                    {card.notes && <div className="cd-card-note">{card.notes}</div>}
                    <div className="cd-card-footer">
                      <span className="cd-card-format">{card.format}</span>
                      <span className="cd-card-footer-spacer" />
                      <span className={statusClass(card.status)}>{card.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="cd-col-add" onClick={() => addCard(cat.id)}>+ Add idea</button>
            </section>
          );
        })}
      </main>
    );
  }

  /* ── STATUS ── */
  const renderStatusView = () => {
    const defs = [
      { k: "client",   label: "Client",   opts: uniqueValues(c => c.client) },
      { k: "platform", label: "Platform", opts: uniqueValues(c => c.platform) },
      { k: "cat",      label: "Pillar",   opts: state.cats.map(x => x.name) },
      { k: "creator",  label: "Creator",  opts: uniqueValues(c => c.creator) },
      { k: "priority", label: "Priority", opts: PRIORITIES },
      { k: "tag",      label: "Tag",      opts: uniqueValues(c => c.tags) },
    ];
    const any = Object.values(kanFilters).some(v => v);
    return (
      <section className="cd-statuswrap">
        <div className="cd-filters">
          {defs.map(def => (
            <select key={def.k} className="cd-filter-select"
              value={kanFilters[def.k]}
              onChange={e => setKanFilters(f => ({ ...f, [def.k]: e.target.value }))}>
              <option value="">{def.label}</option>
              {def.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {any && <button className="cd-btn cd-btn-ghost" onClick={() => setKanFilters({ client: "", platform: "", cat: "", creator: "", priority: "", tag: "" })}>Clear</button>}
        </div>
        <div className="cd-status-board">
          {STATUSES.map(st => {
            const cards = state.cards.filter(c => c.status === st).filter(matchesFilter).filter(passesFilters).sort((a, b) => a.order - b.order);
            return (
              <section
                key={st}
                className={"cd-col" + (overKey === st ? " drag-over" : "")}
                onDragOver={e => { e.preventDefault(); if (overKey !== st) setOverKey(st); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverKey(null); }}
                onDrop={e => dropStatus(e, st)}
              >
                <div className="cd-col-head">
                  <span className="cd-col-name">{st}</span>
                  <span className="cd-col-count">{cards.length}</span>
                </div>
                <div className="cd-col-cards">
                  {cards.map(card => {
                    const cat = catById(card.cat);
                    const dotColor = cat ? `hsl(${cat.hue || 152}, 40%, 50%)` : "var(--accent)";
                    return (
                      <div
                        key={card.id}
                        data-cd-id={card.id}
                        className={"cd-card" + (draggingId === card.id ? " dragging" : "")}
                        draggable
                        onDragStart={e => startDrag(e, card.id)}
                        onDragEnd={() => endDrag(card.id)}
                        onClick={() => openCard(card.id)}
                      >
                        <div className="cd-card-badges">
                          {cat && <span className="cd-badge cd-badge-cat" style={{ borderColor: dotColor + "55", color: dotColor }}>{cat.name}</span>}
                          {card.priority !== "Normal" && <span className={priorityClass(card.priority)}>{card.priority}</span>}
                        </div>
                        <div className="cd-card-title">{card.title}</div>
                        {card.notes && <div className="cd-card-note">{card.notes}</div>}
                        <div className="cd-card-footer">
                          <span className="cd-card-format">{card.format}</span>
                          <span className="cd-card-footer-spacer" />
                          <span className="cd-card-platform">{card.platform}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="cd-col-add" onClick={() => {
                  const id = uid("n");
                  const catId = state.cats[0]?.id || "";
                  mutate(d => d.cards.push({ id, cat: catId, ref: "New", title: "Untitled", script: "", order: 999, status: st, scenes: [], caption: "", notes: "", date: "", time: "", format: "Reel", client: "", creator: "", platform: "Instagram", priority: "Normal", tags: [], links: [], metrics: {}, locked: false }));
                  openCard(id);
                }}>+ Add idea</button>
              </section>
            );
          })}
        </div>
      </section>
    );
  }

  /* ── TABLE ── */
  const renderTableView = () => {
    const COLS = [
      { k: "idx",      label: "#",        sortable: false, w: "44px" },
      { k: "title",    label: "Idea",     sortable: true,  w: "28%" },
      { k: "format",   label: "Format",   sortable: true,  w: "100px" },
      { k: "status",   label: "Status",   sortable: true,  w: "150px" },
      { k: "date",     label: "Date",     sortable: true,  w: "105px" },
      { k: "priority", label: "Priority", sortable: true,  w: "100px" },
      { k: "platform", label: "Platform", sortable: true,  w: "110px" },
      { k: "cat",      label: "Pillar",   sortable: true,  w: "150px" },
    ];
    const rows = state.cards.filter(matchesFilter).slice().sort((a, b) => {
      const va = sortValue(a, sortKey), vb = sortValue(b, sortKey);
      if (va < vb) return -1 * sortDir;
      if (va > vb) return  1 * sortDir;
      return 0;
    });
    return (
      <section className="cd-tablewrap">
        <div className="cd-table-scroll">
          <table className="cd-table">
            <thead>
              <tr>
                {COLS.map(col => (
                  <th key={col.k} style={{ width: col.w }} onClick={() => col.sortable && toggleSort(col.k)}>
                    {col.label}
                    {col.sortable && sortKey === col.k && <span className="cd-sort-arrow">{sortDir === 1 ? " ↑" : " ↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((card, i) => {
                const cat = catById(card.cat);
                return (
                  <tr key={card.id} onClick={() => openCard(card.id)}>
                    <td className="cd-table-idx">{i + 1}</td>
                    <td className="cd-table-title">{card.title}</td>
                    <td>{card.format}</td>
                    <td><span className={statusClass(card.status)}>{card.status}</span></td>
                    <td>{card.date || "—"}</td>
                    <td><span className={priorityClass(card.priority)}>{card.priority}</span></td>
                    <td>{card.platform}</td>
                    <td>{cat ? cat.name : "—"}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={COLS.length} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No ideas match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  /* ── CALENDAR ── */
  const renderCalendarView = () => {
    const { y: calY, m: calM } = calYM;
    const lead  = (new Date(calY, calM, 1).getDay() + 6) % 7;
    const days  = new Date(calY, calM + 1, 0).getDate();
    const today = todayISO();
    const unsched = state.cards.filter(c => !c.date).filter(matchesFilter);

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(iso(calY, calM, d));

    return (
      <div className="cd-calwrap">
        <div className="cd-cal-main">
          <div className="cd-cal-nav">
            <span className="cd-cal-month">{MONTHS[calM]} {calY}</span>
            <div className="cd-cal-nav-btns">
              <button className="cd-cal-btn-cap" onClick={() => setCalYM(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}>{t.previous || 'ANTERIOR'}</button>
              <button className="cd-cal-btn-cap active" onClick={() => { const d = new Date(); setCalYM({ y: d.getFullYear(), m: d.getMonth() }); }}>{t.today || 'HOY'}</button>
              <button className="cd-cal-btn-cap" onClick={() => setCalYM(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}>{t.next || 'SIGUIENTE'}</button>
            </div>
          </div>
          <div className="cd-cal-grid">
            {DOWS.map(d => <div key={d} className="cd-cal-dow">{d}</div>)}
            {cells.map((dateKey, i) => {
              if (!dateKey) return <div key={"e" + i} className="cd-cal-cell empty" />;
              const dayCards = state.cards.filter(c => c.date === dateKey).filter(matchesFilter);
              return (
                <div
                  key={dateKey}
                  className={"cd-cal-cell" + (dateKey === today ? " today" : "") + (overKey === dateKey ? " drag-over" : "")}
                  onDragOver={e => { e.preventDefault(); if (overKey !== dateKey) setOverKey(dateKey); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverKey(null); }}
                  onDrop={e => dropDate(e, dateKey)}
                >
                  <span className="cd-cal-day">{parseInt(dateKey.split("-")[2], 10)}</span>
                  {dayCards.map(c => {
                    const cat = catById(c.cat);
                    const dotColor = cat ? `hsl(${cat.hue || 152}, 40%, 50%)` : "var(--accent)";
                    return (
                      <span key={c.id} className="cd-cal-chip" draggable
                        onDragStart={e => startDrag(e, c.id)} onDragEnd={() => endDrag(c.id)}
                        onClick={e => { e.stopPropagation(); openCard(c.id); }}>
                        <span className="cd-cal-chip-dot" style={{ backgroundColor: dotColor }} />
                        <span className="cd-cal-chip-title">{c.title}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="cd-cal-sidebar">
          <div className="cd-cal-sidebar-title">
            <span>NOT SCHEDULED</span>
            <span className="cd-cal-sidebar-count">{unsched.length}</span>
          </div>
          <div className="cd-cal-unscheduled"
            onDragOver={e => { e.preventDefault(); if (overKey !== "__unsched") setOverKey("__unsched"); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverKey(null); }}
            onDrop={dropUnschedule}>
            {unsched.length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 2px", display: "block" }}>All ideas are scheduled.</span>}
            {unsched.map(c => (
              <div key={c.id} className="cd-cal-unsched-card" draggable
                onDragStart={e => startDrag(e, c.id)} onDragEnd={() => endDrag(c.id)}
                onClick={() => openCard(c.id)}>
                <div className="cd-cal-unsched-title">{c.title}</div>
                <div className="cd-cal-unsched-status">
                  <span className={statusClass(c.status)}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  function tile(val, label, sub) {
    return (
      <div className="cd-tile" key={label}>
        <div className="cd-tile-n">{val}</div>
        <div className="cd-tile-l">{label}</div>
        {sub && <div className="cd-tile-sub">{sub}</div>}
      </div>
    );
  }

  function takeaway(text) {
    return <div className="cd-widget-takeaway">{text}</div>;
  }

  function groupTotals(rows, keyOf) {
    const map = {};
    rows.forEach(r => {
      const k = keyOf(r); if (!k) return;
      if (!map[k]) map[k] = { key: k, n: 0, totalPickup: 0 };
      map[k].n++; map[k].totalPickup += r.pickup || 0;
    });
    return Object.values(map).map(g => ({ ...g, pickup: g.n ? g.totalPickup / g.n : 0 })).sort((a, b) => b.pickup - a.pickup);
  }

  function rankList(rows, fn) {
    return (
      <div className="cd-rank-list">
        {rows.map((r, i) => {
          const info = fn(r);
          return (
            <div className="cd-rank-row" key={i}>
              <span className="cd-rank-n">{i + 1}</span>
              <span className="cd-rank-label">{info.sub || r.card?.title || ""}</span>
              <span className="cd-rank-val">{info.main}</span>
              {info.unit && <span className="cd-rank-unit">{info.unit}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function groupBars(rows, keyOf) {
    const g = groupTotals(rows, keyOf);
    if (!g.length) return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No data yet.</div>;
    const max = g[0].pickup;
    return (
      <div className="cd-bar-group">
        {g.slice(0, 8).map(item => (
          <div className="cd-bar-row" key={item.key}>
            <span className="cd-bar-key">{item.key}</span>
            <div className="cd-bar-track"><div className="cd-bar-fill" style={{ width: max > 0 ? Math.max(4, item.pickup / max * 100) + "%" : "4%" }} /></div>
            <span className="cd-bar-pct">{item.pickup.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  }

  function widget(title, chart, note) {
    return (
      <div className="cd-widget" key={title}>
        <div className="cd-widget-title">{title}</div>
        {chart}
        {note}
      </div>
    );
  }

  const renderDashboardView = () => {
    const realRows = state.cards.filter(c => {
      const m = c.metrics || {};
      return Object.values(m).some(v => parseFloat(v) > 0);
    }).map(c => ({ card: c, m: Object.fromEntries(Object.entries(c.metrics || {}).map(([k, v]) => [k, num(v)])) }));

    const rows = sampleOn ? sampleRows : realRows;

    const banner = (
      <div className="cd-dash-banner">
        <span>{sampleOn
          ? <><strong>Preview mode — sample numbers.</strong> Nothing here is saved.</>
          : "Showing only the numbers you've entered on each idea card."}</span>
        <button className="cd-btn cd-btn-ghost" onClick={() => setSampleOn(v => !v)}>
          {sampleOn ? "Show my real numbers" : "Preview with sample numbers"}
        </button>
      </div>
    );

    if (!rows.length) return (
      <div className="cd-dashwrap">
        {banner}
        <div className="cd-empty-state">
          <strong>No numbers yet</strong>
          Open any idea card and fill in the Performance fields.
        </div>
      </div>
    );

    const tot = { views: 0, reach: 0, saves: 0, shares: 0, comments: 0, likes: 0, follows: 0, replays: 0, visits: 0, clicks: 0 };
    rows.forEach(r => { Object.keys(tot).forEach(k => { tot[k] += r.m[k] || 0; }); });
    const pickup = tot.reach ? (tot.saves + tot.shares) / tot.reach * 100 : 0;
    rows.forEach(r => { r.pickup = r.m.reach ? (r.m.saves + r.m.shares) / r.m.reach * 100 : 0; });
    const ranked = rows.slice().sort((a, b) => b.pickup - a.pickup);
    const avgNonFol = mean(rows.map(r => r.m.nonfollow).filter(Boolean));
    const engage    = tot.reach ? (tot.likes + tot.comments + tot.saves + tot.shares) / tot.reach * 100 : 0;
    const followRt  = tot.reach ? tot.follows / tot.reach * 1000 : 0;
    const visitRt   = tot.reach ? tot.visits / tot.reach * 100 : 0;
    const convRt    = tot.visits ? tot.follows / tot.visits * 100 : 0;
    const replayRt  = tot.views ? tot.replays / tot.views * 100 : 0;
    const catKey    = r => { const cat = catById(r.card.cat); return cat ? cat.name : "Uncategorised"; };

    // Compute new metrics for the extended dashboard widgets
    const underperforming = rows.slice()
      .filter(r => r.pickup > 0)
      .sort((a, b) => a.pickup - b.pickup)
      .slice(0, 5);

    const conversionList = rows.slice()
      .filter(r => r.m.visits > 0)
      .sort((a, b) => (b.m.follows / b.m.visits) - (a.m.follows / a.m.visits))
      .slice(0, 5);

    const replayList = rows.slice()
      .filter(r => r.m.replays > 0)
      .sort((a, b) => b.m.replays - a.m.replays)
      .slice(0, 5);

    // Consistency calculations
    const datedPosts = rows.filter(r => r.card.date);
    const postsDatedCount = datedPosts.length;
    let postsPerWeek = "0.0";
    let longestGap = "—";
    
    if (postsDatedCount > 0) {
      const dates = datedPosts.map(r => new Date(r.card.date).getTime()).sort((a, b) => a - b);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const totalWeeks = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 7)));
      postsPerWeek = (postsDatedCount / totalWeeks).toFixed(1);
      
      let maxGapDays = 0;
      for (let i = 1; i < dates.length; i++) {
        const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff > maxGapDays) maxGapDays = Math.round(diff);
      }
      longestGap = maxGapDays > 0 ? `${maxGapDays}d` : "—";
    }

    // Helper for rendering post lists with detail rows
    function renderPostList(posts, type) {
      if (!posts.length) return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No data yet.</div>;
      return (
        <div className="cd-post-list">
          {posts.map((r, i) => {
            const c = r.card;
            const m = r.m;
            const cat = catById(c.cat);
            const catName = cat ? cat.name : "Uncategorised";
            
            let rightVal = "";
            let rightLbl = "";
            if (type === "pickup") {
              rightVal = `${r.pickup.toFixed(1)}%`;
              rightLbl = "PICKUP";
            } else if (type === "views") {
              rightVal = fmtNum(m.views);
              rightLbl = "VIEWS";
            } else if (type === "replays") {
              rightVal = fmtNum(m.replays);
              rightLbl = "REPLAYS";
            } else if (type === "visits") {
              const val = m.visits ? (m.follows / m.visits * 100).toFixed(0) : "0";
              rightVal = `${val}%`;
              rightLbl = "OF VISITS";
            }
            
            const format = c.format || "Reel";
            const watchTime = m.watchtime ? `${m.watchtime.toFixed(1)}s watched` : null;
            const retention = m.retention ? `${m.retention.toFixed(0)}% retained` : null;
            
            return (
              <div className="cd-post-row" key={c.id}>
                <div className="cd-post-idx">{String(i + 1).padStart(2, '0')}</div>
                <div className="cd-post-content">
                  <div className="cd-post-title">{c.title}</div>
                  {c.script && <div className="cd-post-desc">{c.script.slice(0, 120)}{c.script.length > 120 ? "..." : ""}</div>}
                  <div className="cd-post-badges">
                    <span className="cd-post-badge-fmt">{format.toUpperCase()}</span>
                    <span className="cd-post-badge-cat">{catName}</span>
                    {watchTime && <span className="cd-post-badge-metric">{watchTime}</span>}
                    {retention && <span className="cd-post-badge-metric">{retention}</span>}
                  </div>
                </div>
                <div className="cd-post-metric-wrap">
                  <div className="cd-post-metric-val">{rightVal}</div>
                  <div className="cd-post-metric-lbl">{rightLbl}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Helper for rendering nonfollower reach progress bars
    function groupNonfollowBars(rows, keyOf) {
      const map = {};
      rows.forEach(r => {
        const k = keyOf(r);
        if (!map[k]) map[k] = { key: k, total: 0, count: 0 };
        if (r.m.nonfollow) {
          map[k].total += r.m.nonfollow;
          map[k].count += 1;
        }
      });
      const g = Object.values(map)
        .map(item => ({ key: item.key, val: item.count ? item.total / item.count : 0, count: item.count }))
        .sort((a, b) => b.val - a.val);

      if (!g.length) return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No data yet.</div>;
      return (
        <div className="cd-bar-group">
          {g.map(item => (
            <div className="cd-bar-row" key={item.key}>
              <span className="cd-bar-key">{item.key} <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.75rem" }}>{item.count} posts</span></span>
              <div className="cd-bar-track"><div className="cd-bar-fill" style={{ width: `${item.val}%` }} /></div>
              <span className="cd-bar-pct">{item.val.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="cd-dashwrap">
        {banner}

        {/* 1. WHAT IS WORKING */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">What is working</div>
          <div className="cd-hero">
            <div>
              <div className="cd-hero-n">{pickup.toFixed(1)}%</div>
              <div className="cd-hero-l">{t("pickup_rate_label")}</div>
              <div className="cd-hero-sub">{t("pickup_rate_desc")}</div>
            </div>
            <div className="cd-tiles">
              {tile(engage ? engage.toFixed(1) + "%" : "—", t("engagement_rate"), "All reactions over reach")}
              {tile(avgNonFol ? avgNonFol.toFixed(0) + "%" : "—", t("non_follower_reach"), "")}
              {tile(followRt ? followRt.toFixed(1) : "—", t("follows_per_1k"), "")}
              {tile(convRt ? convRt.toFixed(1) + "%" : "—", t("visit_to_follow"), "")}
              {tile(replayRt ? replayRt.toFixed(0) + "%" : "—", t("replay_rate"), "")}
              {tile(visitRt ? visitRt.toFixed(1) + "%" : "—", t("profile_visit_rate"), "")}
              {tile(fmtNum(tot.saves), t("saves"), "")}
              {tile(fmtNum(tot.shares), t("shares"), "")}
              {tile(fmtNum(tot.views), t("views"), rows.length + " " + t("posts"))}
            </div>
          </div>
        </div>

        {/* 2. BEST HOOKS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Best hooks</div>
          {widget(
            "Best hooks",
            renderPostList(ranked.slice(0, 5), "pickup"),
            ranked[0] && (
              <div className="cd-insight-box">
                "{ranked[0].card.title}" sits at {ranked[0].pickup.toFixed(1)}% pickup. Great hook! Let's replicate this style in future posts.
              </div>
            )
          )}
        </div>

        {/* 3. BEST CONTENT PILLARS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Best content pillars</div>
          {widget(
            "Best content pillars",
            groupBars(rows, catKey),
            rows.length > 0 && (
              <div className="cd-insight-box">
                Pillars performance average is computed dynamically. Adjust content volume towards higher pickup topics.
              </div>
            )
          )}
        </div>

        {/* 4. BEST FORMATS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Best formats</div>
          {widget(
            "Best formats",
            groupBars(rows, r => r.card.format || "Unset"),
            ""
          )}
        </div>

        {/* 5. TOP PERFORMING POSTS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Top performing posts</div>
          {widget(
            "Top performing posts",
            renderPostList(ranked.slice(0, 5), "views"),
            ranked[0] && (
              <div className="cd-insight-box">
                "{ranked[0].card.title}" is doing the most work at {fmtNum(ranked[0].m.views)} views. It is the obvious candidate to cut differently and post again.
              </div>
            )
          )}
        </div>

        {/* 6. UNDERPERFORMING POSTS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Underperforming posts</div>
          {widget(
            "Underperforming posts",
            renderPostList(underperforming, "pickup"),
            underperforming[0] && (
              <div className="cd-insight-box">
                "{underperforming[0].card.title}" sits at {underperforming[0].pickup.toFixed(1)}% against your {pickup.toFixed(1)}% average. Before rewriting it, check the first three seconds: low pickup with normal reach usually means the opener, not the idea.
              </div>
            )
          )}
        </div>

        {/* 7. REACHING NEW PEOPLE */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Reaching new people</div>
          {widget(
            "Reaching new people",
            groupNonfollowBars(rows, catKey),
            avgNonFol > 0 && (
              <div className="cd-insight-box">
                {avgNonFol.toFixed(0)}% of your reach is people who do not follow you. That is distribution working: the algorithm is pushing this out, so volume is your lever right now.
              </div>
            )
          )}
        </div>

        {/* 8. TURNING VIEWS INTO FOLLOWS */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Turning views into follows</div>
          {widget(
            "Turning views into follows",
            renderPostList(conversionList, "visits"),
            ""
          )}
        </div>

        {/* 9. MOST REPLAYED */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Most replayed</div>
          {widget(
            "Most replayed",
            renderPostList(replayList, "replays"),
            replayRt > 0 && (
              <div className="cd-insight-box">
                Replays sit at {replayRt.toFixed(0)}% of views. Low replay usually means the payoff lands too late. Try moving the turn earlier in the edit.
              </div>
            )
          )}
        </div>

        {/* 10. BEST DAYS TO POST */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Best days to post</div>
          {widget(
            "Best days to post",
            groupBars(rows, r => {
              if (!r.card.date) return "Unscheduled";
              const dayIndex = new Date(r.card.date).getDay();
              const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              return daysMap[dayIndex];
            }),
            ""
          )}
        </div>

        {/* 11. BEST TIMES TO POST */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Best times to post</div>
          {widget(
            "Best times to post",
            rows.filter(r => r.card.time).length < 2 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "16px 0", textAlign: "center" }}>
                Add publish times to at least two posts.
              </div>
            ) : (
              groupBars(rows, r => r.card.time ? r.card.time.slice(0, 2) + ":00" : "Unset")
            ),
            <div className="cd-insight-box">
              Not enough posts have a publish time yet. Fill the time field in as you schedule and this becomes usable within a few weeks.
            </div>
          )}
        </div>

        {/* 12. POSTING CONSISTENCY */}
        <div className="cd-dash-section">
          <div className="cd-dash-section-title">Posting consistency</div>
          {widget(
            "Posting consistency",
            <div className="cd-tiles">
              {tile(postsPerWeek, "Posts per week", "")}
              {tile(postsDatedCount, "Posts dated", `over ${postsDatedCount > 0 ? Math.ceil(postsDatedCount / 2.4) : 0} weeks`)}
              {tile(longestGap, "Longest gap", "")}
            </div>,
            <div className="cd-insight-box">
              You are posting {postsPerWeek} times a week. Steady, and the most useful lever right now is consistency rather than volume.
            </div>
          )}
        </div>

      </div>
    );
  }

  /* ── PLAYBOOK ── */
  const renderPlaybookView = () => {
    return (
      <div className="cd-playbookwrap">
        <div className="cd-playbook-section">
          <div className="cd-playbook-head">
            <span className="cd-playbook-head-title">{t("hook_formulas")}</span>
            <button className="cd-btn cd-btn-ghost" onClick={() => {
              const name = window.prompt(t("formula_name_prompt"));
              if (!name) return;
              const id = uid("f");
              mutate(d => d.formulas.push({ id, name: name.trim(), summary: "", steps: [] }));
              openFormula(id);
            }}>{t("new_formula")}</button>
          </div>
          <div className="cd-playbook-list">
            {state.formulas.map(f => (
              <div key={f.id} className="cd-formula-card" onClick={() => openFormula(f.id)}>
                <div className="cd-formula-name">{f.name}</div>
                {f.summary && <div className="cd-formula-summary">{f.summary}</div>}
                <div className="cd-formula-steps">
                  {f.steps.map((step, i) => (
                    <div className="cd-formula-step" key={i}>
                      <span className="cd-formula-step-label">{step.label}</span>
                      <span className="cd-formula-step-text">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!state.formulas.length && (
              <div className="cd-empty-state">
                <strong>{t("no_formulas_title")}</strong>
                {t("no_formulas_desc")}
              </div>
            )}
          </div>
        </div>
        <div className="cd-playbook-section">
          <div className="cd-playbook-head">
            <span className="cd-playbook-head-title">{t("content_series")}</span>
            <button className="cd-btn cd-btn-ghost" onClick={() => {
              const name = window.prompt(t("series_name_prompt"));
              if (!name) return;
              const id = uid("s");
              mutate(d => d.series.push({ id, name: name.trim(), cadence: "", what: "", editing: "", hooks: "", visuals: "", notes: "", links: [] }));
              openSeries(id);
            }}>{t("new_series")}</button>
          </div>
          <div className="cd-playbook-list">
            {state.series.map(s => (
              <div key={s.id} className="cd-series-card" onClick={() => openSeries(s.id)}>
                <div className="cd-series-name">{s.name}</div>
                {s.cadence && <div className="cd-series-cadence">{s.cadence}</div>}
                {s.what && <div className="cd-series-what">{s.what}</div>}
              </div>
            ))}
            {!state.series.length && (
              <div className="cd-empty-state">
                <strong>{t("no_series_title")}</strong>
                {t("no_series_desc")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     DRAWERS
  ══════════════════════════════════════════ */
  function CardDrawer({ card }) {
    return (
      <div className="cd-drawer-body">
        <div className="cd-field">
          <input ref={titleRef} className="cd-drawer-title-input"
            value={card.title} onChange={e => patchCard(card.id, { title: e.target.value })}
            placeholder="Idea title" />
        </div>
        <div className="cd-field-row">
          <div className="cd-field">
            <label className="cd-field-label">{t("reference")}</label>
            <input type="text" value={card.ref || ""} onChange={e => patchCard(card.id, { ref: e.target.value })} />
          </div>
          <div className="cd-field">
            <label className="cd-field-label">{t("status_label")}</label>
            <select value={card.status} onChange={e => patchCard(card.id, { status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{translateStatus(s, lang)}</option>)}
            </select>
          </div>
        </div>
        <div className="cd-field-row-3">
          <div className="cd-field">
            <label className="cd-field-label">{t("format_label")}</label>
            <select value={card.format} onChange={e => patchCard(card.id, { format: e.target.value })}>
              {FORMATS.map(f => <option key={f} value={f}>{translateFormat(f, lang)}</option>)}
            </select>
          </div>
          <div className="cd-field">
            <label className="cd-field-label">{t("platform_label")}</label>
            <select value={card.platform} onChange={e => patchCard(card.id, { platform: e.target.value })}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="cd-field">
            <label className="cd-field-label">{t("priority_label")}</label>
            <select value={card.priority} onChange={e => patchCard(card.id, { priority: e.target.value })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{translatePriority(p, lang)}</option>)}
            </select>
          </div>
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t("pillar_label")}</label>
          <select value={card.cat} onChange={e => patchCard(card.id, { cat: e.target.value })}>
            {state.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="cd-field-row">
          <div className="cd-field">
            <label className="cd-field-label">{t("publish_date")}</label>
            <input type="date" value={card.date} onChange={e => patchCard(card.id, { date: e.target.value })} />
          </div>
          <div className="cd-field">
            <label className="cd-field-label">{t("time_label")}</label>
            <input type="time" value={card.time} onChange={e => patchCard(card.id, { time: e.target.value })} />
          </div>
        </div>
        <div className="cd-field-row">
          <div className="cd-field">
            <label className="cd-field-label">{t("client_label")}</label>
            <input type="text" value={card.client || ""} onChange={e => patchCard(card.id, { client: e.target.value })} placeholder="Client name" />
          </div>
          <div className="cd-field">
            <label className="cd-field-label">{t("creator_label")}</label>
            <input type="text" value={card.creator || ""} onChange={e => patchCard(card.id, { creator: e.target.value })} placeholder="Creator / editor" />
          </div>
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t("hook_script")}</label>
          <textarea value={card.script || ""} onChange={e => patchCard(card.id, { script: e.target.value })} placeholder="Opening hook or full script…" />
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t("caption_label")}</label>
          <textarea value={card.caption || ""} onChange={e => patchCard(card.id, { caption: e.target.value })} placeholder="Post caption…" />
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t("notes_label")}</label>
          <textarea value={card.notes || ""} onChange={e => patchCard(card.id, { notes: e.target.value })} placeholder="Production notes…" />
        </div>
        <div className="cd-field">
          <label className="cd-field-label">Scenes / Shots</label>
          <div className="cd-scenes">
            {(card.scenes || []).map((sc, i) => (
              <div className="cd-scene-row" key={i}>
                <input type="text" value={sc} placeholder={"Scene " + (i + 1)}
                  onChange={e => { const next = [...(card.scenes || [])]; next[i] = e.target.value; patchCard(card.id, { scenes: next }); }} />
                <button className="cd-scene-del" onClick={() => patchCard(card.id, { scenes: (card.scenes || []).filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="cd-btn cd-btn-ghost" style={{ alignSelf: "flex-start" }}
              onClick={() => patchCard(card.id, { scenes: [...(card.scenes || []), ""] })}>+ Add scene</button>
          </div>
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t.tags || 'Tags'}</label>
          <div className="cd-tags">
            {(card.tags || []).map(tag => (
              <span key={tag} className="cd-tag">
                {tag}
                <button className="cd-tag-remove" onClick={() => patchCard(card.id, { tags: card.tags.filter(t => t !== tag) })}>×</button>
              </span>
            ))}
            <input
              style={{ border: "1px dashed var(--border)", borderRadius: "999px", padding: "3px 10px", background: "transparent", color: "var(--input-color)", fontFamily: "var(--font)", fontSize: 12, outline: "none", width: 90 }}
              placeholder="+ tag"
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === ",") && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  const tag = e.currentTarget.value.trim().replace(/,/g, "");
                  if (!card.tags.includes(tag)) patchCard(card.id, { tags: [...card.tags, tag] });
                  e.currentTarget.value = "";
                }
              }} />
          </div>
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t.performance || 'Performance'}</label>
          <div className="cd-metrics-grid">
            {METRICS.map(m => (
              <div className="cd-metric-field" key={m.k}>
                <label>{m.l}</label>
                <input type="number" value={card.metrics?.[m.k] || ""} placeholder="—"
                  onChange={e => patchCard(card.id, { metrics: { ...(card.metrics || {}), [m.k]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <button className="cd-btn" style={{ background: "var(--danger)", borderRadius: "var(--radius-sm)" }}
            onClick={async () => { if (await askConfirm({ message: "Delete this idea?", confirmLabel: "Delete", danger: true })) deleteCard(card.id); }}>
            Delete idea
          </button>
        </div>
      </div>
    );
  }

  function SeriesDrawer({ series }) {
    return (
      <div className="cd-drawer-body">
        <div className="cd-field">
          <input className="cd-drawer-title-input" value={series.name}
            onChange={e => patchSeries(series.id, { name: e.target.value })} placeholder="Series name" />
        </div>
        {[
          { k: "cadence", l: "Cadence", ph: "Weekly / Bi-weekly / Monthly…" },
          { k: "what",    l: "What it is", ph: "Describe this series…" },
          { k: "hooks",   l: "Hooks", ph: "Opening formula or hook pattern…" },
          { k: "editing", l: "Editing notes", ph: "Editing style, pacing, cuts…" },
          { k: "visuals", l: "Visuals", ph: "Camera style, locations, B-roll…" },
          { k: "notes",   l: "Notes", ph: "Any other notes…" },
        ].map(({ k, l, ph }) => (
          <div className="cd-field" key={k}>
            <label className="cd-field-label">{l}</label>
            {k === "cadence"
              ? <input value={series[k] || ""} onChange={e => patchSeries(series.id, { [k]: e.target.value })} placeholder={ph} />
              : <textarea value={series[k] || ""} onChange={e => patchSeries(series.id, { [k]: e.target.value })} placeholder={ph} />}
          </div>
        ))}
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <button className="cd-btn" style={{ background: "var(--danger)", borderRadius: "var(--radius-sm)" }}
            onClick={async () => { if (await askConfirm({ message: "Delete this series?", confirmLabel: "Delete", danger: true })) { closeDrawer(); setTimeout(() => mutate(d => { d.series = d.series.filter(x => x.id !== series.id); }), 280); } }}>
            Delete series
          </button>
        </div>
      </div>
    );
  }

  function FormulaDrawer({ formula }) {
    return (
      <div className="cd-drawer-body">
        <div className="cd-field">
          <input className="cd-drawer-title-input" value={formula.name}
            onChange={e => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.name = e.target.value; })}
            placeholder="Formula name" />
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t.summary || 'Summary'}</label>
          <textarea value={formula.summary || ""}
            onChange={e => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.summary = e.target.value; })}
            placeholder="When to use this formula…" />
        </div>
        <div className="cd-field">
          <label className="cd-field-label">{t.steps || 'Steps'}</label>
          <div className="cd-scenes">
            {(formula.steps || []).map((step, i) => (
              <div key={step.id || i} style={{ display: "flex", gap: 7, marginBottom: 5 }}>
                <input style={{ width: 90, padding: "6px 9px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--input-bg)", color: "var(--input-color)", fontFamily: "var(--font)", fontSize: 12, fontWeight: 700, outline: "none" }}
                  value={step.label} placeholder="Label"
                  onChange={e => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.steps[i] = { ...f.steps[i], label: e.target.value }; })} />
                <input style={{ flex: 1, padding: "6px 9px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--input-bg)", color: "var(--input-color)", fontFamily: "var(--font)", fontSize: 12, outline: "none" }}
                  value={step.text} placeholder="Step description"
                  onChange={e => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.steps[i] = { ...f.steps[i], text: e.target.value }; })} />
                <button className="cd-scene-del" onClick={() => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.steps.splice(i, 1); })}>×</button>
              </div>
            ))}
            <button className="cd-btn cd-btn-ghost" style={{ alignSelf: "flex-start" }}
              onClick={() => mutate(d => { const f = d.formulas.find(x => x.id === formula.id); if (f) f.steps.push({ id: uid("step"), label: "", text: "" }); })}>+ Add step</button>
          </div>
        </div>
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <button className="cd-btn" style={{ background: "var(--danger)", borderRadius: "var(--radius-sm)" }}
            onClick={async () => { if (await askConfirm({ message: "Delete this formula?", confirmLabel: "Delete", danger: true })) { closeDrawer(); setTimeout(() => mutate(d => { d.formulas = d.formulas.filter(x => x.id !== formula.id); }), 280); } }}>
            Delete formula
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MAIN RENDER — header with tabs INSIDE like ProjectDesk
  ══════════════════════════════════════════ */
  const showNewBtn  = ["board", "status", "table"].includes(view);

  const totalCount = state.cards.length;
  const inboxCount = state.cards.filter(c => c.status.toLowerCase() === "inbox").length;
  const writingCount = state.cards.filter(c => c.status.toLowerCase() === "writing").length;
  const filmingCount = state.cards.filter(c => ["filming", "ready to film"].includes(c.status.toLowerCase())).length;
  const editingCount = state.cards.filter(c => c.status.toLowerCase() === "editing").length;
  const scheduledCount = state.cards.filter(c => c.status.toLowerCase() === "scheduled").length;
  const postedCount = state.cards.filter(c => c.status.toLowerCase() === "posted").length;

  return (
    <div className="cd-root">

      {/* ── Masthead (header card) with tabs inside ── */}
      <div className="cd-masthead">
        <div className="cd-mast-top">
          <div className="cd-mast-left">
            <h1 className="cd-mast-title">
              {lang === "es" ? <>Mesa de <em>Contenido</em></> : <>Content <em>Desk</em></>}
            </h1>
            <div className="cd-mast-sub">{t("sub")}</div>
          </div>
          <div className="cd-mast-right">
            <div className="cd-search-wrap">
              <Search size={13} className="cd-search-icon" />
              <input className="cd-search" placeholder={t("search")}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="cd-dots-wrap" ref={moreWrapRef}>
              <button className="cd-dots" onClick={e => { e.stopPropagation(); setMoreMenu(v => !v); }}>
                <MoreHorizontal size={15} />
              </button>
              {moreMenu && (
                <div className="cd-popmenu" onClick={e => e.stopPropagation()}>
                  <div className="cd-zoomrow">
                    <span>{t("zoom")}</span>
                    <div className="cd-zoomrow-btns">
                      <button disabled={zoomI === 0} onClick={() => stepZoom(-1)}>
                        <Minus size={12} />
                      </button>
                      <button disabled={zoomI === ZOOM_STEPS.length - 1} onClick={() => stepZoom(1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="cd-popmenu-divider" />
                  <button onClick={() => { setMoreMenu(false); exportBackup(); }}>{t("export_backup")}</button>
                  <button onClick={() => { setMoreMenu(false); fileRef.current?.click(); }}>{t("import_backup")}</button>
                  <div className="cd-popmenu-divider" />
                  <button onClick={async () => { if (await askConfirm({ message: t("reset_confirm"), danger: true })) { setState(allowSeed ? fresh() : emptyBoard()); setMoreMenu(false); } }}>
                    {t("reset_defaults")}
                  </button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={onImportFile} />
          </div>
        </div>

        {/* Tabs row — styled like pd-viewswitch capsules */}
        <div className="cd-mast-nav">
          <div className="cd-viewswitch">
            {VIEWS.map(vw => (
              <button key={vw.v} aria-pressed={view === vw.v} onClick={() => setView(vw.v)}>
                {t(vw.v)}
              </button>
            ))}
          </div>
          <div className="cd-tabs-spacer" />
          <div className="cd-tabs-actions">
            {showNewBtn && (
              <button className="cd-btn" onClick={() => {
                const id = uid("n");
                const catId = state.cats[0]?.id || "";
                mutate(d => d.cards.push({ id, cat: catId, ref: "New", title: lang === "es" ? "Idea sin título" : "Untitled idea", script: "", order: 999, status: "Ideas", scenes: [], caption: "", notes: "", date: "", time: "", format: "Reel", client: "", creator: "", platform: "Instagram", priority: "Normal", tags: [], links: [], metrics: {}, locked: false }));
                openCard(id);
              }}>
                {t("new_idea")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Stats Bar (Photo 5) ── */}
      <div className="cd-summary-bar">
        <div className="cd-summary-row">
          <div className="cd-summary-card">
            <div className="cd-summary-num">{totalCount}</div>
            <div className="cd-summary-label">{t("total_ideas")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{inboxCount}</div>
            <div className="cd-summary-label">{t("inbox")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{writingCount}</div>
            <div className="cd-summary-label">{t("writing")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{filmingCount}</div>
            <div className="cd-summary-label">{t("filming")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{editingCount}</div>
            <div className="cd-summary-label">{t("editing")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{scheduledCount}</div>
            <div className="cd-summary-label">{t("scheduled")}</div>
          </div>
          <div className="cd-summary-card">
            <div className="cd-summary-num">{postedCount}</div>
            <div className="cd-summary-label">{t("posted")}</div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="cd-body" style={{ zoom: zoomPct / 100 }}>
        {view === "board"     && renderBoardView()}
        {view === "status"    && renderStatusView()}
        {view === "table"     && renderTableView()}
        {view === "calendar"  && renderCalendarView()}
        {view === "dashboard" && renderDashboardView()}
        {view === "playbook"  && renderPlaybookView()}

        {/* Drawer overlay */}
        <div className={"cd-drawer-overlay" + (drawerOn ? " open" : "")} onClick={closeDrawer} />

        {/* Drawer panel */}
        <div className={"cd-drawer" + (drawerOn ? " open" : "") + (drawerWide ? " wide" : "")}>
          <div className="cd-drawer-bar">
            <span className="cd-drawer-ref">
              {drawerMode === "card"    && (openCardObj?.ref || "Idea")}
              {drawerMode === "series"  && "Series"}
              {drawerMode === "formula" && "Formula"}
            </span>
            <div className="cd-drawer-actions">
              <button className="cd-drawer-icon-btn" title="Expand" onClick={() => setDrawerWide(v => !v)}>
                <Maximize2 size={13} />
              </button>
              <button className="cd-drawer-icon-btn" title="Close" onClick={closeDrawer}>
                <X size={13} />
              </button>
            </div>
          </div>
          {drawerMode === "card"    && openCardObj    && <CardDrawer    card={openCardObj} />}
          {drawerMode === "series"  && openSeriesObj  && <SeriesDrawer  series={openSeriesObj} />}
          {drawerMode === "formula" && openFormulaObj && <FormulaDrawer formula={openFormulaObj} />}
        </div>
      </div>

      {/* Toast */}
      <div className={"cd-toast" + (toastShow ? " show" : "")}>{toastMsg}</div>
    </div>
  );
}
