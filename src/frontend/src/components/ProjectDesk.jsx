import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Minus,
  Plus,
  Maximize2,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Folder,
  Layers,
  LayoutGrid,
  Pencil,
  Trash2
} from "lucide-react";
import "./ProjectDesk.css";
import { useOperationsTasks } from "../hooks/useOperationsTasks";
import { useOrganizationPresence } from "../hooks/useOrganizationPresence";
import { OnlineUsersAvatars } from "./OnlineUsersAvatars";
import { TaskActivityTimeline } from "./TaskActivityTimeline";
import { AIAssistantDrawer } from "./AIAssistantDrawer";
import { getSupabase } from "../supabaseClient";
import { TRANSLATIONS } from "../i18n/translations";
import { useNotifications } from './common/Notifications';
import { scopedKey, purgeLegacyKey } from '../core/storage/scopedStorage';

/* ================================================================
CoachData Project Desk — React 19 port of the original artifact.
Seven views (Board, Projects, Calendar, Week, Timeline, Team, Workload),
task detail drawer, native drag-and-drop, 8 themes, zoom & JSON storage.
================================================================ */

const STATUSES = ["Backlog", "To do", "In progress", "Blocked", "In review", "Done"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const KEY = "coachdata-project-desk-v2";

function loadState(storageKey = KEY, allowSeed = false) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.tasks && p.projects) {
        // Garantizar que la lista de personas contenga a Elsi y Diogenes de forma coherente
        p.people = SEED_PEOPLE.map((sp) => Object.assign({}, sp));
        return normalize(p);
      }
    }
  } catch (e) { }
  return allowSeed ? seedState() : emptyState();
}
const THEME_KEY = "coachdata-theme";
const ZOOM_KEY = "coachdata-pm-zoom";
const WHO_KEY = "coachdata-pm-who";
const ME_KEY = "coachdata-pm-me";

const THEMES = [
  { id: "clean", name: "Clean" },
  { id: "slate", name: "Slate" },
  { id: "ivory", name: "Ivory" },
  { id: "forest", name: "Forest" },
  { id: "blush", name: "Blush" },
  { id: "sky", name: "Sky" },
  { id: "lilac", name: "Lilac" },
  { id: "apricot", name: "Apricot" },
];

const ZOOM_STEPS = [80, 90, 100, 110, 125, 140, 160, 180];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOWS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ---------------- seed ---------------- */
const SEED_PEOPLE = [
  { id: "p-elsi", name: "Elsi", role: "Founder", days: 5, hue: 152 },
  { id: "p-diogenes", name: "Diogenes", role: "Tech Lead", days: 5, hue: 205 }
];
const SEED_PROJECTS = [
  { id: "pr-content", name: "Content engine", hue: 152, what: "The weekly publishing machine: scripts, filming, editing, posting." },
  { id: "pr-site", name: "Website rebuild", hue: 205, what: "New site, new offers, clearer path from discovery to enquiry." },
  { id: "pr-sops", name: "SOPs and onboarding", hue: 36, what: "Documented process so a new hire can start without hand holding." },
  { id: "pr-clients", name: "Client delivery", hue: 272, what: "Everything owed to paying clients this month." },
];

const SEED_TASKS = [
  { t: "Film Agency Diaries week one", p: "pr-content", s: "In progress", pr: "High", n: "Four things this week: 250 outreach messages, two podcasts, two proposals, five pieces of content.", due: 2, est: 4, checks: ["Outreach list pulled", "Podcast one recorded", "Podcast two recorded", "Proposals sent"] },
  { t: "Cut the CEO Decisions episode", p: "pr-content", s: "To do", pr: "Normal", n: "The €1,500 a month client decision. Keep the pause before the answer.", due: 5, est: 3, checks: [] },
  { t: "Write the evergreen funnel breakdown", p: "pr-content", s: "To do", pr: "High", n: "Promised to anyone who comments EVERGREEN. Needs to exist before that post goes live.", due: 4, est: 5, checks: ["Map the current funnel", "Draft the walkthrough", "Build the ManyChat flow"] },
  { t: "Build the scale checklist", p: "pr-sops", s: "Backlog", pr: "High", n: "The SYSTEMS keyword sends people here. Cannot post that script until this is real.", due: 9, est: 6, checks: [] },
  { t: "Document the Lucky Method", p: "pr-sops", s: "In progress", pr: "Normal", n: "The full customer journey map, written down so anyone on the team can run it.", due: 14, est: 8, checks: ["Discovery stage", "Nurture stage", "Offer stage", "Retention stage"] },
  { t: "Rewrite the offers page", p: "pr-site", s: "In review", pr: "Normal", n: "Three offers, one clear next step on each.", due: 3, est: 5, checks: [] },
  { t: "Fix the link in bio destination", p: "pr-site", s: "Done", pr: "Normal", n: "One clear destination instead of a menu of options.", due: -4, est: 1, checks: [] },
  { t: "Chase the outstanding proposal", p: "pr-clients", s: "Blocked", pr: "Urgent", n: "Waiting on their side since last week. Follow up, then decide whether to close it out.", due: -1, est: 1, checks: [] },
  { t: "Monthly reporting for all clients", p: "pr-clients", s: "To do", pr: "High", n: "Numbers, what we changed, what we are doing next month.", due: 7, est: 6, checks: [] },
  { t: "Set up the freebie experiment tracking", p: "pr-content", s: "Backlog", pr: "Low", n: "Three months of public numbers. Needs somewhere to record them each month.", due: 21, est: 2, checks: [] },
];

function uid(p) { return p + "-" + Math.random().toString(36).slice(2, 8); }
function iso(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
function todayISO() { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); }
function dayDiff(a, b) { return Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 864e5); }
function fmtDate(s) {
  const p = String(s).split("-");
  if (p.length !== 3) return s;
  return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1].slice(0, 3);
}

function dueState(t) {
  if (!t.due) return "";
  const d = dayDiff(t.due, todayISO());
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "";
}

function dueLabel(t) {
  if (!t.due) return "";
  const d = dayDiff(t.due, todayISO());
  if (d < 0) return Math.abs(d) + "d late";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 7) return "In " + d + "d";
  return fmtDate(t.due);
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

