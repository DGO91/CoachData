// src/frontend/src/components/common/DataTable.jsx
//
// Tabla de datos ordenable, con el sistema de tokens del proyecto.
//
// Estructura tomada del componente de tabla de 21st.dev (contenedor con scroll
// propio, cabecera ordenable con indicador de dirección, cuerpo de filas), pero
// escrita con <table> nativa y variables de tema: la librería original trae su
// propio CSS y su propio sistema de temas, y aquí el color lo mandan las ocho
// paletas de `data-theme`.
//
// Uso:
//   <DataTable
//     ariaLabel="Prospectos"
//     columns={[
//       { id: 'name', label: 'Nombre', sortable: true, sortValue: (r) => r.name },
//       { id: 'score', label: 'Puntuación', align: 'right', render: (r) => <Score row={r} /> },
//     ]}
//     rows={leads}
//     getRowId={(r) => r.id}
//     onRowClick={(r) => abrir(r)}
//     emptyState={<EmptyState … />}
//   />
//
// El orden se lleva dentro salvo que se pasen `sort` y `onSortChange`.
import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

function valorDeOrden(columna, fila) {
  if (typeof columna.sortValue === 'function') return columna.sortValue(fila);
  return fila?.[columna.id];
}

// Los nulos van siempre al final, suban o bajen el resto: un lead sin calificar
// no debe colarse arriba del todo solo por ordenar al revés.
function comparar(a, b) {
  const aVacio = a === null || a === undefined || a === '';
  const bVacio = b === null || b === undefined || b === '';
  if (aVacio && bVacio) return 0;
  if (aVacio) return 1;
  if (bVacio) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export default function DataTable({
  columns,
  rows,
  getRowId = (fila, i) => fila?.id ?? i,
  ariaLabel,
  onRowClick,
  emptyState = null,
  defaultSort = null,
  sort: sortControlado,
  onSortChange,
  minWidth = '640px',
  style,
}) {
  const [sortInterno, setSortInterno] = useState(defaultSort);
  const sort = sortControlado !== undefined ? sortControlado : sortInterno;

  const cambiarOrden = (columna) => {
    if (!columna.sortable) return;
    const siguiente =
      sort?.column === columna.id && sort.direction === 'ascending'
        ? { column: columna.id, direction: 'descending' } // governance-allow: invalid-style-prop — descriptor de orden, no un objeto de estilo
        : { column: columna.id, direction: 'ascending' }; // governance-allow: invalid-style-prop — descriptor de orden, no un objeto de estilo
    if (onSortChange) onSortChange(siguiente);
    if (sortControlado === undefined) setSortInterno(siguiente);
  };

  const filasOrdenadas = useMemo(() => {
    if (!sort?.column) return rows;
    const columna = columns.find((c) => c.id === sort.column);
    if (!columna) return rows;
    const factor = sort.direction === 'descending' ? -1 : 1;
    // Copia: ordenar in situ mutaría el estado del componente que nos pasa las filas.
    return [...rows].sort((a, b) => comparar(valorDeOrden(columna, a), valorDeOrden(columna, b)) * factor);
  }, [rows, sort, columns]);

  if (rows.length === 0 && emptyState) return emptyState;

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        background: 'var(--bg-surface)',
        ...style,
      }}
    >
      <table
        aria-label={ariaLabel}
        style={{
          width: '100%',
          minWidth,
          borderCollapse: 'collapse',
          fontSize: '13px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr>
            {columns.map((columna) => {
              const activa = sort?.column === columna.id;
              const direccion = activa ? sort.direction : null;
              const Icono = !columna.sortable
                ? null
                : !activa
                  ? ChevronsUpDown
                  : direccion === 'ascending'
                    ? ChevronUp
                    : ChevronDown;

              return (
                <th
                  key={columna.id}
                  scope="col"
                  // aria-sort es lo que anuncia el orden a un lector de pantalla:
                  // sin esto la flecha solo existe para quien la ve.
                  aria-sort={activa ? direccion : columna.sortable ? 'none' : undefined}
                  style={{
                    padding: 0,
                    borderBottom: '1px solid var(--border)',
                    textAlign: columna.align || 'left',
                    width: columna.width,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {columna.sortable ? (
                    <button
                      type="button"
                      onClick={() => cambiarOrden(columna)}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: columna.align === 'right' ? 'flex-end' : 'flex-start',
                        gap: '6px',
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        color: activa ? 'var(--text-primary)' : 'var(--text-muted)',
                        font: 'inherit',
                        fontWeight: 600,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                      }}
                    >
                      {columna.label}
                      {Icono && <Icono size={13} aria-hidden="true" />}
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '10px 14px',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {columna.label}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((fila, i) => (
            <tr
              key={getRowId(fila, i)}
              onClick={onRowClick ? () => onRowClick(fila) : undefined}
              // Una fila que abre algo tiene que poder abrirse con el teclado.
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(fila);
                      }
                    }
                  : undefined
              }
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: i === filasOrdenadas.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              {columns.map((columna) => (
                <td
                  key={columna.id}
                  style={{
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    textAlign: columna.align || 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  {columna.render ? columna.render(fila) : fila?.[columna.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
