// src/frontend/src/pages/PublicLanding.jsx
import React, { useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  ArrowRight, Check, X, Users, Wallet, Radar,
  CreditCard, CalendarDays, GraduationCap, Mail, MessageCircle, FileText,
} from 'lucide-react';
import './public-landing.css';

/**
 * Landing pública.
 *
 * Decisiones que la gobiernan, para que no se diluyan al editarla:
 *
 * 1. Le habla SOLO a coaches. Una página que habla a agencias, consultores,
 *    coaches y speakers a la vez no convence a ninguno: el visitante no piensa
 *    "esto es para mí", piensa "esto es genérico".
 * 2. El objetivo es la LISTA DE ESPERA, no la venta. Hoy Stripe no puede
 *    confirmar pagos (falta STRIPE_WEBHOOK_SECRET) y el registro exige
 *    invitación: publicar precios que no se pueden cobrar quema la confianza
 *    del primer visitante, que es el más valioso.
 * 3. Las integraciones se muestran con su estado REAL. Pintar 40 logos como si
 *    todos funcionaran es la misma mentira que estamos corrigiendo dentro del
 *    producto.
 * 4. Sin testimonios ni logos de clientes hasta que existan de verdad.
 */

// Estado real de cada integración. Cambiar aquí cuando una pase a funcionar.
const TENTACLES = [
  { icon: CreditCard,    name: 'Stripe',     ready: true  },
  { icon: FileText,      name: 'Tally',      ready: true  },
  { icon: CalendarDays,  name: 'Calendly',   ready: false },
  { icon: GraduationCap, name: 'Kajabi',     ready: false },
  { icon: Mail,          name: 'Gmail',      ready: false },
  { icon: MessageCircle, name: 'WhatsApp',   ready: false },
];

/**
 * Una herramienta en la rejilla de conexiones.
 *
 * El estado no es decorativo: una tarjeta atenuada significa que esa conexión
 * todavía no existe. Va también en `title` y en el texto accesible, para que no
 * dependa solo de ver la opacidad.
 */
function IntegrationCard({ tool, t }) {
  if (!tool) return null;
  const { icon: Icon, name, ready } = tool;
  const estado = ready ? t.landingOctopusAvailable : t.landingOctopusSoon;

  return (
    <div className={`integration-card${ready ? '' : ' is-soon'}`} title={`${name} — ${estado}`}>
      <div className="integration-card-box">
        <Icon size={26} aria-hidden="true" />
      </div>
      <span className="integration-card-name">{name}</span>
      <span className="sr-only">{estado}</span>
    </div>
  );
}

