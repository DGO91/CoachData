import React from 'react';
import { FolderOpen, Plus, FileText, Users, CheckCircle2 } from 'lucide-react';

export default function EmptyState({
  icon = 'folder',
  title = 'No hay datos disponibles',
  description = 'No se han encontrado registros en esta sección.',
  actionLabel,
  onAction
}) {
  const renderIcon = () => {
    switch (icon) {
      case 'file':
        return <FileText size={32} />;
      case 'users':
        return <Users size={32} />;
      case 'check':
        return <CheckCircle2 size={32} />;
      default:
        return <FolderOpen size={32} />;
    }
  };

  return (
    <div className="w-full p-8 rounded-xl border border-borderColor bg-bgSurface flex flex-col items-center justify-center text-center gap-3 animate-fade-in my-4">
      <div className="w-14 h-14 rounded-full bg-bgMuted flex items-center justify-center text-textMuted border border-borderColor mb-1">
        {renderIcon()}
      </div>
      <h3 className="text-base font-bold text-textMain tracking-tight">{title}</h3>
      <p className="text-xs text-textMuted max-w-md leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
