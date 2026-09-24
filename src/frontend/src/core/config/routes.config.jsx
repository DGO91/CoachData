import React from 'react';
import {
  LayoutDashboard, User, Key, Settings as SettingsIcon, BarChart3, Bot,
  UserPlus, Search, PhoneCall, FileText, MessageSquare, LayoutGrid, Layers, Users
} from 'lucide-react';
import { translate } from '../constants/app.constants';

const ICON_SIZE = 16;

export const getAdminMenuItems = (language) => [
  { key: 'dashboard', label: translate(language, 'dashboard'), icon: LayoutDashboard },
  { key: 'agents-hub', label: language === 'es' ? 'Centro de Agentes' : 'Agents Hub', icon: Bot },
  { key: 'media-suite', label: translate(language, 'media-suite'), icon: Layers },
  { key: 'revenue-suite', label: translate(language, 'revenue_suite') || 'Revenue Suite', icon: FileText },
  { key: 'client-portal', label: language === 'es' ? 'Portal de Clientes' : 'Client Portal', icon: Users },
  { key: 'reports-hub',  label: translate(language, 'reports-hub'), icon: BarChart3 },
  { key: 'profile', label: translate(language, 'profile'), icon: User },
  { key: 'settings', label: translate(language, 'settings'), icon: SettingsIcon },
  { key: 'dev-portal', label: translate(language, 'dev_portal'), icon: Key },
];

// Media Suite SI aparece para clientes: cada cuenta trabaja sus propias tareas,
// contenido y mensajes. Lo que no se comparte son los DATOS — ver scopedStorage
// (clave por organizacion) y el sembrado de ejemplo, reservado a Admin.
export const getClientMenuItems = (language) => [
  { key: 'dashboard', label: translate(language, 'dashboard', 'Home'), icon: LayoutDashboard },
  { key: 'agents-hub', label: language === 'es' ? 'Centro de Agentes' : 'Agents Hub', icon: Bot },
  { key: 'media-suite', label: translate(language, 'media-suite'), icon: Layers },
  { key: 'revenue-suite', label: translate(language, 'revenue_suite') || 'Revenue Suite', icon: FileText },
  { key: 'client-portal', label: language === 'es' ? 'Portal de Clientes' : 'Client Portal', icon: Users },
  { key: 'reports-hub',  label: translate(language, 'reports-hub'), icon: BarChart3 },
  { key: 'profile', label: translate(language, 'profile'), icon: User },
  { key: 'settings', label: translate(language, 'settings'), icon: SettingsIcon },
];

/**
 * Pantallas reservadas a cuentas Administrator.
 *
 * Quitarlas del menú no basta: currentTab se puede fijar desde la URL, así que
 * App.jsx lo comprueba también en el render.
 *
 * Media Suite NO está aquí a propósito: los clientes la usan con sus propios
 * datos. Lo que los separa es el ámbito de almacenamiento y el sembrado de
 * ejemplo, no el acceso a la pantalla.
 */
export const ADMIN_ONLY_TABS = [
  'dev-portal',
];

export const canAccessTab = (tabKey, isAdmin) =>
  isAdmin || !ADMIN_ONLY_TABS.includes(tabKey);

export const getMenuItemsWithLock = (items, isAdmin, enabledAgents) => {
  return items.map(item => {
    return { ...item, isLocked: false };
  });
};
