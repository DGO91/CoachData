import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../../supabaseClient';
import { AGENT_KEYS } from '../../core/constants/app.constants';
import { useNotifications } from '../../components/common/Notifications';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children, language, onLogout }) => {
  const { notify } = useNotifications();
  const [sessionUser, setSessionUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Construye el perfil del usuario. Vive FUERA del callback de
  // onAuthStateChange a propósito: ver el comentario del deadlock más abajo.
  const cargarPerfil = async (sb, user) => {
    const { data: profile } = await sb.from('profiles').select('*').eq('email', user.email).maybeSingle();
    setUserProfile({
      id: profile?.id || user.id,
      name: profile?.name || user.user_metadata?.name || user.email.split('@')[0],
      email: user.email,
      // Fallar CERRADO: si el perfil aun no ha cargado, el rol por defecto
      // es el de menos privilegio. Antes ponia 'Administrator', asi que un
      // cliente recien creado veia el menu y los datos de admin durante la
      // ventana de carga (y de forma permanente si la consulta fallaba).
      role: profile?.role || 'Client',
      joined: profile?.joined_at ? profile.joined_at.split('T')[0] : new Date().toISOString().split('T')[0],
      enabled_agents: profile?.enabled_agents || AGENT_KEYS.concat(['phase1', 'phase2', 'phase6', 'phase7'])
    });
  };

  useEffect(() => {
    let subscription = null;
    async function initAuth() {
      const sb = await getSupabase();
      setSupabaseClient(sb);
      if (sb) {
        const hash = window.location.hash || '';
        if (hash.includes('type=signup')) {
          localStorage.setItem('email_verified_success', 'true');
          await sb.auth.signOut();
          setSessionUser(null);
          setUserProfile(null);
          window.history.replaceState(null, null, ' ');
        }

        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          setSessionUser(session.user);
          await cargarPerfil(sb, session.user);
        }
        
        // Este callback es SÍNCRONO y tiene que seguir siéndolo.
        //
        // supabase-js ejecuta onAuthStateChange manteniendo tomado el lock de
        // auth (navigator.locks). Cualquier llamada al propio cliente desde
        // dentro —`sb.from(...)` incluida— necesita ese mismo lock para leer el
        // token, así que se queda esperando a que lo suelte el callback que la
        // está llamando. Se bloquean mutuamente y la promesa NO resuelve jamás.
        //
        // El síntoma no era un error: era la sesión iniciándose y la aplicación
        // quedándose fija en la pantalla de login, con la consola limpia,
        // porque setUserProfile no llegaba a ejecutarse nunca.
        //
        // El setTimeout(0) saca la consulta del turno del callback, momento en
        // el que el lock ya está libre.
        const { data } = sb.auth.onAuthStateChange((event, session) => {
          if (session) {
            setSessionUser(session.user);
            setTimeout(() => { cargarPerfil(sb, session.user); }, 0);
          } else {
            setSessionUser(null);
            setUserProfile(null);
          }
        });
        subscription = data.subscription;

        setAuthChecked(true);
      } else {
        // Sin sesión no hay perfil que cargar. Antes se llamaba a
        // /api/user-profile aquí, pero esa ruta (a) no existe con ese prefijo
        // —vive en /api/users/user-profile— y (b) está detrás de auth, así que
        // sin sesión nunca podría responder. Además devolvía el perfil local
        // del .env, que son los datos del administrador: justo lo que no debe
        // aparecer en la sesión de otra persona.
        setAuthChecked(true);
      }
    }
    initAuth();
    // El return de initAuth() no le llegaba nunca a React: el efecto devolvía
    // undefined y la suscripción quedaba viva. Ahora se cancela de verdad.
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    setSessionUser(null);
    setUserProfile(null);
    if (onLogout) onLogout();
  };

  useEffect(() => {
    if (!sessionUser) return;
    let inactivityTimer;
    const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // El logout dispara onLogout() -> window.location.href, una navegación
        // dura que destruye el DOM al instante. Antes, el alert() se llamaba
        // DESPUÉS de handleLogout(), así que no había garantía de que llegara
        // a mostrarse. Ahora se avisa primero y se deja un respiro visible
        // antes de navegar.
        notify(
          language === 'es'
            ? 'Sesión cerrada automáticamente por inactividad.'
            : 'Session closed automatically due to inactivity.',
          { type: 'warning', duration: 2500 }
        );
        setTimeout(handleLogout, 1200);
      }, INACTIVITY_LIMIT_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [sessionUser, supabaseClient, language]);

  return (
    <AuthContext.Provider value={{ sessionUser, userProfile, authChecked, supabaseClient, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};