function normalize(p) {
  if (!Array.isArray(p.people)) p.people = [];
  if (!Array.isArray(p.projects)) p.projects = [];
  if (!Array.isArray(p.tasks)) p.tasks = [];
  p.people.forEach((x) => {
    if (typeof x.role !== "string") x.role = "";
    if (typeof x.days !== "number") x.days = 5;
    if (typeof x.hue !== "number") x.hue = 152;
  });
  p.projects.forEach((x) => {
    if (typeof x.what !== "string") x.what = "";
    if (typeof x.hue !== "number") x.hue = 152;
  });
  p.tasks.forEach((t, i) => {
    if (STATUSES.indexOf(t.status) === -1) t.status = "Backlog";
    if (PRIORITIES.indexOf(t.priority) === -1) t.priority = "Normal";
    if (typeof t.assignee !== "string") t.assignee = "";
    if (typeof t.due !== "string") t.due = "";
    if (typeof t.estimate !== "string") t.estimate = "";
    if (typeof t.notes !== "string") t.notes = "";
    if (typeof t.order !== "number") t.order = i;
    if (!Array.isArray(t.checks)) t.checks = [];
    if (!Array.isArray(t.links)) t.links = [];
  });
  return p;
}

/**
 * Estado inicial vacio: proyectos y tareas a cero, pero conservando la lista de
 * personas para que el selector de asignados no quede roto. Es lo que ve una
 * cuenta nueva — SEED_TASKS son tareas reales de CoachData y no deben aparecer en
 * la cuenta de otro.
 */
function emptyState() {
  return normalize({ people: SEED_PEOPLE.map((p) => Object.assign({}, p)), projects: [], tasks: [] });
}

function seedState() {
  const today = new Date();
  return normalize({
    people: SEED_PEOPLE.map((p) => Object.assign({}, p)),
    projects: SEED_PROJECTS.map((p) => Object.assign({}, p)),
    tasks: SEED_TASKS.map((x, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + x.due);
      return {
        id: "t" + (i + 1), title: x.t, project: x.p, status: x.s, priority: x.pr,
        assignee: i % 3 === 0 ? "p-elsi" : "",
        due: iso(d.getFullYear(), d.getMonth(), d.getDate()),
        estimate: String(x.est), notes: x.n, order: i,
        checks: x.checks.map((c, j) => ({ id: "c" + i + "-" + j, text: c, done: false })),
        links: [],
      };
    }),
  });
}



const personById = (state, id) => state.people.find((p) => p.id === id);
const projectById = (state, id) => state.projects.find((p) => p.id === id);

function Avatar({ person, size }) {
  const cls = "pd-avatar" + (size ? " pd-" + size : "");
  if (!person) return <span className={cls + " pd-none"} title="Unassigned">&ndash;</span>;
  return (
    <span className={cls} title={person.name} style={{ background: `var(--accent)`, color: `var(--deep, #111A15)` }}>
      {initials(person.name)}
    </span>
  );
}

function ProjectTag({ project }) {
  if (!project) return null;
  return (
    <span className="pd-proj" style={{ background: `hsl(${project.hue},34%,88%)`, color: `hsl(${project.hue},44%,26%)` }}>
      {project.name}
    </span>
  );
}

const STATUS_LABELS = {
  en: { Backlog: "Backlog", "To do": "To do", "In progress": "In progress", Blocked: "Blocked", "In review": "In review", Done: "Done" },
  es: { Backlog: "Por hacer (Backlog)", "To do": "Pendiente", "In progress": "En progreso", Blocked: "Bloqueado", "In review": "En revisión", Done: "Completado" }
};

const PRIORITY_LABELS = {
  en: { Low: "Low", Normal: "Normal", High: "High", Urgent: "Urgent" },
  es: { Low: "Baja", Normal: "Normal", High: "Alta", Urgent: "Urgente" }
};

const VIEW_LABELS = {
  en: { board: "Board", projects: "Projects", calendar: "Calendar", week: "Week", timeline: "Timeline", team: "Team", workload: "Workload" },
  es: { board: "Tablero", projects: "Proyectos", calendar: "Calendario", week: "Semana", timeline: "Línea de tiempo", team: "Equipo", workload: "Carga de trabajo" }
};

