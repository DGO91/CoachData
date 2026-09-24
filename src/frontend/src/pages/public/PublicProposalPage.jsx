import React, { useState, useEffect } from 'react';
import './PublicProposalPage.css';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, Check, X } from 'lucide-react';

// governance-allow: design-tokens — página pública standalone sin acceso al shell de la app ni a :root CSS vars.
// Los colores de marca están hardcoded porque este componente se sirve como documento público aislado
// donde no se garantiza que el documento raíz cargue index.css del SPA.

function fmt(cents, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format((cents || 0) / 100);
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
function expiringSoon(iso) {
  if (!iso) return false;
  const d = new Date(iso) - new Date();
  return d > 0 && d < 3 * 86400000;
}
function statusLabel(s) {
  return { sent: 'Pendiente de firma', approved: 'Aprobada', converted: 'Convertida', rejected: 'Rechazada', expired: 'Expirada' }[s] || s;
}
function statusClass(s) {
  return { sent: 'pp-status-sent', approved: 'pp-status-approved', converted: 'pp-status-approved', rejected: 'pp-status-rejected', expired: 'pp-status-expired' }[s] || 'pp-status-sent';
}

export default function PublicProposalPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionErr, setActionErr] = useState(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  useEffect(() => {
    if (!token) { setErr({ code: 400, msg: 'Enlace de propuesta inválido.' }); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/public/proposals/${token}`);
        if (res.status === 404) { setErr({ code: 404, msg: 'Esta propuesta no existe o el enlace ha caducado.' }); return; }
        if (res.status === 410) { setErr({ code: 410, msg: 'Esta propuesta ha expirado y ya no puede ser revisada.' }); return; }
        if (!res.ok) { setErr({ code: res.status, msg: 'Error al cargar la propuesta.' }); return; }
        const data = await res.json();
        data.proposal ? setProposal(data.proposal) : setErr({ code: 500, msg: 'No se pudieron obtener los datos.' });
      } catch { setErr({ code: 0, msg: 'Error de conexión. Comprueba tu red e inténtalo de nuevo.' }); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const doApprove = async () => {
    setSubmitting(true); setActionErr(null);
    try {
      const res = await fetch(`/api/public/proposals/${token}/approve`, { method: 'POST' });
      const data = await res.json();
      data.success ? setApproved(true) : setActionErr(data.error || 'No se pudo procesar la aprobación.');
    } catch { setActionErr('Error de conexión.'); }
    finally { setSubmitting(false); }
  };

  const doReject = async () => {
    // governance-allow: native-dialog — este componente es público standalone; useNotifications() no está disponible fuera del shell.
    // Se usa un estado de confirmación interno en vez de window.confirm.
    if (!confirmingReject) { setConfirmingReject(true); return; }
    setConfirmingReject(false);
    setSubmitting(true); setActionErr(null);
    try {
      const res = await fetch(`/api/public/proposals/${token}/reject`, { method: 'POST' });
      const data = await res.json();
      data.success ? setRejected(true) : setActionErr(data.error || 'No se pudo procesar el rechazo.');
    } catch { setActionErr('Error de conexión.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (<><div className="pp-full-center"><div className="pp-loading-spinner" /><div className="pp-loading-text">Cargando propuesta comercial…</div></div></>);
  if (err) return (<><div className="pp-full-center"><div className="pp-error-code">{err.code || '?'}</div><div className="pp-error-title">Propuesta no disponible</div><div className="pp-error-sub">{err.msg}</div></div></>);

  if (approved) return (
    <>
    <div className="pp-full-center">
      <div className="pp-result-icon success"><CheckCircle2 size={38} /></div>
      <h1 className="pp-result-title">Propuesta Aprobada</h1>
      <p className="pp-result-sub">Tu aceptación digital ha sido registrada. El equipo ha sido notificado y tu proyecto operativo ha sido activado.</p>
      <div className="pp-result-box"><strong>¿Qué ocurre ahora?</strong>Nuestro equipo se pondrá en contacto en las próximas 24 horas para coordinar el arranque.</div>
    </div></>
  );

  if (rejected) return (
    <>
    <div className="pp-full-center">
      <div className="pp-result-icon danger"><XCircle size={38} /></div>
      <h1 className="pp-result-title">Propuesta No Aceptada</h1>
      <p className="pp-result-sub">Has indicado que esta propuesta no se ajusta a tus necesidades. El equipo ha sido notificado.</p>
      <div className="pp-result-box"><strong>¿Cambias de opinión?</strong>Contacta directamente con el equipo para revisar alternativas.</div>
    </div></>
  );

  const canAct = proposal?.status === 'sent';
  const items = proposal?.items || [];
  const expiring = expiringSoon(proposal?.expiresAt);

  return (
    <>
      
      <div className="pp-topbar">
        <span className="pp-topbar-brand">Propuesta Comercial</span>
        <div className="pp-topbar-badge"><div className="pp-topbar-dot" />Documento seguro · Solo lectura</div>
      </div>
      <div className="pp-main">
        {expiring && canAct && (
          <div style={{ display:'flex',alignItems:'center',gap:'.75rem',padding:'.75rem 1.25rem',background:'rgba(125,95,30,.08)',border:'1px solid rgba(125,95,30,.3)',borderRadius:'2px',marginBottom:'1rem',fontSize:'.78rem',color:'#7D5F1E',fontWeight:500 }}>
            <Clock size={15} style={{ flexShrink:0 }} />
            Esta propuesta expira el {fmtDate(proposal?.expiresAt)}. Apruébala antes de que caduque.
          </div>
        )}

        <div className="pp-doc-header">
          <div className="pp-doc-meta">
            <div>
              <div className="pp-doc-number">Propuesta · #{token?.slice(0,8).toUpperCase()}</div>
              <h1 className="pp-doc-title">{proposal?.title}</h1>
            </div>
            <span className={`pp-status-badge ${statusClass(proposal?.status)}`}>{statusLabel(proposal?.status)}</span>
          </div>
          <div className="pp-doc-parties">
            <div className="pp-party"><div className="pp-party-label">Preparado para</div><div className="pp-party-name">{proposal?.clientName || '—'}</div></div>
            <div className="pp-party"><div className="pp-party-label">Emitido por</div><div className="pp-party-name">CoachData · Equipo Comercial</div></div>
          </div>
          <div className="pp-doc-meta-row">
            <div className="pp-meta-item"><span className="pp-meta-label">Moneda</span><span className="pp-meta-value">{(proposal?.currency||'EUR').toUpperCase()}</span></div>
            {proposal?.expiresAt && <div className="pp-meta-item"><span className="pp-meta-label">Válida hasta</span><span className={`pp-meta-value${expiring?' expiring':''}`}>{fmtDate(proposal.expiresAt)}</span></div>}
            <div className="pp-meta-item"><span className="pp-meta-label">Total propuesta</span><span className="pp-meta-value" style={{ fontSize:'1rem',fontWeight:700,color:'#2D4A3A' }}>{fmt(proposal?.totalAmount,proposal?.currency)}</span></div> /* governance-allow: design-tokens */
          </div>
        </div>

        {items.length > 0 && (
          <>
            <div className="pp-section-label">Servicios incluidos</div>
            <div className="pp-items">
              <div className="pp-items-head"><span>Descripción</span><span className="right">Uds.</span><span className="right">Precio unit.</span><span className="right">Total</span></div>
              {items.map((item, idx) => (
                <div key={idx} className="pp-item-row">
                  <span className="pp-item-desc">{item.description}</span>
                  <span className="pp-item-qty">{item.quantity ?? 1}</span>
                  <span className="pp-item-unit">{fmt(item.unit_price ?? item.unitPrice, proposal?.currency)}</span>
                  <span className="pp-item-total">{fmt(item.line_total ?? item.lineTotal, proposal?.currency)}</span>
                </div>
              ))}
            </div>
            <div className="pp-totals">
              {proposal?.subtotal != null && <div className="pp-total-row"><span className="pp-total-label">Subtotal</span><span className="pp-total-value">{fmt(proposal.subtotal,proposal.currency)}</span></div>}
              {proposal?.taxAmount > 0 && <div className="pp-total-row"><span className="pp-total-label">IVA</span><span className="pp-total-value">{fmt(proposal.taxAmount,proposal.currency)}</span></div>}
              <div className="pp-total-grand"><span className="pp-total-label">Total a abonar</span><span className="pp-total-value">{fmt(proposal.totalAmount,proposal.currency)}</span></div>
            </div>
          </>
        )}

        {canAct ? (
          <div className="pp-acceptance">
            <div className="pp-acceptance-heading">Aceptación Digital de Propuesta</div>
            <p className="pp-acceptance-legalese">
              Al hacer clic en «Aprobar Propuesta», confirmas que has leído, entendido y aceptas las condiciones
              y servicios descritos en este documento. Esta acción queda registrada con tu dirección IP y la
              marca temporal exacta, constituyendo una confirmación jurídicamente válida de tu aceptación.
            </p>
            {actionErr && (
              <div style={{ display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.78rem',color:'#B4302B',padding:'.75rem',background:'rgba(180,48,43,.06)',border:'1px solid rgba(180,48,43,.2)',borderRadius:'2px' }}>
                <AlertTriangle size={14} style={{ flexShrink:0 }} />{actionErr}
              </div>
            )}
            <div className="pp-btn-row">
              {confirmingReject ? (
                <>
                  <span style={{ fontSize:'.72rem',color:'#B4302B',alignSelf:'center',fontFamily:"'Montserrat',sans-serif" }}>¿Estás seguro?</span>
                  <button className="pp-btn-reject" style={{ borderColor:'rgba(180,48,43,.6)',fontWeight:700 }} onClick={doReject} disabled={submitting}><Check size={14} />Confirmar rechazo</button>
                  <button className="pp-btn-reject" style={{ color:'#5c6b64',borderColor:'rgba(0,0,0,.15)' }} onClick={() => setConfirmingReject(false)} disabled={submitting}><X size={14} />Cancelar</button>
                </>
              ) : (
                <button className="pp-btn-reject" onClick={doReject} disabled={submitting}><X size={14} />Rechazar</button>
              )}
              <button className="pp-btn-approve" onClick={doApprove} disabled={submitting || confirmingReject}>
                {submitting ? <><RefreshCw size={14} style={{ animation:'spin .8s linear infinite' }} /> Procesando…</> : <><Check size={16} /> Aprobar Propuesta</>}
              </button>
            </div>

          </div>
        ) : (
          <div style={{ marginTop:'1.5rem',padding:'1.25rem 1.5rem',background:'#fff',border:'1px solid rgba(0,0,0,.1)',borderRadius:'2px',fontSize:'.8rem',color:'#5c6b64',display:'flex',alignItems:'center',gap:'.75rem',fontFamily:"'Montserrat',sans-serif" }}>
            <AlertTriangle size={15} style={{ flexShrink:0,color:'#7D5F1E' }} />
            Esta propuesta ya no permite acciones. Estado actual: <strong style={{ color:'#1E2925',marginLeft:'.25rem' }}>{statusLabel(proposal?.status)}</strong>
          </div>
        )}

        <div className="pp-footer">
          Documento generado por <a href="/">CoachData Operational OS</a> · Plataforma de gestión comercial<br />
          Este enlace es personal e intransferible · Tu actividad en este documento queda registrada
        </div>
      </div>
    </>
  );
}
