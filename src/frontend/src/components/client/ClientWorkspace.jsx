// src/frontend/src/components/client/ClientWorkspace.jsx
import React, { useState, useEffect } from 'react';
import { ClientProjectOverview } from './ClientProjectOverview';
import { ClientDeliverablesPanel } from './ClientDeliverablesPanel';
import { ClientCommentsPanel } from './ClientCommentsPanel';
import { ClientFilesPanel } from './ClientFilesPanel';
import { ClientTimelinePanel } from './ClientTimelinePanel';
import { useOperationsTasks } from '../../hooks/useOperationsTasks';
import { useActiveOrganizationId } from '../../hooks/useActiveOrganizationId';
import { TRANSLATIONS } from '../../i18n/translations';
import { getSupabase } from '../../supabaseClient';

export function ClientWorkspace({ organizationId: organizationIdProp, language = 'es' }) {
  const { organizationId: resolvedOrgId } = useActiveOrganizationId();
  const organizationId = organizationIdProp || resolvedOrgId;
  const { tasks } = useOperationsTasks(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const [project, setProject] = useState({
    id: 'demo-client-proj',
    title: 'Campamento Estratégico de Escala & Rebranding',
    description: 'Espacio exclusivo para la revisión y aprobación de entregables estratégicos.',
  });

  const [deliverables, setDeliverables] = useState([
    {
      id: 'del-1',
      title: 'Dossier de Posicionamiento & Arquitectura de Marca',
      description: 'Documento ejecutivo con el análisis de nicho, paleta HSL y tipografías.',
      status: 'pending_approval',
      deliverable_url: 'https://github.com/CoachDataMedia/coachdata-os',
    },
    {
      id: 'del-2',
      title: 'Prototipo Interactivo Suite de Agendamiento',
      description: 'Flujo completo de conversión y agendamiento sin Google Forms.',
      status: 'approved',
      deliverable_url: 'https://github.com/CoachDataMedia/coachdata-os',
    },
  ]);

  const [comments, setComments] = useState([
    { id: 'c1', author_name: 'Cliente VIP', content: 'Excelente avance en la propuesta visual del branding.', created_at: new Date().toISOString() },
  ]);

  const [files, setFiles] = useState([
    { id: 'f1', name: 'Brand_Identity_Guide_v2.pdf', url: '#' },
    { id: 'f2', name: 'Funnel_Conversion_Architecture.png', url: '#' },
  ]);

  const [activityHistory, setActivityHistory] = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);

  // Load task_activity_history for client timeline
  useEffect(() => {
    async function loadHistory() {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;
        const { data } = await supabase
          .from('task_activity_history')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data && data.length > 0) setActivityHistory(data);
      } catch (err) {
        console.warn('[ClientWorkspace] Activity log load warning:', err);
      }
    }
    loadHistory();
  }, [organizationId]);

  const handleApproveDeliverable = async (deliverableId) => {
    setDeliverables(prev =>
      prev.map(d => (d.id === deliverableId ? { ...d, status: 'approved' } : d))
    );
  };

  const handleRequestRevision = async (deliverableId, feedback) => {
    setDeliverables(prev =>
      prev.map(d => (d.id === deliverableId ? { ...d, status: 'revision_requested' } : d))
    );
    setComments(prev => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        author_name: 'Cliente VIP',
        content: `[Solicitud de Revisión]: ${feedback}`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleAddComment = (text) => {
    setComments(prev => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        author_name: 'Cliente VIP',
        content: text,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handleUploadSuccess = (newFile) => {
    setFiles(prev => [newFile, ...prev]);
  };

  const handleDeleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="ogd-shell" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="ogd-hero">
        <div>
          <h1 className="ogd-hero-title">{t.client_workspace}</h1>
          <div className="ogd-hero-sub">{t.client_workspace_sub}</div>
        </div>
      </div>

      {/* 1. Project Overview & Progress */}
      <ClientProjectOverview project={project} tasks={tasks} language={language} />

      {/* 2. Main Deliverables Section */}
      <ClientDeliverablesPanel
        deliverables={deliverables}
        onSelectDeliverable={(item) => setSelectedDeliverable(item)}
        language={language}
      />

      {/* 3. Split Collaboration Grid */}
      <div className="ogd-split-layout">
        <ClientCommentsPanel comments={comments} onAddComment={handleAddComment} language={language} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ClientFilesPanel
            files={files}
            onUploadSuccess={handleUploadSuccess}
            onDeleteFile={handleDeleteFile}
            organizationId={organizationId}
            projectId={project.id}
            isStaff={true}
            language={language}
          />
          <ClientTimelinePanel activityHistory={activityHistory} language={language} />
        </div>
      </div>

      {/* Approval Drawer */}
      <ClientApprovalDrawer
        isOpen={Boolean(selectedDeliverable)}
        onClose={() => setSelectedDeliverable(null)}
        deliverable={selectedDeliverable}
        onApprove={handleApproveDeliverable}
        onRequestRevision={handleRequestRevision}
        language={language}
      />
    </div>
  );
}

export default ClientWorkspace;
