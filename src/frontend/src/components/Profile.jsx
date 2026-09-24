import React, { useState } from 'react';
import { User, Mail, Shield, Briefcase, Calendar, Globe, CheckCircle, AlertTriangle, Trash2, Link as LinkIcon, Copy, Settings, BookOpen } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
const KnowledgeBase = React.lazy(() => import('./KnowledgeBase'));

const TRANSLATIONS = {
  en: {
    profile: 'Profile',
    profile_sub: 'Your personal account information.',
    role: 'Role',
    email: 'Email',
    name: 'Full Name',
    organization: 'Organization',
    joined: 'Member Since',
    region: 'Region',
    status: 'Account Status',
    active: 'Active',
    admin: 'Administrator',
    not_set: 'Not specified',
    danger_zone: 'Danger Zone',
    delete_account: 'Delete Account',
    delete_account_desc: 'Permanently delete your profile, API keys, leads, and all operational records.',
    delete_confirm_title: 'Are you absolutely sure?',
    delete_confirm_desc: 'This action is irreversible. It will immediately purge all your credentials, client contacts, and agent briefing histories from our production databases.',
    delete_confirm_keyword: 'Type DELETE below to confirm:',
    delete_confirm_btn: 'I understand the consequences, delete my account',
    delete_cancel_btn: 'Cancel',
    deleting: 'Deleting account…',
    error_deleting: 'Failed to delete account. Please try again.',
    admin_actions: 'Admin Actions',
    generate_invite: 'Generate Invite Link',
    generate_invite_desc: 'Create a one-time use link to invite a new client to the platform.',
    invite_generated: 'Invite link generated!',
    copy_link: 'Copy Link',
    copied: 'Copied!',
    error_invite: 'Failed to generate invite.',
    idCard: 'ID Card',
    systemPrefs: 'System Preferences'
  },
  es: {
    profile: 'Perfil',
    profile_sub: 'Tu información personal de cuenta.',
    role: 'Rol',
    email: 'Correo',
    name: 'Nombre Completo',
    organization: 'Organización',
    joined: 'Miembro Desde',
    region: 'Región',
    status: 'Estado de Cuenta',
    active: 'Activo',
    admin: 'Administrador',
    not_set: 'No especificado',
    danger_zone: 'Zona de Peligro',
    delete_account: 'Eliminar Cuenta',
    delete_account_desc: 'Borra permanentemente tu perfil, llaves de API, contactos e historial de agentes.',
    delete_confirm_title: '¿Estás absolutamente seguro?',
    delete_confirm_desc: 'Esta acción es completamente irreversible. Purga de inmediato todas tus credenciales, contactos e historial de briefings de las bases de datos de producción.',
    delete_confirm_keyword: 'Escribe ELIMINAR a continuación para confirmar:',
    delete_confirm_btn: 'Entiendo las consecuencias, eliminar mi cuenta',
    delete_cancel_btn: 'Cancelar',
    deleting: 'Eliminando cuenta…',
    error_deleting: 'Error al eliminar la cuenta. Por favor, inténtalo de nuevo.',
    admin_actions: 'Acciones de Administrador',
    generate_invite: 'Generar Enlace de Invitación',
    generate_invite_desc: 'Crea un enlace de un solo uso para invitar a un nuevo cliente a la plataforma.',
    invite_generated: '¡Enlace generado!',
    copy_link: 'Copiar Enlace',
    copied: '¡Copiado!',
    error_invite: 'Error al generar invitación.',
    idCard: 'Tarjeta de Identificación',
    systemPrefs: 'Preferencias del Sistema'
  },
};

