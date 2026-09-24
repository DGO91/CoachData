// src/frontend/src/components/dashboard/GoldHeroHeader.jsx
import React from 'react';
import { TRANSLATIONS } from '../../i18n/translations';

export function GoldHeroHeader({ organizationName = 'CoachData Media', userName = 'Diógenes', language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.heroGreetingMorning;
    if (hour < 19) return t.heroGreetingAfternoon;
    return t.heroGreetingEvening;
  };

  const formattedDate = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="ogd-hero">
      <div>
        <h1 className="ogd-hero-title">
          {getGreeting()}, {userName}
        </h1>
        <div className="ogd-hero-sub">
          {t.organization} <strong>{organizationName}</strong> | {formattedDate}
        </div>
      </div>
    </header>
  );
}
