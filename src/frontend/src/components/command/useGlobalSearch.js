// src/frontend/src/components/command/useGlobalSearch.js
import { useMemo } from 'react';
import { useOperationsTasks } from '../../hooks/useOperationsTasks';
import { useDashboardProjects } from '../../hooks/useDashboardProjects';
import { useDashboardContent } from '../../hooks/useDashboardContent';

/**
 * Custom Hook: useGlobalSearch
 * Aggregates tasks, projects, content items and quick navigation actions for zero-latency ⌘K search.
 */
export function useGlobalSearch(organizationId, query = '') {
  const { tasks } = useOperationsTasks(organizationId);
  const { projects } = useDashboardProjects(organizationId);
  const { contentItems } = useDashboardContent(organizationId);

  return useMemo(() => {
    const q = query.trim().toLowerCase();

    const actions = [
      { id: 'nav-dashboard', type: 'nav', title: 'Dashboard Operativo', target: 'dashboard', category: 'Navegación' },
      { id: 'nav-project-desk', type: 'nav', title: 'Project Desk', target: 'project-desk', category: 'Navegación' },
      { id: 'nav-content-desk', type: 'nav', title: 'Content Desk', target: 'content-desk', category: 'Navegación' },
      { id: 'nav-client-workspace', type: 'nav', title: 'Espacio de Cliente', target: 'client-workspace', category: 'Navegación' },
      { id: 'nav-agents-hub', type: 'nav', title: 'Centro de Agentes IA', target: 'agents-hub', category: 'Navegación' },
      { id: 'nav-reports-hub', type: 'nav', title: 'AI Reports Hub', target: 'reports-hub', category: 'Navegación' },
      { id: 'act-new-task', type: 'action', title: 'Crear Nueva Tarea', target: 'project-desk', category: 'Acciones Rápidas' },
      { id: 'act-new-content', type: 'action', title: 'Agendar Nuevo Contenido', target: 'content-desk', category: 'Acciones Rápidas' },
    ];

    if (!q) {
      return {
        results: actions,
        total: actions.length,
      };
    }

    const filteredTasks = tasks
      .filter(t => (t.title && t.title.toLowerCase().includes(q)) || (t.description && t.description.toLowerCase().includes(q)))
      .map(t => ({ id: `task-${t.id}`, type: 'task', title: t.title, target: 'project-desk', category: 'Tareas' }));

    const filteredProjects = projects
      .filter(p => (p.name || p.title || '').toLowerCase().includes(q))
      .map(p => ({ id: `proj-${p.id}`, type: 'project', title: p.name || p.title, target: 'project-desk', category: 'Proyectos' }));

    const filteredContent = contentItems
      .filter(c => (c.title || '').toLowerCase().includes(q))
      .map(c => ({ id: `content-${c.id}`, type: 'content', title: c.title, target: 'content-desk', category: 'Growth Content' }));

    const filteredActions = actions.filter(a => a.title.toLowerCase().includes(q));

    const results = [...filteredActions, ...filteredTasks, ...filteredProjects, ...filteredContent];

    return {
      results,
      total: results.length,
    };
  }, [tasks, projects, contentItems, query]);
}