export default function Profile({ language, userProfile }) {
  const t = (key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [inviteLink, setInviteLink] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);

  const name = userProfile?.name || userProfile?.displayName || (language === 'es' ? 'Usuario' : 'User');
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const email = userProfile?.email || t('not_set');
  const role = userProfile?.role || t('admin');
  const organization = userProfile?.organization || 'CoachData Media';
  const joined = userProfile?.joined
    ? new Date(userProfile.joined).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long' })
    : '2024';
  const region = userProfile?.region || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Global';

  const FIELDS = [
    { key: 'name',   icon: <User size={16}/>,      label: t('name'),         value: name },
    { key: 'email',  icon: <Mail size={16}/>,      label: t('email'),        value: email },
    { key: 'role',   icon: <Shield size={16}/>,    label: t('role'),         value: role },
    { key: 'org',    icon: <Briefcase size={16}/>, label: t('organization'), value: organization },
    { key: 'joined', icon: <Calendar size={16}/>,  label: t('joined'),       value: joined },
    { key: 'region', icon: <Globe size={16}/>,     label: t('region'),       value: region },
  ];

  const handleDeleteAccount = async () => {
    setDeleteError(''); setDeleting(true);
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error(language === 'es' ? 'No se pudo conectar a la base de datos.' : 'Could not connect to database.');
      const { error } = await supabase.rpc('delete_own_user');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch (err) {
      setDeleteError(err.message || t('error_deleting'));
      setDeleting(false);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true); setInviteError(''); setCopied(false); setInviteLink('');
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/invitations/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate');
      setInviteLink(`${window.location.origin}/?invite=${data.invite.code}`);
    } catch (err) {
      setInviteError(t('error_invite'));
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* HEADER INFO */}
      <div className="agent-header">
        <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
          {t('profile')}
        </h1>
        <p className="text-sm text-textMuted leading-relaxed max-w-4xl">{t('profile_sub')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Identity Card */}
        <aside className="flex flex-col gap-6 sticky top-6">
          <div className="glass-panel p-6 rounded-3xl border border-borderColor bg-bgSurface shadow-lg flex flex-col items-center text-center">
            <div className="relative mb-6 mt-4">
              <div className="w-28 h-28 rounded-full bg-[var(--bg-muted)] border-4 border-bgMain flex items-center justify-center text-3xl font-bold text-textMain shadow-[0_0_20px_rgba(100,135,116,0.3)]">
                {initials}
              </div>
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[var(--success)] border-4 border-bgMain shadow-sm" title={t('active')}></div>
            </div>
            
            <h2 className="text-2xl font-bold text-textMain mb-1 agent-section-title">{name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2 bg-[var(--accent-glow)] text-[var(--accent)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-[rgba(100,135,116,0.2)]">
              <CheckCircle size={12} />
              {role}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Fields & Admin Actions */}
        <main className="flex flex-col gap-6">
          
          <div className="glass-panel-inner p-8 flex flex-col gap-6">
            <div className="border-b border-borderColor pb-4 flex items-center gap-3">
              <Settings size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
              <h2 className="font-bold text-textMain text-xl agent-section-title">{t('idCard')}</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4 p-4 bg-bgMuted border border-borderColor rounded-xl hover:border-[var(--accent)] transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-bgSurface flex items-center justify-center text-textMuted group-hover:text-[var(--accent)] group-hover:bg-[var(--accent-glow)] transition-colors">
                    {field.icon}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{field.label}</span>
                    <span className="text-sm font-medium text-textMain truncate mt-0.5">{field.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Actions */}
          {role && role.toLowerCase().includes('admin') && (
            <div className="glass-panel-inner p-8 flex flex-col gap-6" style={{ borderColor: 'var(--accent)' }}>
              <div className="border-b border-borderColor pb-4 flex items-center gap-3">
                <Shield size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
                <h2 className="font-bold text-textMain text-xl agent-section-title">{t('admin_actions')}</h2>
              </div>
              
              <div className="flex flex-col gap-2">
                <p className="text-sm text-textMuted mb-2">{t('generate_invite_desc')}</p>
                <button 
                  className="premium-btn py-3 px-6 inline-flex w-max items-center gap-2 font-bold text-sm"
                  disabled={generatingInvite}
                  onClick={handleGenerateInvite}
                >
                  <LinkIcon size={16} />
                  {generatingInvite ? '...' : t('generate_invite')}
                </button>

                {inviteError && <p className="text-[var(--danger)] text-sm mt-2">{inviteError}</p>}
                
                {inviteLink && (
                  <div className="mt-4 p-4 bg-bgMuted border border-borderColor rounded-xl animate-fade-in flex flex-col gap-3">
                    <span className="text-xs font-bold text-[var(--success)] uppercase tracking-wider">{t('invite_generated')}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={inviteLink} 
                        className="flex-1 bg-bgSurface border border-borderColor rounded-lg py-2 px-3 text-xs font-mono text-textMain focus:outline-none"
                      />
                      <button 
                        onClick={copyToClipboard}
                        className="bg-[var(--accent)] text-[var(--accent-text)] font-bold py-2 px-4 rounded-lg text-xs hover:bg-[var(--accent)] transition-colors flex items-center gap-2"
                      >
                        <Copy size={14} />
                        {copied ? t('copied') : t('copy_link')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="glass-panel-inner p-8 flex flex-col gap-6" style={{ borderColor: 'rgba(217,83,79,0.3)', backgroundColor: 'rgba(217,83,79,0.02)' }}>
            <div className="border-b border-[rgba(217,83,79,0.2)] pb-4 flex items-center gap-3">
              <AlertTriangle size={20} style={{ color: 'var(--crit)' }} />
              <h2 className="font-bold text-xl agent-section-title" style={{ color: 'var(--crit)' }}>{t('danger_zone')}</h2>
            </div>
            
            <div className="flex flex-col gap-2">
              <p className="text-sm text-textMuted mb-2">{t('delete_account_desc')}</p>
              <button 
                className="bg-[rgba(217,83,79,0.1)] text-[var(--danger)] border border-[rgba(217,83,79,0.3)] py-3 px-6 rounded-xl font-bold inline-flex w-max items-center gap-2 hover:bg-[var(--danger)] hover:text-white transition-all shadow-sm"
                onClick={() => {
                  setDeleteConfirmText('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 size={16} />
                {t('delete_account')}
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bg-bgSurface border border-borderColor rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-[var(--danger)] mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold agent-section-title">{t('delete_confirm_title')}</h3>
            </div>

            <p className="text-sm text-textMuted leading-relaxed mb-6">
              {t('delete_confirm_desc')}
            </p>

            {deleteError && (
              <div className="bg-[rgba(217,83,79,0.1)] border border-[rgba(217,83,79,0.2)] text-[var(--danger)] p-3 rounded-lg text-xs font-bold mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-8">
              <label className="text-xs font-bold text-textMuted uppercase tracking-wider">{t('delete_confirm_keyword')}</label>
              <input
                type="text"
                placeholder={language === 'es' ? 'ELIMINAR' : 'DELETE'}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deleting}
                className={`w-full bg-bgMuted border rounded-lg py-3 px-4 text-sm font-bold text-textMain focus:outline-none transition-colors ${
                  deleteConfirmText.toUpperCase() === (language === 'es' ? 'ELIMINAR' : 'DELETE') ? 'border-[var(--danger)] text-[var(--danger)]' : 'border-borderColor'
                }`}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                className="px-6 py-2.5 rounded-lg font-bold text-sm text-textMuted hover:bg-bgMuted transition-colors"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
              >
                {t('delete_cancel_btn')}
              </button>
              <button
                className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                  deleteConfirmText.toUpperCase() === (language === 'es' ? 'ELIMINAR' : 'DELETE') 
                    ? 'bg-[var(--danger)] text-white hover:opacity-90' 
                    : 'bg-bgMuted text-textMuted cursor-not-allowed opacity-50'
                }`}
                disabled={deleting || deleteConfirmText.toUpperCase() !== (language === 'es' ? 'ELIMINAR' : 'DELETE')}
                onClick={handleDeleteAccount}
              >
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {deleting ? t('deleting') : t('delete_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