export default function ProjectDesk({ language = 'es', theme: globalTheme, orgScope, allowSeed = false, organizationId = null }) {
  const { notify, confirm: askConfirm } = useNotifications();
  // Clave con ambito por organizacion: sin esto, todas las cuentas compartian
  // el mismo tablero en localStorage y un cliente nuevo veia el de CoachData.
  const storageKey = useMemo(() => scopedKey(KEY, orgScope), [orgScope]);
  const [state, setState] = useState(() => loadState(storageKey, allowSeed));
  const {
    tasks: realtimeTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useOperationsTasks(organizationId);

  const { onlineUsers, isConnected: isOrgPresenceConnected } = useOrganizationPresence(organizationId);

  // Synchronize realtime Supabase tasks with local ProjectDesk state
  useEffect(() => {
    if (!Array.isArray(realtimeTasks)) return;

    // Evita sobrescribir el estado local con una respuesta vacía inicial
    if (realtimeTasks.length === 0 && state.tasks.length > 0) {
      return;
    }

    setState((prev) => {
      const formattedTasks = realtimeTasks.map((t, idx) => ({
        id: t.id,
        project: t.project_id || prev.projects[0]?.id || 'pr-content',
        title: t.title,
        status:
          t.status === 'todo'
            ? 'To do'
            : t.status === 'in_progress'
              ? 'In progress'
              : t.status === 'done'
                ? 'Done'
                : (t.status || 'Backlog'),
        priority: t.priority
          ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1)
          : 'Normal',
        assignee: t.assigned_to || '',
        due: t.due_date || '',
        notes: t.description || '',
        order: t.order_index ?? idx,
        checks: [],
        links: [],
      }));

      return normalize({
        ...prev,
        tasks: formattedTasks,
      });
    });
  }, [realtimeTasks]);

  useEffect(() => {
    let channel = null;
    let isMounted = true;

    async function setupPresenceChannel() {
      const sb = await getSupabase();
      if (!sb || !isMounted) return;

      // Obtener el usuario autenticado en Supabase auth si existe, o usar el perfil local
      const { data: authData } = await sb.auth.getUser().catch(() => ({ data: null }));
      const authUser = authData?.user;
      
      let userName = localStorage.getItem("coachdata-user-name");
      if (!userName || userName.startsWith("User-") || userName === "Anonymous") {
        if (authUser?.email?.includes("elsi")) {
          userName = "Elsi";
        } else if (authUser?.email?.includes("diogenes") || authUser?.email?.includes("dev")) {
          userName = "Diogenes";
        } else {
          userName = "Diogenes";
        }
        localStorage.setItem("coachdata-user-name", userName);
      }

      const clientId = `client_${Math.random().toString(36).slice(2, 8)}`;

      channel = sb.channel(
        `project-desk-${organizationId}`,
        {
          config: {
            presence: {
              key: `${userName}_${clientId}`,
            },
          },
        }
      );

      // Usuarios conectados
      channel.on(
        "presence",
        { event: "sync" },
        () => {
          if (isMounted) setPresence(channel.presenceState());
        }
      );

      // Tarea movida
      channel.on(
        "broadcast",
        { event: "task-moved" },
        ({ payload }) => {
          if (!isMounted) return;
          setActivity(payload);

          setTimeout(() => {
            if (isMounted) setActivity(null);
          }, 3000);
        }
      );

      // Tarea siendo editada
      channel.on(
        "broadcast",
        { event: "task-editing" },
        ({ payload }) => {
          if (!isMounted) return;
          setEditingUsers((prev) => ({
            ...prev,
            [payload.taskId]: payload.user,
          }));
        }
      );

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });
    }

    setupPresenceChannel();

    return () => {
      isMounted = false;
      if (channel) {
        getSupabase().then((sb) => sb && sb.removeChannel(channel));
      }
    };
  }, [organizationId]);

  const theme = globalTheme || "forest";
  const [zoomPct, setZoomPct] = useState(() => {
    try {
      const saved = localStorage.getItem(ZOOM_KEY);
      return saved ? Number(saved) : 80;
    } catch {
      return 80;
    }
  });
  const [who, setWho] = useState("");
  const [meId, setMeId] = useState("");
  const [view, setViewState] = useState("board");
  const [search, setSearch] = useState("");
  const filter = search.trim().toLowerCase();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [boardMineOnly, setBoardMineOnly] = useState(false);
  const [boardTodayOnly, setBoardTodayOnly] = useState(false);

  const [openId, setOpenId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [drawerOn, setDrawerOn] = useState(false);
  const [drawerWide, setDrawerWide] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState({
    title: "",
    status: "To do",
    priority: "Normal",
    project: "",
    assignee: "",
    notes: ""
  });
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberDraft, setMemberDraft] = useState({ name: "", role: "Collaborator" });
  const [moreMenu, setMoreMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [overKey, setOverKey] = useState(null);

  // Estados de Colaboración Realtime
  const [presence, setPresence] = useState({});
  const [activity, setActivity] = useState(null);
  const [editingUsers, setEditingUsers] = useState({});

  useEffect(() => {
    const existing = localStorage.getItem("coachdata-user-name");
    if (!existing || existing.startsWith("User-") || existing === "Anonymous") {
      // Si la ventana no tiene nombre pre-existente, asignamos alternadamente Elsi para la sesión secundaria
      const defaultName = window.location.search.includes("user=elsi") ? "Elsi" : "Diogenes";
      localStorage.setItem("coachdata-user-name", defaultName);
    }
  }, []);

  const dragIdRef = useRef(null);
  const fileRef = useRef(null);
  const titleRef = useRef(null);
  const toastTimer = useRef(null);
  const closeTimer = useRef(null);
  const moreWrapRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) { }
  }, [state, storageKey]);

  // La clave global antigua queda huerfana; se limpia una vez.
  useEffect(() => { purgeLegacyKey(KEY); }, []);

  useEffect(() => {
    try { localStorage.setItem(ZOOM_KEY, String(zoomPct)); } catch (e) { }
  }, [zoomPct]);

  const mutate = useCallback((fn) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2200);
  }, []);

  const matchesSearch = (t) => {
    if (!filter) return true;
    const pr = projectById(state, t.project);
    const pe = personById(state, t.assignee);
    const hay = [t.title, t.notes, t.status, t.priority, pr ? pr.name : "", pe ? pe.name : ""].join(" ").toLowerCase();
    return hay.indexOf(filter) !== -1;
  };

  const visibleTasks = () => state.tasks.filter(matchesSearch);

  const boardTasks = () =>
    visibleTasks().filter((t) => {
      if (boardMineOnly && meId && t.assignee !== meId) return false;

      if (boardTodayOnly) {
        const ds = dueState(t);
        if (ds !== 'today' && ds !== 'soon') return false;
      }

      return true;
    });

  function openTask(id) {
    const userName = localStorage.getItem("coachdata-user-name") || "Anonymous";

    getSupabase().then((sb) => {
      if (sb) {
        sb.channel(`project-desk-${organizationId}`).send({
          type: "broadcast",
          event: "task-editing",
          payload: {
            taskId: id,
            user: userName,
          },
        });
      }
    });

    clearTimeout(closeTimer.current);
    setOpenId(id);
    setDrawerOn(true);
  }

  // Los campos de texto libre escribían en la DB en cada pulsación de tecla.
  const saveTimers = useRef({});
  function scheduleSave(key, fn, delay = 600) {
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(fn, delay);
  }
  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);

  function closeDrawer() {
    setDrawerOn(false);
    setConfirmDeleteId(null);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), 300);
  }

  function openNewTaskModal(defaultStatus = "To do") {
    setNewTaskDraft({
      title: "",
      status: defaultStatus,
      priority: "Normal",
      project: state.projects[0]?.id || "",
      assignee: "",
      notes: ""
    });
    setCreateModalOpen(true);
  }

  async function submitNewTask(draftData) {
    const status = draftData.status || "To do";
    const project = draftData.project || (state.projects[0] ? state.projects[0].id : "");
    const title = draftData.title.trim() || (language === 'es' ? 'Nueva tarea' : 'Untitled task');
    const priority = draftData.priority || "Normal";
    const assignee = draftData.assignee || "";
    const notes = draftData.notes || "";

    const localId = uid("t");

    const newTask = {
      id: localId,
      title,
      project,
      status,
      priority,
      assignee,
      due: todayISO(),
      estimate: '',
      notes,
      order: state.tasks.length,
      checks: [],
      links: [],
    };

    // 1. Inserción local de UI
    mutate((d) => {
      d.tasks.push(newTask);
    });

    setCreateModalOpen(false);
    openTask(localId);

    // 2. Mapeo a Supabase
    const dbStatus =
      status === 'In progress' ? 'in_progress' :
      status === 'Done' ? 'done' :
      status === 'To do' ? 'todo' :
      status === 'Backlog' ? 'Backlog' :
      status === 'Blocked' ? 'Blocked' :
      status === 'In review' ? 'In review' : (status || 'todo');

    const isUUIDProject = typeof project === 'string' && project.length === 36 && project.includes('-');
    const isUUIDAssignee = typeof assignee === 'string' && assignee.length === 36 && assignee.includes('-');

    try {
      const created = await createTask({
        title,
        description: notes,
        status: dbStatus,
        priority: priority.toLowerCase(),
        project_id: isUUIDProject ? project : null,
        assigned_to: isUUIDAssignee ? assignee : null,
        due_date: todayISO(),
      });

      if (created?.id) {
        mutate((d) => {
          const task = d.tasks.find((x) => x.id === localId);
          if (task) task.id = created.id;
        });

        setOpenId(created.id);
      }
    } catch (err) {
      console.error('[ProjectDesk] Error creando tarea:', err);
      toast(
        language === 'es'
          ? 'Tarea creada localmente (sin sincronización)'
          : 'Task created locally (sync failed)'
      );
    }
  }

  function renderTaskCard(t) {
    const p = personById(state, t.assignee);
    const ds = dueState(t);
    return (
      <div
        key={t.id}
        className={"pd-kan-card" + (draggingId === t.id ? " pd-dragging" : "")}
        draggable
        onDragStart={(e) => {
          setDraggingId(t.id);
          e.dataTransfer.setData("text/plain", t.id);
        }}
        onDragEnd={() => {
          setDraggingId(null);
        }}
        onClick={() => openTask(t.id)}
      >
        <div className="pd-task-top">
          <ProjectTag project={projectById(state, t.project)} />
          {editingUsers[t.id] && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(59,130,246,0.15)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#60a5fa",
                fontSize: "11px",
                fontWeight: 600,
              }}
              title={`${editingUsers[t.id]} está editando ahora`}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                  display: "inline-block",
                  animation: "pulse 1.5s infinite",
                }}
              />
              ✏️ {editingUsers[t.id].split('_client_')[0]}
            </span>
          )}
          {t.priority !== "Normal" && <span className="pd-prio" data-p={t.priority}>{t.priority}</span>}
        </div>
        <div className="pd-task-title">{t.title}</div>
        {t.notes && <p className="pd-task-note">{t.notes}</p>}
        <div className="pd-task-foot">
          <span className="pd-who"><Avatar person={p} size="sm" />{p ? p.name : (language === 'es' ? "Sin asignar" : "Unassigned")}</span>
          {t.due && <span className="pd-due">{dueLabel(t)}</span>}
        </div>
      </div>
    );
  }

  const openTaskObj = openId ? state.tasks.find((t) => t.id === openId) : null;
  const currentUserName = localStorage.getItem("coachdata-user-name") || "Anonymous";
  const activeEditorRaw = openId ? editingUsers[openId] : null;
  const activeEditorName = activeEditorRaw ? activeEditorRaw.split('_client_')[0] : null;
  const isTaskLockedByOther = Boolean(
    activeEditorRaw && activeEditorName !== currentUserName
  );

  const [themeMenu, setThemeMenu] = useState(false);
  const themeWrapRef = useRef(null);

  const stepZoom = (dir) => {
    setZoomPct((prev) => {
      const idx = ZOOM_STEPS.indexOf(prev);
      const nextIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (idx === -1 ? 2 : idx) + dir));
      return ZOOM_STEPS[nextIdx];
    });
  };

  const zoomScale = zoomPct / 100;

  return (
    <div className="pd-root" data-theme={theme}>
      {/* ---- Header ---- */}
      <header className="pd-masthead">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div className="pd-mast-titleblock">
            <h1 className="pd-mast-title">
              Project <em>Desk</em>
            </h1>
            <div className="pd-mast-sub">
              {language === 'es' ? "Gestión visual e inteligente de proyectos y tareas del equipo." : "Visual intelligent project & task management desk."}
            </div>
            <div
              className="pd-online-users"
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              <OnlineUsersAvatars onlineUsers={onlineUsers} isConnected={isOrgPresenceConnected} maxDisplay={5} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pd-search-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '12px', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="pd-search"
                type="search"
                placeholder={language === 'es' ? "Buscar tareas…" : "Search tasks…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={"pd-btn" + (boardMineOnly ? " pd-active" : "")}
                onClick={() => setBoardMineOnly((v) => !v)}
              >
                {language === 'es' ? 'Mis tareas' : 'My tasks'}
              </button>

              <button
                className={"pd-btn" + (boardTodayOnly ? " pd-active" : "")}
                onClick={() => setBoardTodayOnly((v) => !v)}
              >
                {language === 'es' ? 'Hoy / Próximas' : 'Today / Upcoming'}
              </button>
            </div>
            <div className="pd-themewrap" ref={moreWrapRef} style={{ position: 'relative' }}>
              <button
                className="pd-dots"
                onClick={(e) => { e.stopPropagation(); setThemeMenu(false); setMoreMenu((v) => !v); }}
              >
                <MoreHorizontal size={16} />
              </button>
              {moreMenu && (
                <div className="pd-popmenu" onClick={(e) => e.stopPropagation()}>
                  <div className="pd-zoomrow">
                    <span>Zoom</span>
                    <span className="pd-grp">
                      <button
                        aria-label="Make smaller"
                        disabled={ZOOM_STEPS.indexOf(zoomPct) <= 0}
                        onClick={() => stepZoom(-1)}
                        title="Reducir zoom"
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                      <button
                        aria-label="Make bigger"
                        disabled={ZOOM_STEPS.indexOf(zoomPct) >= ZOOM_STEPS.length - 1}
                        onClick={() => stepZoom(1)}
                        title="Aumentar zoom"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </span>
                  </div>
                  <div className="pd-divider" />
                  <button onClick={() => { setMoreMenu(false); openNewTaskModal(); }}>
                    {language === 'es' ? "+ Nueva Tarea" : "+ New Task"}
                  </button>
                  <div className="pd-divider" />
                  <button onClick={() => { setMoreMenu(false); setState(allowSeed ? seedState() : emptyState()); toast(language === 'es' ? "Tablero restaurado" : "Board reset"); }}>
                    {language === 'es' ? "Restaurar defecto" : "Reset Board"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pd-tools pd-mast-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <nav className="pd-viewswitch" role="group">
            {["board", "projects", "calendar", "week", "timeline", "team", "workload"].map((vKey) => (
              <button key={vKey} aria-pressed={view === vKey} onClick={() => setViewState(vKey)}>
                {(VIEW_LABELS[language] || VIEW_LABELS.es)[vKey]}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="pd-btn"
              onClick={() => openNewTaskModal()}
            >
              + {language === 'es' ? "Nueva Tarea" : "New Task"}
            </button>
          </div>
        </div>
      </header>

      {activity && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            margin: "8px 16px",
            padding: "10px 14px",
            borderRadius: "12px",
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(148,163,184,0.25)",
            color: "#e2e8f0",
            fontSize: "13px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <strong>{activity.user}</strong>
          {" movió "}
          <strong>{activity.task}</strong>
          {" → "}
          <strong>{activity.to}</strong>
        </div>
      )}

      {/* ---- Content (With Zoom Scale applied) ---- */}
      <div className="pd-content" style={{ zoom: zoomScale }}>
        {view === "board" && (
          <main className="pd-kan">
            {STATUSES.map((st) => {
              const tasks = boardTasks().filter((t) => t.status === st);
              const isOver = overKey === st;
              const statusLabel = (STATUS_LABELS[language] || STATUS_LABELS.es)[st] || st;
              return (
                <section
                  key={st}
                  className={"pd-kan-col" + (isOver ? " pd-over" : "")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overKey !== st) setOverKey(st);
                  }}
                  onDragLeave={() => {
                    if (overKey === st) setOverKey(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setOverKey(null);
                    setDraggingId(null);

                    const taskId = e.dataTransfer.getData('text/plain');
                    if (taskId) {
                      // Optimistic UI inmediata y broadcast realtime
                      mutate((d) => {
                        const targetTask = d.tasks.find((x) => x.id === taskId);
                        if (targetTask) {
                          targetTask.status = st;

                          const userName = localStorage.getItem("coachdata-user-name") || "Anonymous";
                          getSupabase().then((sb) => {
                            if (sb) {
                              sb.channel(`project-desk-${organizationId}`).send({
                                type: "broadcast",
                                event: "task-moved",
                                payload: {
                                  user: userName,
                                  task: targetTask.title,
                                  to: st,
                                },
                              });
                            }
                          });
                        }
                      });

                      // Persistencia
                      try {
                        await updateTask(taskId, {
                          status:
                            st === 'In progress'
                              ? 'in_progress'
                              : st === 'Done'
                                ? 'done'
                                : 'todo',
                        });
                      } catch (err) {
                        console.error('[ProjectDesk] Error actualizando estado:', err);
                        toast(
                          language === 'es'
                            ? 'No se pudo actualizar el estado'
                            : 'Could not update status'
                        );
                      }
                    }
                  }}
                >
                  <div className="pd-kan-head">
                    <span className="pd-kan-name">{statusLabel}</span>
                    <span className="pd-col-count">{tasks.length}</span>
                  </div>
                  <div className="pd-kan-body">{tasks.map((t) => renderTaskCard(t))}</div>
                  <button className="pd-addcard" onClick={() => openNewTaskModal(st)}>
                    + {language === 'es' ? "Añadir tarea" : "Add task"}
                  </button>
                </section>
              );
            })}
          </main>
        )}

        {view === "projects" && (
          <main className="pd-page">
            <div className="pd-panel">
              <div className="pd-panel-head">
                <h2 className="pd-panel-title">{language === 'es' ? "Resumen de Proyectos" : "Projects Overview"}</h2>
                <div className="pd-panel-note">
                  {language === 'es' ? "Estructura de avance global por proyecto activo." : "Overall progress structure across active projects."}
                </div>
              </div>
              {state.projects.map((proj) => {
                const projTasks = state.tasks.filter((t) => t.project === proj.id);
                const doneCount = projTasks.filter((t) => t.status === "Done").length;
                const pct = projTasks.length ? Math.round((doneCount / projTasks.length) * 100) : 0;
                return (
                  <div key={proj.id} className="pd-proj-panel">
                    <div className="pd-proj-head">
                      <div className="pd-proj-head-main">
                        <div className="pd-proj-name">{proj.name}</div>
                        <div className="pd-proj-what">{proj.what}</div>
                      </div>
                      <div className="pd-proj-metric">
                        <span className="pd-proj-pct">{pct}%</span>
                        <div className="pd-bar-track">
                          <div className="pd-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="pd-proj-metric-sub">{doneCount} / {projTasks.length} {language === 'es' ? "completadas" : "done"}</span>
                      </div>
                    </div>
                    <div className="pd-proj-rows">
                      {projTasks.map((t) => (
                        <div key={t.id} className={`pd-proj-row ${t.status === "Done" ? "pd-done" : ""}`} onClick={() => openTask(t.id)}>
                          <span className="pd-proj-row-title">{t.title}</span>
                          <span className="pd-due">{t.due ? dueLabel(t) : ""}</span>
                          <span className="pd-prio" data-p={t.priority}>{t.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {view === "calendar" && (
          <main className="pd-calwrap">
            <div className="pd-cal">
              <div className="pd-cal-head">
                <span className="pd-cal-month">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
              </div>
              <div className="pd-cal-scroll">
                <div className="pd-cal-grid">
                  {(language === 'es' ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : DOWS).map((d) => (
                    <div key={d} className="pd-dow">{d}</div>
                  ))}
                  {Array.from({ length: 35 }).map((_, idx) => {
                    const dayNum = (idx % 31) + 1;
                    const dayTasks = state.tasks.filter((t) => t.due && new Date(t.due).getDate() === dayNum);
                    return (
                      <div key={idx} className="pd-day">
                        <span className="pd-day-n">{dayNum}</span>
                        {dayTasks.slice(0, 2).map((t) => (
                          <div key={t.id} className="pd-chip" data-when={dueState(t)} onClick={() => openTask(t.id)}>
                            <span className="pd-chip-dot" />
                            <span className="pd-chip-text">{t.title}</span>
                          </div>
                        ))}
                        {dayTasks.length > 2 && <span className="pd-day-more">+{dayTasks.length - 2} {language === 'es' ? "más" : "more"}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        )}

        {view === "week" && (
          <main className="pd-weekwrap">
            <div className="pd-week-head">
              <h2 className="pd-week-title">{language === 'es' ? "Plan de la Semana" : "Weekly Plan"}</h2>
            </div>
            <div className="pd-week-scroll">
              <div className="pd-week-grid">
                {(language === 'es' ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] : DOWS_FULL.slice(0, 5)).map((dayName, dIdx) => {
                  const dayTasks = state.tasks.filter((_, i) => i % 5 === dIdx);
                  return (
                    <div key={dayName} className="pd-week-col">
                      <div className="pd-week-col-head">
                        <span className="pd-week-dow">{dayName}</span>
                        <span className="pd-week-date">Día {dIdx + 1}</span>
                      </div>
                      <div className="pd-week-tasks">
                        {dayTasks.map((t) => (
                          <div key={t.id} className={`pd-week-task ${t.status === "Done" ? "pd-done" : ""}`}>
                            <input
                              type="checkbox"
                              checked={t.status === "Done"}
                              onChange={() => mutate((d) => { const x = d.tasks.find((z) => z.id === t.id); if (x) x.status = x.status === "Done" ? "To do" : "Done"; })}
                            />
                            <div className="pd-week-task-body" onClick={() => openTask(t.id)}>
                              <div className="pd-week-task-title">{t.title}</div>
                              <div className="pd-week-task-meta">
                                <span className="pd-prio" data-p={t.priority}>{t.priority}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="pd-week-add" onClick={() => addTask("To do", undefined)}>
                        + {language === 'es' ? "Añadir a" : "Add to"} {dayName}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {view === "timeline" && (
          <main className="pd-page">
            <div className="pd-panel">
              <div className="pd-panel-head">
                <h2 className="pd-panel-title">{language === 'es' ? "Línea de Tiempo (Gantt)" : "Timeline (Gantt)"}</h2>
              </div>
              <div className="pd-timeline">
                <div className="pd-tl-head">
                  <span>{language === 'es' ? "Tarea" : "Task"}</span>
                  <div className="pd-tl-scale">
                    <span>{language === 'es' ? "Semana 1" : "Week 1"}</span>
                    <span>{language === 'es' ? "Semana 2" : "Week 2"}</span>
                    <span>{language === 'es' ? "Semana 3" : "Week 3"}</span>
                    <span>{language === 'es' ? "Semana 4" : "Week 4"}</span>
                  </div>
                </div>
                {state.tasks.map((t, i) => {
                  const leftPct = (i * 7) % 70;
                  const widthPct = 20 + ((i * 3) % 30);
                  return (
                    <div key={t.id} className="pd-tl-row" onClick={() => openTask(t.id)} style={{ cursor: 'pointer' }}>
                      <span className="pd-tl-label">{t.title}</span>
                      <div className="pd-tl-track">
                        <div
                          className="pd-tl-bar"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          data-late={t.due && dayDiff(t.due, todayISO()) < 0 ? "1" : "0"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {view === "team" && (
          <main className="pd-page">
            <div className="pd-panel">
              <div className="pd-panel-head">
                <h2 className="pd-panel-title">{language === 'es' ? "Miembros del Equipo" : "Team Members"}</h2>
                <button
                  className="pd-btn"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text, #fff)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                  onClick={() => {
                    setMemberDraft({ name: "", role: language === 'es' ? "Colaborador" : "Collaborator" });
                    setAddMemberOpen(true);
                  }}
                >
                  + {language === 'es' ? "Añadir Miembro" : "Add Member"}
                </button>
              </div>
              <div className="pd-people">
                {state.people.map((p) => {
                  const assignedTasks = state.tasks.filter((t) => t.assignee === p.id);
                  return (
                    <div key={p.id} className="pd-person">
                      <div className="pd-person-head">
                        <Avatar person={p} size="md" />
                        <div style={{ flex: 1 }}>
                          <div className="pd-person-name">{p.name}</div>
                          <div className="pd-person-role">{p.role}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            title={language === 'es' ? "Editar miembro" : "Edit member"}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-text)', cursor: 'pointer', opacity: 0.75, padding: '4px' }}
                            onClick={() => {
                              setMemberDraft({ id: p.id, name: p.name, role: p.role });
                              setAddMemberOpen(true);
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            title={language === 'es' ? "Eliminar miembro" : "Remove member"}
                            style={{ background: 'none', border: 'none', color: 'var(--crit, #e74c3c)', cursor: 'pointer', opacity: 0.75, padding: '4px' }}
                            onClick={async () => {
                              const ok = await askConfirm({
                                message: language === 'es' ? `¿Eliminar a ${p.name} del equipo?` : `Remove ${p.name} from team?`,
                                confirmLabel: language === 'es' ? 'Eliminar' : 'Remove',
                                danger: true,
                              });
                              if (ok) {
                                mutate((d) => {
                                  d.people = d.people.filter((x) => x.id !== p.id);
                                  d.tasks.forEach((t) => { if (t.assignee === p.id) t.assignee = ""; });
                                });
                                toast(language === 'es' ? "Miembro eliminado" : "Member removed");
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="pd-person-load">
                        <b>{assignedTasks.length}</b> {language === 'es' ? "tareas asignadas" : "assigned tasks"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {view === "workload" && (
          <main className="pd-page">
            <div className="pd-panel">
              <div className="pd-panel-head">
                <h2 className="pd-panel-title">{language === 'es' ? "Distribución de Carga de Trabajo" : "Workload Distribution"}</h2>
              </div>
              <div className="pd-bars">
                {state.people.map((p) => {
                  const count = state.tasks.filter((t) => t.assignee === p.id).length;
                  const pct = Math.min(100, Math.round((count / Math.max(1, state.tasks.length)) * 100));
                  return (
                    <div key={p.id} className="pd-bar-row">
                      <div>
                        <div className="pd-bar-label">{p.name} ({p.role})</div>
                        <div className="pd-bar-track">
                          <div className="pd-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="pd-bar-val">{count} {language === 'es' ? "tareas" : "tasks"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ---- Drawer Modal ---- */}
      {openTaskObj && (
        <>
          <div className={"pd-scrim" + (drawerOn ? " pd-open" : "")} onClick={closeDrawer} />
          <aside className={"pd-drawer" + (drawerOn ? " pd-open" : "") + (drawerWide ? " pd-wide" : "")}>
          <div className="pd-drawer-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div className="pd-drawer-cat">{openTaskObj.status}</div>
                <input
                  ref={titleRef}
                  className="pd-drawer-title"
                  disabled={isTaskLockedByOther}
                  value={openTaskObj.title}
                  onChange={(e) => {
                    if (isTaskLockedByOther) return;
                    const value = e.target.value;

                    // UI inmediata
                    mutate((d) => {
                      const x = d.tasks.find((z) => z.id === openId);
                      if (x) x.title = value;
                    });

                    // Sincronización en segundo plano
                    scheduleSave(`title:${openId}`, () => {
                      updateTask(openId, { title: value }).catch((err) => {
                        console.error('[ProjectDesk] Error actualizando título:', err);
                      });
                    });
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="pd-x" onClick={() => setDrawerWide((v) => !v)}><Maximize2 size={14} /></button>
                <button className="pd-x" onClick={closeDrawer}><X size={14} /></button>
              </div>
            </div>
          </div>

          <div className="pd-drawer-body">
            {isTaskLockedByOther ? (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                🔒 <strong>{activeEditorName}</strong> está editando esta tarea. <em>Solo lectura mientras esté activa.</em>
              </div>
            ) : editingUsers[openId] && (
              <div
                style={{
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.28)",
                  color: "#bfdbfe",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                ✏️ {activeEditorName} está editando esta tarea
              </div>
            )}

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Estado" : "Status"}</div>
              <select
                className="pd-field"
                disabled={isTaskLockedByOther}
                value={openTaskObj.status}
                onChange={async (e) => {
                  if (isTaskLockedByOther) return;
                  const value = e.target.value;

                  mutate((d) => {
                    const x = d.tasks.find((z) => z.id === openId);
                    if (x) x.status = value;
                  });

                  await updateTask(openId, {
                    status:
                      value === 'In progress'
                        ? 'in_progress'
                        : value === 'Done'
                          ? 'done'
                          : 'todo',
                  });
                }}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Prioridad" : "Priority"}</div>
              <select
                className="pd-field"
                disabled={isTaskLockedByOther}
                value={openTaskObj.priority}
                onChange={async (e) => {
                  if (isTaskLockedByOther) return;
                  const value = e.target.value;

                  mutate((d) => {
                    const x = d.tasks.find((z) => z.id === openId);
                    if (x) x.priority = value;
                  });

                  await updateTask(openId, {
                    priority: value.toLowerCase(),
                  });
                }}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Proyecto" : "Project"}</div>
              <select
                className="pd-field"
                disabled={isTaskLockedByOther}
                value={openTaskObj.project}
                onChange={async (e) => {
                  if (isTaskLockedByOther) return;
                  const value = e.target.value;
                  mutate((d) => {
                    const x = d.tasks.find((z) => z.id === openId);
                    if (x) x.project = value;
                  });
                  const isUUID = typeof value === 'string' && value.length === 36 && value.includes('-');
                  await updateTask(openId, { project_id: isUUID ? value : null });
                }}
              >
                {state.projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Asignado a" : "Assignee"}</div>
              <select
                className="pd-field"
                disabled={isTaskLockedByOther}
                value={openTaskObj.assignee}
                onChange={async (e) => {
                  if (isTaskLockedByOther) return;
                  const value = e.target.value;
                  mutate((d) => {
                    const x = d.tasks.find((z) => z.id === openId);
                    if (x) x.assignee = value;
                  });
                  await updateTask(openId, { assigned_to: value });
                }}
              >
                <option value="">{language === 'es' ? "-- Sin asignar --" : "-- Unassigned --"}</option>
                {state.people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Notas y Detalles" : "Notes & Details"}</div>
              <textarea
                className="pd-field"
                rows={4}
                disabled={isTaskLockedByOther}
                value={openTaskObj.notes}
                onChange={(e) => {
                  if (isTaskLockedByOther) return;
                  const value = e.target.value;

                  mutate((d) => {
                    const x = d.tasks.find((z) => z.id === openId);
                    if (x) x.notes = value;
                  });

                  scheduleSave(`notes:${openId}`, () => {
                    updateTask(openId, { description: value }).catch((err) => {
                      console.error('[ProjectDesk] Error actualizando notas:', err);
                    });
                  });
                }}
              />
            </div>

            <TaskActivityTimeline taskId={openId} organizationId={organizationId} />

            {confirmDeleteId === openId ? (
              <div
                role="alertdialog"
                aria-label={language === 'es' ? 'Confirmar eliminación' : 'Confirm deletion'}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  {language === 'es'
                    ? 'Esta acción no se puede deshacer. ¿Eliminar la tarea?'
                    : 'This cannot be undone. Delete this task?'}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="pd-btn"
                    style={{ background: 'var(--crit-bg)', color: 'var(--crit)', borderColor: 'transparent' }}
                    onClick={async () => {
                      const deletingId = openId;

                      mutate((d) => {
                        d.tasks = d.tasks.filter((x) => x.id !== deletingId);
                      });

                      closeDrawer();

                      try {
                        await deleteTask(deletingId);
                        toast(language === 'es' ? 'Tarea eliminada' : 'Task deleted');
                      } catch (err) {
                        console.error('[ProjectDesk] Error eliminando tarea:', err);
                        toast(
                          language === 'es'
                            ? 'Eliminada localmente (sin sincronización)'
                            : 'Deleted locally (sync failed)'
                        );
                      }
                    }}
                  >
                    {language === 'es' ? 'Sí, eliminar' : 'Yes, delete'}
                  </button>
                  <button type="button" className="pd-btn" onClick={() => setConfirmDeleteId(null)}>
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="pd-btn"
                style={{ background: 'var(--crit-bg)', color: 'var(--crit)', borderColor: 'transparent' }}
                onClick={() => setConfirmDeleteId(openId)}
              >
                {language === 'es' ? "Eliminar Tarea" : "Delete Task"}
              </button>
            )}
          </div>
        </aside>
        </>
      )}

      {/* ---- Create New Task Modal Drawer ---- */}
      <div className={"pd-scrim" + (createModalOpen ? " pd-open" : "")} onClick={() => setCreateModalOpen(false)} />
      {createModalOpen && (
        <aside className="pd-drawer pd-open">
          <div className="pd-drawer-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="pd-drawer-cat">{language === 'es' ? "NUEVA TAREA" : "NEW TASK"}</div>
                <h3 className="pd-panel-title" style={{ fontSize: '20px', marginTop: '6px' }}>
                  {language === 'es' ? "Configurar e Insertar Tarea" : "Configure & Create Task"}
                </h3>
              </div>
              <button className="pd-x" onClick={() => setCreateModalOpen(false)}><X size={14} /></button>
            </div>
          </div>

          <div className="pd-drawer-body">
            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Título de la Tarea" : "Task Title"}</div>
              <input
                type="text"
                className="pd-field"
                placeholder={language === 'es' ? "Ej. Redactar propuesta para cliente…" : "e.g. Write client proposal…"}
                value={newTaskDraft.title}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Estado / Columna" : "Status / Column"}</div>
              <select
                className="pd-field"
                value={newTaskDraft.status}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Prioridad" : "Priority"}</div>
              <select
                className="pd-field"
                value={newTaskDraft.priority}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Proyecto Destino" : "Target Project"}</div>
              <select
                className="pd-field"
                value={newTaskDraft.project}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, project: e.target.value }))}
              >
                {state.projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Asignar a" : "Assign To"}</div>
              <select
                className="pd-field"
                value={newTaskDraft.assignee}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, assignee: e.target.value }))}
              >
                <option value="">{language === 'es' ? "-- Sin asignar --" : "-- Unassigned --"}</option>
                {state.people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Notas / Descripción" : "Notes / Description"}</div>
              <textarea
                className="pd-field"
                rows={3}
                placeholder={language === 'es' ? "Detalles opcionales de la tarea…" : "Optional task details…"}
                value={newTaskDraft.notes}
                onChange={(e) => setNewTaskDraft((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
              <button
                className="pd-btn"
                style={{ flex: 1, background: 'var(--accent)', color: 'var(--accent-text, #fff)', padding: '12px', borderRadius: '10px', fontWeight: '600' }}
                onClick={() => submitNewTask(newTaskDraft)}
              >
                + {language === 'es' ? "Crear Tarea" : "Create Task"}
              </button>
              <button
                className="pd-btn"
                style={{ background: 'var(--field)', color: 'var(--muted)', padding: '12px 20px', borderRadius: '10px' }}
                onClick={() => setCreateModalOpen(false)}
              >
                {TRANSLATIONS[language]?.cancel || 'Cancelar'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ---- Add / Edit Team Member Drawer Modal ---- */}
      <div className={"pd-scrim" + (addMemberOpen ? " pd-open" : "")} onClick={() => setAddMemberOpen(false)} />
      {addMemberOpen && (
        <aside className={"pd-drawer pd-open"}>
          <div className="pd-drawer-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="pd-drawer-cat">{language === 'es' ? "EQUIPO" : "TEAM"}</div>
                <h3 className="pd-panel-title" style={{ fontSize: '20px', marginTop: '6px' }}>
                  {memberDraft.id
                    ? (language === 'es' ? "Editar Miembro" : "Edit Team Member")
                    : (language === 'es' ? "Añadir Nuevo Miembro" : "Add New Team Member")}
                </h3>
              </div>
              <button className="pd-x" onClick={() => setAddMemberOpen(false)}><X size={14} /></button>
            </div>
          </div>

          <div className="pd-drawer-body">
            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Nombre Completo" : "Full Name"}</div>
              <input
                type="text"
                className="pd-field"
                placeholder={language === 'es' ? "Ej. Carlos Mendoza" : "e.g. Alex Rivera"}
                value={memberDraft.name}
                onChange={(e) => setMemberDraft((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="pd-sect">
              <div className="pd-sect-head">{language === 'es' ? "Rol o Cargo" : "Role or Title"}</div>
              <input
                type="text"
                className="pd-field"
                placeholder={language === 'es' ? "Ej. Growth Manager, Designer, Dev" : "e.g. Growth Manager, Designer, Dev"}
                value={memberDraft.role}
                onChange={(e) => setMemberDraft((prev) => ({ ...prev, role: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
              <button
                className="pd-btn"
                style={{ flex: 1, background: 'var(--accent)', color: 'var(--accent-text, #fff)', padding: '12px', borderRadius: '10px', fontWeight: '600' }}
                onClick={() => {
                  if (!memberDraft.name.trim()) return;
                  if (memberDraft.id) {
                    // Update existing
                    mutate((d) => {
                      const p = d.people.find((x) => x.id === memberDraft.id);
                      if (p) {
                        p.name = memberDraft.name.trim();
                        p.role = memberDraft.role.trim() || (language === 'es' ? "Colaborador" : "Collaborator");
                      }
                    });
                    toast(language === 'es' ? "Miembro actualizado" : "Member updated");
                  } else {
                    // Add new
                    const newPerson = {
                      id: "p-" + Date.now(),
                      name: memberDraft.name.trim(),
                      role: memberDraft.role.trim() || (language === 'es' ? "Colaborador" : "Collaborator"),
                      days: 5,
                      hue: Math.floor(Math.random() * 360)
                    };
                    mutate((d) => { d.people.push(newPerson); });
                    toast(language === 'es' ? `Miembro ${newPerson.name} añadido` : `Member ${newPerson.name} added`);
                  }
                  setAddMemberOpen(false);
                }}
              >
                {language === 'es' ? "Guardar Cambios" : "Save Changes"}
              </button>
              <button
                className="pd-btn"
                style={{ background: 'var(--field)', color: 'var(--muted)', padding: '12px 20px', borderRadius: '10px' }}
                onClick={() => setAddMemberOpen(false)}
              >
                {TRANSLATIONS[language]?.cancel || 'Cancelar'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ---- Toast ---- */}
      <div className={"pd-toast" + (toastShow ? " pd-show" : "")}>{toastMsg}</div>
    </div>
  );
}