export default function PublicLanding({ language = 'es', onToggleLanguage, onNavigate }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const isEs = language === 'es';

  const [form, setForm] = useState({ name: '', email: '', role: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const scrollToWaitlist = (e) => {
    if (e) e.preventDefault();
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('waitlist-email')?.focus({ preventScroll: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus('error');
      setErrorMsg(t.landingErrorEmail);
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/public/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role.trim(),
          locale: language,
          source: 'landing',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'request failed');
      // Éxito idéntico tanto si el correo es nuevo como si ya estaba: el backend
      // responde igual a propósito, para que nadie pueda usar el formulario
      // como oráculo y comprobar si una persona concreta se apuntó.
      setStatus('done');
    } catch (err) {
      console.error('[landing] waitlist:', err);
      setStatus('error');
      setErrorMsg(t.landingErrorGeneric);
    }
  };

  return (
    <div className="landing-root">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="landing-navbar">
        <div className="landing-nav-container">
          <a href="/" className="landing-logo-group" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="CoachData">
            <div className="landing-logo-icon">
              <img src="/de_aura_media_logo.png" alt="" />
            </div>
            <div className="landing-logo-text">
              <span className="brand-name">CoachData</span>
              <span className="brand-sub">{isEs ? 'para coaches' : 'for coaches'}</span>
            </div>
          </a>

          <div className="landing-nav-links">
            <a href="#problema" className="nav-link">{t.landingNavProduct}</a>
            <a href="#conexiones" className="nav-link">{t.landingNavHow}</a>
            <a href="#precios" className="nav-link">{t.landingNavPricing}</a>
          </div>

          <div className="landing-nav-actions">
            <button onClick={onToggleLanguage} className="landing-lang-btn" aria-label={isEs ? 'Cambiar idioma' : 'Change language'}>
              {language.toUpperCase()}
            </button>
            <button onClick={() => onNavigate && onNavigate('login')} className="btn-secondary">
              {t.landingLogin}
            </button>
            <button onClick={scrollToWaitlist} className="btn-primary">
              {t.landingJoin}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <header className="landing-hero-section">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <h1 className="landing-headline">{t.landingHeroTitle}</h1>
            <p className="landing-subheadline">{t.landingHeroSubtitle}</p>
            <div className="landing-hero-ctas">
              <button onClick={scrollToWaitlist} className="btn-primary landing-btn-hero">
                {t.landingJoin} <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a href="#problema" className="btn-secondary landing-btn-hero text-center">
                {t.landingNavHow}
              </a>
            </div>
            <p className="landing-hero-note">{t.landingHeroNote}</p>
          </div>

          {/* Mockup con cifras de un coach real, no de una agencia: quien se ve
              reflejado se queda; quien ve "€148.250 / 34 clientes" se va. */}
          <div className="landing-hero-preview" aria-hidden="true">
            <div className="hero-dashboard-card">
              <div className="hero-dash-header">
                <div className="hero-dash-title">
                  <div className="hero-dash-dot active" />
                  <span>{isEs ? 'Tu semana' : 'Your week'}</span>
                </div>
                <span className="hero-dash-status">{isEs ? 'En vivo' : 'Live'}</span>
              </div>

              <div className="hero-kpi-strip">
                <div className="hero-kpi">
                  <span className="hero-kpi-label">{isEs ? 'Cobrado este mes' : 'Billed this month'}</span>
                  <span className="hero-kpi-value">€6.400</span>
                </div>
                <div className="hero-kpi-divider" />
                <div className="hero-kpi">
                  <span className="hero-kpi-label">{isEs ? 'Clientes activos' : 'Active clients'}</span>
                  <span className="hero-kpi-value accent">12</span>
                </div>
                <div className="hero-kpi-divider" />
                <div className="hero-kpi">
                  <span className="hero-kpi-label">{isEs ? 'Sesiones' : 'Sessions'}</span>
                  <span className="hero-kpi-value">3</span>
                </div>
              </div>

              <div className="hero-activity-header">
                <span>{isEs ? 'Lo que necesita tu atención' : 'Needs your attention'}</span>
              </div>
              <div className="hero-activity-list">
                <div className="hero-activity-row">
                  <div className="hero-activity-info">
                    <span className="hero-activity-name">{isEs ? 'Marta lleva 3 semanas sin sesión' : 'Marta: no session in 3 weeks'}</span>
                    <span className="hero-activity-meta">{isEs ? 'Programa de 6 meses' : '6-month program'}</span>
                  </div>
                  <span className="hero-activity-badge warn">{isEs ? 'Seguir' : 'Follow up'}</span>
                </div>
                <div className="hero-activity-row">
                  <div className="hero-activity-info">
                    <span className="hero-activity-name">{isEs ? 'Pago recibido de Javier' : 'Payment from Javier'}</span>
                    <span className="hero-activity-meta">Stripe · €450</span>
                  </div>
                  <span className="hero-activity-badge ok">{isEs ? 'Al día' : 'Settled'}</span>
                </div>
                <div className="hero-activity-row">
                  <div className="hero-activity-info">
                    <span className="hero-activity-name">{isEs ? 'Propuesta pendiente de firma' : 'Proposal awaiting signature'}</span>
                    <span className="hero-activity-meta">{isEs ? 'Enviada hace 4 días' : 'Sent 4 days ago'}</span>
                  </div>
                  <span className="hero-activity-badge">{isEs ? 'Esperando' : 'Waiting'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── El problema: antes / después ───────────────────── */}
      <section id="problema" className="landing-section landing-problem-section">
        <div className="landing-section-content">
          <div className="section-header">
            <h2 className="landing-section-title">{t.landingProblemTitle}</h2>
            <p className="landing-section-sub">{t.landingProblemSub}</p>
          </div>

          <div className="problem-table" role="table" aria-label={t.landingProblemTitle}>
            <div className="problem-row problem-head" role="row">
              <span role="columnheader">{t.landingProblemBeforeLabel}</span>
              <span role="columnheader">{t.landingProblemAfterLabel}</span>
            </div>
            {[1, 2, 3, 4].map((n) => (
              <div className="problem-row" role="row" key={n}>
                <div className="problem-cell problem-before" role="cell">
                  <X size={15} aria-hidden="true" />
                  <span>{t[`landingProblem${n}Before`]}</span>
                </div>
                <div className="problem-cell problem-after" role="cell">
                  <Check size={15} aria-hidden="true" />
                  <span>{t[`landingProblem${n}After`]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Las conexiones (la metáfora del pulpo) ─────────── */}
      <section id="conexiones" className="landing-section landing-octopus-section alt-bg">
        <div className="landing-section-content">
          <div className="section-header">
            <span className="showcase-tag">{t.landingOctopusTag}</span>
            <h2 className="landing-section-title">{t.landingOctopusTitle}</h2>
            <p className="landing-section-sub">{t.landingOctopusSub}</p>
          </div>

          {/* Rejilla de conexiones: las herramientas rodean a la cabeza, que es
              literalmente el argumento del producto. Tres filas (2 · 3 · 2) con
              CoachData en el centro de la de en medio.
              Las herramientas y su estado salen de TENTACLES, arriba: aquí no se
              pinta ninguna que no exista en esa lista. */}
          <div className="integration-layout">
            <div className="integration-grid">
              <div className="integration-row">
                {TENTACLES.slice(0, 2).map((tool) => (
                  <IntegrationCard key={tool.name} tool={tool} t={t} />
                ))}
              </div>

              <div className="integration-row">
                <IntegrationCard tool={TENTACLES[2]} t={t} />
                <div className="integration-card is-hub">
                  <div className="integration-card-box">
                    <img src="/de_aura_media_logo.png" alt="CoachData" />
                  </div>
                  <span className="integration-card-name">{t.landingOctopusHead}</span>
                </div>
                <IntegrationCard tool={TENTACLES[3]} t={t} />
              </div>

              <div className="integration-row">
                {TENTACLES.slice(4).map((tool) => (
                  <IntegrationCard key={tool.name} tool={tool} t={t} />
                ))}
              </div>
            </div>

            <div className="integration-copy">
              <p className="octopus-head-sub">{t.landingOctopusHeadSub}</p>
              <ul className="integration-legend">
                <li><span className="legend-dot ready" aria-hidden="true" />{t.landingOctopusAvailable}</li>
                <li><span className="legend-dot" aria-hidden="true" />{t.landingOctopusSoon}</li>
              </ul>
              <button type="button" className="landing-btn-secondary" onClick={scrollToWaitlist}>
                {t.landingJoin} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Qué hace: tres cosas ───────────────────────────── */}
      <section className="landing-section landing-value-section">
        <div className="landing-section-content">
          <div className="section-header">
            <h2 className="landing-section-title">{t.landingValueTitle}</h2>
          </div>

          <div className="value-grid">
            {[
              { icon: Users,  title: t.landingValue1Title, body: t.landingValue1Body },
              { icon: Wallet, title: t.landingValue2Title, body: t.landingValue2Body },
              { icon: Radar,  title: t.landingValue3Title, body: t.landingValue3Body },
            ].map(({ icon: Icon, title, body }) => (
              <article className="value-card" key={title}>
                <div className="value-icon" aria-hidden="true"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Precios: sin cifras todavía ────────────────────── */}
      <section id="precios" className="landing-section landing-pricing-note alt-bg">
        <div className="landing-section-content">
          <div className="pricing-note-card">
            <h2>{t.landingPricingTitle}</h2>
            <p>{t.landingPricingBody}</p>
            <button onClick={scrollToWaitlist} className="btn-primary">
              {t.landingJoin} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Lista de espera ────────────────────────────────── */}
      <section id="waitlist" className="landing-section landing-waitlist-section">
        <div className="landing-section-content">
          <div className="waitlist-card">
            <div className="section-header">
              <h2 className="landing-section-title">{t.landingWaitlistTitle}</h2>
              <p className="landing-section-sub">{t.landingWaitlistSub}</p>
            </div>

            {status === 'done' ? (
              <div className="waitlist-done" role="status" aria-live="polite">
                <div className="waitlist-done-icon" aria-hidden="true"><Check size={22} /></div>
                <p>{t.landingSuccess}</p>
              </div>
            ) : (
              <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
                <div className="waitlist-field">
                  <label htmlFor="waitlist-name">{t.landingFieldName}</label>
                  <input
                    id="waitlist-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="waitlist-field">
                  <label htmlFor="waitlist-email">{t.landingFieldEmail}</label>
                  <input
                    id="waitlist-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    aria-invalid={status === 'error' && Boolean(errorMsg)}
                    aria-describedby={errorMsg ? 'waitlist-error' : undefined}
                  />
                </div>

                <div className="waitlist-field">
                  <label htmlFor="waitlist-role">{t.landingFieldRole}</label>
                  <input
                    id="waitlist-role"
                    name="role"
                    type="text"
                    placeholder={t.landingRolePlaceholder}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </div>

                {errorMsg && (
                  <p className="waitlist-error" id="waitlist-error" role="alert">{errorMsg}</p>
                )}

                <button type="submit" className="btn-primary waitlist-submit" disabled={status === 'sending'}>
                  {status === 'sending' ? t.landingSubmitting : t.landingSubmit}
                </button>
                <p className="waitlist-note">{t.landingHeroNote}</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="footer-brand">
            <span className="brand-name">CoachData</span>
            <span className="brand-sub">{isEs ? 'para coaches' : 'for coaches'}</span>
          </div>
          <div className="footer-links">
            <a href="#problema">{t.landingNavProduct}</a>
            <a href="#conexiones">{t.landingNavHow}</a>
            <a href="#precios">{t.landingNavPricing}</a>
            <a href="/terms">{isEs ? 'Términos' : 'Terms'}</a>
            <a href="/privacy">{isEs ? 'Privacidad' : 'Privacy'}</a>
          </div>
          <p className="footer-rights">
            © {new Date().getFullYear()} CoachData Media. {t.landingFooterRights}
          </p>
        </div>
      </footer>
    </div>
  );
}
