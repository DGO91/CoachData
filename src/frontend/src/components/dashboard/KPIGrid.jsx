// src/frontend/src/components/dashboard/KPIGrid.jsx
import React from 'react';
import { TasksOpenCard } from './TasksOpenCard';
import { TasksOverdueCard } from './TasksOverdueCard';
import { ActiveProjectsCard } from './ActiveProjectsCard';
import { ContentScheduledCard } from './ContentScheduledCard';
import { AIActivityCard } from './AIActivityCard';

export function KPIGrid({ organizationId, tasks = [], language = 'es' }) {
  return (
    <div className="ogd-kpi-grid">
      <TasksOpenCard tasks={tasks} language={language} />
      <TasksOverdueCard tasks={tasks} language={language} />
      <ActiveProjectsCard organizationId={organizationId} tasks={tasks} language={language} />
      <ContentScheduledCard organizationId={organizationId} language={language} />
      <AIActivityCard organizationId={organizationId} language={language} />
    </div>
  );
}
