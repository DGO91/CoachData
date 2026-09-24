import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export function ServiceCatalogCard({ serviceCatalog = [], onChange, language = 'es' }) {
  const [newService, setNewService] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    if (!newService.trim()) return;
    const updated = [...serviceCatalog, newService.trim()];
    onChange('service_catalog', updated);
    setNewService('');
  };

  const handleDelete = (index) => {
    const updated = serviceCatalog.filter((_, i) => i !== index);
    onChange('service_catalog', updated);
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingText(serviceCatalog[index]);
  };

  const handleSaveEdit = (index) => {
    if (!editingText.trim()) return;
    const updated = [...serviceCatalog];
    updated[index] = editingText.trim();
    onChange('service_catalog', updated);
    setEditingIndex(null);
    setEditingText('');
  };

  return (
    <section className="glass-panel-inner p-6 flex flex-col gap-5 border border-borderColor rounded-xl bg-bgSurface">
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="font-bold text-textMain text-lg">
              {language === 'es' ? 'Catálogo de Servicios' : 'Service Catalog'}
            </h3>
            <p className="text-xs text-textMuted">
              {language === 'es' ? 'Listado de servicios reales que ofrece tu empresa para sugerir en los análisis' : 'Real services offered by your business for AI recommendation scoping'}
            </p>
          </div>
        </div>
      </div>

      {/* Input to add */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 px-3.5 py-2.5 bg-bgMuted border border-borderColor rounded-lg text-sm text-textMain focus:outline-none focus:border-[var(--accent)] transition-colors"
          placeholder={language === 'es' ? 'Añadir nuevo servicio (ej. Auditoría Operativa)...' : 'Add new service…'}
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Plus size={16} />
          {language === 'es' ? 'Añadir' : 'Add'}
        </button>
      </div>

      {/* Services List */}
      <div className="flex flex-col gap-2">
        {serviceCatalog.length === 0 ? (
          <div className="p-4 border border-dashed border-borderColor rounded-lg text-center text-xs text-textMuted">
            {language === 'es' ? 'No has añadido servicios aún. Agrega al menos un servicio.' : 'No services added yet.'}
          </div>
        ) : (
          serviceCatalog.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-bgMuted border border-borderColor rounded-lg text-sm">
              {editingIndex === index ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    className="flex-1 px-2.5 py-1 bg-bgSurface border border-borderColor rounded text-xs text-textMain focus:outline-none"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                  />
                  <button type="button" onClick={() => handleSaveEdit(index)} className="p-1 text-green-600 hover:text-green-700">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setEditingIndex(null)} className="p-1 text-textMuted">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-textMain font-medium">{service}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleStartEdit(index)} className="p-1.5 text-textMuted hover:text-textMain transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button type="button" onClick={() => handleDelete(index)} className="p-1.5 text-red-500 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
