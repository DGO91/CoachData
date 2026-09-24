// src/frontend/src/components/OnlineUsersAvatars.jsx
import React from 'react';

/**
 * Componente visual de avatares en vivo para CoachData OS v2.
 * Muestra hasta MAX_AVATARS (5) usuarios activos con tooltips e indicador de estado.
 */
export function OnlineUsersAvatars({ onlineUsers = [], isConnected = false, maxDisplay = 5 }) {
  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const extraCount = Math.max(0, onlineUsers.length - maxDisplay);

  return (
    <div
      className="online-users-avatars-container"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        color: '#e2e8f0',
      }}
    >
      {/* Indicador de conexión global */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? '#22c55e' : '#ef4444',
          boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
        }}
        title={isConnected ? 'Realtime Conectado' : 'Reconectando…'}
      />

      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
        {displayUsers.map((usr, idx) => {
          const initials = usr.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          const formattedTime = new Date(usr.onlineAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          const tooltipText = `${usr.fullName}\nVista: ${usr.currentView}\nConectado: ${formattedTime}`;

          return (
            <div
              key={usr.key || idx}
              title={tooltipText}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `hsl(${(idx * 137.5) % 360}, 65%, 45%)`,
                border: '2px solid #0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                marginLeft: idx === 0 ? 0 : '-8px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, z-index 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.zIndex = '1';
              }}
            >
              {usr.avatarUrl ? (
                <img
                  src={usr.avatarUrl}
                  alt={usr.fullName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : null}
              <span>{initials}</span>
            </div>
          );
        })}

        {extraCount > 0 && (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#334155',
              border: '2px solid #0f172a',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              marginLeft: '-8px',
            }}
            title={`${extraCount} usuarios adicionales conectados`}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
