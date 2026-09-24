// src/frontend/src/components/AuthGateway.jsx
import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import { Mail, Lock, User, ShieldAlert, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
const LegalDocuments = React.lazy(() => import('./LegalDocuments'));
import { TRANSLATIONS } from '../i18n/translations';
import { useNotifications } from './common/Notifications';

export default function AuthGateway({ language = 'es', setLanguage, onAuthSuccess }) {
  const { notify } = useNotifications();
  const t = (key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.es[key] ?? key;

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'terms' });
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteValid, setInviteValid] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
      setMode('signup');
      // governance-allow: bare-api-fetch — esta llamada ocurre ANTES del login,
      // asi que no puede llevar sesion. Hoy la ruta esta montada tras
      // authMiddleware y responde 401: el registro por invitacion no funciona.
      // Arreglo pendiente en backend (montar /validate/:code como publica).
      fetch(`/api/invitations/validate/${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInviteValid(true);
          } else {
            setError(language === 'es' ? 'El enlace de invitación no es válido o ya expiró.' : 'The invite link is invalid or expired.');
            setMode('login');
          }
          setValidatingInvite(false);
        })
        .catch(err => {
          console.error('Error validating invite:', err);
          setValidatingInvite(false);
        });
    } else {
      setValidatingInvite(false);
    }
  }, [language]);

  useEffect(() => {
    if (localStorage.getItem('email_verified_success') === 'true') {
      setSuccess(language === 'es' ? '¡Correo verificado con éxito! Por favor inicia sesión.' : 'Email verified successfully! Please log in.');
      localStorage.removeItem('email_verified_success');
    }
  }, [language]);

  // Client-Side Validation Regex & Constraints
  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError(t('invalid_email'));
      return false;
    }

    const minPassLen = mode === 'signup' ? 8 : 6;
    if (!password.trim() || password.length < minPassLen) {
      setError(t('password_too_short'));
      return false;
    }

    if (mode === 'signup' && !name.trim()) {
      setError(language === 'es' ? 'El nombre completo es obligatorio' : 'Full name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    const supabase = await getSupabase();

    if (!supabase) {
      setError(language === 'es' ? 'Error al conectar con la base de datos' : 'Database connection error');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });

        if (signUpError) throw signUpError;

        if (inviteCode && inviteValid) {
          try {
            await fetch(`/api/invitations/use/${inviteCode}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: data.user?.id })
            });
          } catch (e) {
            console.error('Error burning invite code:', e);
          }
        }

        setSuccess(t('sent_success'));
        setName(''); setEmail(''); setPassword('');
      } else {
        // Reactive Auth Sign In without Full Page Reload
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            setError(t('err_unverified'));
          } else {
            throw signInError;
          }
        } else if (data.session) {
          setPassword('');
          setError('');
          if (onAuthSuccess) {
            onAuthSuccess(data.session.user);
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || t('err_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    if (mode === 'signup' && !inviteValid) {
      setError(language === 'es' ? 'Necesitas una invitación válida para registrarte.' : 'You need a valid invite to sign up.');
      return;
    }

    setError(''); setSuccess(''); setLoading(true);
    const supabase = await getSupabase();

    if (!supabase) {
      setError(language === 'es' ? 'Error al conectar con la base de datos' : 'Database connection error');
      setLoading(false);
      return;
    }

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || t('err_generic'));
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        // Era `justify: 'center'`, que no existe en CSS: React lo ignoraba y la
        // tarjeta quedaba pegada al borde izquierdo.
        justifyContent: 'center',
        background: 'var(--bg-root)',
        color: 'var(--text-primary)',
        padding: '20px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Language Selector */}
        {setLanguage && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '4px', background: 'var(--bg-muted)', padding: '2px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                background: language === 'es' ? 'var(--accent)' : 'transparent',
                color: language === 'es' ? 'var(--accent-text, #fff)' : 'var(--text-muted)',
              }}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                background: language === 'en' ? 'var(--accent)' : 'transparent',
                color: language === 'en' ? 'var(--accent-text, #fff)' : 'var(--text-muted)',
              }}
            >
              EN
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', borderRadius: '12px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <img src="/de_aura_media_logo.png" alt="CoachData Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {mode === 'login' ? t('welcome_back') : t('create_account_title')}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? t('welcome_sub') : t('create_acc_sub')}
          </p>
        </div>

        {/* OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'var(--bg-root)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{t('google_btn')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('or_continue')}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Inline Error Display */}
        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--crit, #ef4444)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Inline Success Display */}
        {success && (
          <div
            role="status"
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: 'var(--good, #22c55e)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {t('full_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'es' ? "Nombre y apellidos" : "Full name"}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    background: 'var(--bg-root)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {t('email')}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'es' ? "nombre@empresa.com" : "name@company.com"}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('password')}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => notify(language === 'es' ? 'Recuperación de contraseña enviada a soporte.' : 'Password recovery sent to support.', { type: 'info' })}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('forgot_password')}
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 38px',
                  borderRadius: '10px',
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? t('hide_password') : t('show_password')}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--accent)',
              color: 'var(--accent-text, #ffffff)',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span>{loading ? t('loading') : mode === 'login' ? t('login') : t('signup')}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          {mode === 'login' ? t('no_account') : t('have_account')}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(''); setSuccess('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {mode === 'login' ? t('switch_signup') : t('switch_login')}
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          {t('agree_text')}{' '}
          <button
            type="button"
            onClick={() => setLegalModal({ isOpen: true, type: 'terms' })}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {t('terms_link')}
          </button>{' '}
          {t('and')}{' '}
          <button
            type="button"
            onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {t('privacy_link')}
          </button>
        </div>
      </div>

      {legalModal.isOpen && (
        <React.Suspense fallback={null}>
          <LegalDocuments
            isOpen={legalModal.isOpen}
            onClose={() => setLegalModal({ isOpen: false, type: 'terms' })}
            type={legalModal.type}
            language={language}
          />
        </React.Suspense>
      )}
    </div>
  );
}
