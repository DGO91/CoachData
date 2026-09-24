import React, { useState, useEffect } from 'react';
import { Settings, Play, MessageSquare, Star, Check, AlertTriangle, Loader2 } from 'lucide-react';
import ActionModal from './common/ActionModal';

import { WEEKLY_DIGEST_TRANSLATIONS } from '../utils/translations';

import { MultiSelectDropdown } from './weekly_digest/MultiSelectDropdown';
import { Header } from './weekly_digest/Header';
import { ActionsCard } from './weekly_digest/ActionsCard';
import { useNotifications } from './common/Notifications';
import { authFetch } from '../core/api/authFetch';

export default function WeeklyDigest({ language, userProfile }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => WEEKLY_DIGEST_TRANSLATIONS[lang]?.[key] || key;

  // Configurations
  const [preferredName, setPreferredName] = useState('');
  const [selectedRegions, setSelectedRegions] = useState(['Global']);
  const [selectedNewsSources, setSelectedNewsSources] = useState(['forbes.com', 'techcrunch.com']);
  const [customNewsSources, setCustomNewsSources] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState(['Business']);
  const [customKeywords, setCustomKeywords] = useState('');
  
  // Custom source modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [userName, setUserName] = useState('Elsi');
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [trelloKey, setTrelloKey] = useState('');
  const [trelloToken, setTrelloToken] = useState('');
  const [trelloBoardId, setTrelloBoardId] = useState('');

  const [scheduleActive, setScheduleActive] = useState(false);
  const [cronHour, setCronHour] = useState(8);
  const [cronMinute, setCronMinute] = useState(0);
  
  // Connection States
  const [gmailConnected, setGmailConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  // Google Choices
  const [useGoogleCalendar, setUseGoogleCalendar] = useState(false);
  const [useGoogleSheets, setUseGoogleSheets] = useState(false);
  const [googleSheetsId, setGoogleSheetsId] = useState('');
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState([]);
  const [runStatus, setRunStatus] = useState(t('statusReady'));
  const [statusType, setStatusType] = useState('ready');

  // Feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [popupState, setPopupState] = useState(null);

  // Load initial settings
  const fetchSettings = () => {
    fetch('/svc/weekly-digest/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setPreferredName(data.preferred_name || '');
          setSelectedRegions(data.selected_regions || ['Global']);
          setSelectedNewsSources(data.selected_news_sources || ['forbes.com', 'techcrunch.com']);
          setCustomNewsSources(data.custom_news_sources || []);
          setSelectedTopics(data.selected_topics || ['Business']);
          setCustomKeywords(data.custom_keywords || '');
          setUserName(data.userName || 'Elsi');
          setNotionToken(data.notionToken || '');
          setNotionDatabaseId(data.notionDatabaseId || '');
          setTrelloKey(data.trelloKey || '');
          setTrelloToken(data.trelloToken || '');
          setTrelloBoardId(data.trelloBoardId || '');

           setScheduleActive(!!data.scheduleActive);
          setCronHour(data.cronHour !== undefined ? data.cronHour : 8);
          setCronMinute(data.cronMinute !== undefined ? data.cronMinute : 0);
          setUseGoogleCalendar(!!data.useGoogleCalendar);
          setUseGoogleSheets(!!data.useGoogleSheets);
          setGoogleSheetsId(data.googleSheetsId || '');
          setFeedbackHistory(data.feedback || []);
        }
      })
      .catch(err => console.warn('Failed to load settings', err));
  };

  useEffect(() => {
    fetchSettings();
    // Fetch Google connection status
    authFetch('/api/agents/precall-schedule-status')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setGmailConnected(!!data.gmailConnected);
          setCalendarConnected(!!data.calendarConnected);
        }
      })
      .catch(err => console.warn('Failed to load Google connection status', err));
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch(`/svc/pre-call-agent/api/auth/google-url`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        notify("No se pudo obtener la URL de autenticación.");
      }
    } catch (err) {
      console.error(err);
      notify("Error al obtener la URL de conexión.");
    }
  };

  // Poll status when running
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        fetch('/svc/weekly-digest/api/run-status')
          .then(res => res.json())
          .then(data => {
            if (data) {
              setRunLogs(data.logs || []);
              setIsRunning(data.isRunning);
              if (!data.isRunning) {
                const lastLog = data.logs[data.logs.length - 1];
                if (lastLog && lastLog.type === 'error') {
                  setRunStatus(t('statusError'));
                  setStatusType('error');
                } else {
                  setRunStatus(t('statusDone'));
                  setStatusType('success');
                  // Refresh settings to get updated feedback log if any
                  fetchSettings();
                }
              }
            }
          })
          .catch(err => console.error('Error polling status', err));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/svc/weekly-digest/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_name: preferredName,
          selected_regions: selectedRegions,
          selected_news_sources: selectedNewsSources,
          custom_news_sources: customNewsSources,
          selected_topics: selectedTopics,
          custom_keywords: customKeywords,
          userName,
          notionToken,
          notionDatabaseId,
          trelloKey,
          trelloToken,
          trelloBoardId,
           language: lang,
          scheduleActive,
          cronHour,
          cronMinute,
          useGoogleCalendar,
          useGoogleSheets,
          googleSheetsId
        })
      });
      const data = await res.json();
      if (data.success) {
        notify(t('saveSuccess'));
      } else {
        notify(t('saveError'));
      }
    } catch (err) {
      console.error(err);
      notify(t('saveError'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerRun = async () => {
    setIsRunning(true);
    setRunStatus(t('statusRunning'));
    setStatusType('running');
    setRunLogs([{ step: 'SYSTEM', message: 'Iniciando conexión…', time: new Date().toLocaleTimeString() }]);
    try {
      await fetch('/svc/weekly-digest/api/trigger-digest', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: userProfile?.id })
      });
    } catch (err) {
      console.error(err);
      setRunStatus(t('statusError'));
      setStatusType('error');
      setIsRunning(false);
    }
  };

  const handleTestNow = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/svc/weekly-digest/api/trigger-digest', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: userProfile?.id })
      });
      if (res.ok) {
        setPopupState({ type: 'success', text: t('Agent execution started. The report is being sent to WhatsApp via Evolution API.', 'Agente en ejecución. El reporte está siendo enviado a WhatsApp vía Evolution API.') });
      } else {
        setPopupState({ type: 'error', text: t('Error initiating test.', 'Error al iniciar la ejecución.') });
      }
    } catch (err) {
      console.error(err);
      setPopupState({ type: 'error', text: t('Error connecting to the server.', 'Error conectando con el servidor.') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating < 1 || rating > 5) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/svc/weekly-digest/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: feedbackComment })
      });
      const data = await res.json();
      if (data.success) {
        notify(t('feedbackSuccess'));
        setFeedbackComment('');
        setFeedbackHistory(data.feedback || []);
      } else {
        notify('Error submitting feedback');
      }
    } catch (err) {
      console.error(err);
      notify('Error submitting feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      
      {/* Header Info */}
      <Header title={t('title')} desc={t('desc')} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full items-start">
        
        {/* LEFT COLUMN: Report Preferences */}
        <div className="glass-panel-inner flex flex-col gap-6 p-6" style={{ position: 'relative', zIndex: 10 }}>
          <div className="border-b border-borderColor pb-4 flex items-center gap-3">
            <Settings size={20} style={{ color: 'var(--accent-ink, var(--accent))' }} />
            <h2 className="font-bold text-textMain text-xl agent-section-title">{t('titleSettings')}</h2>
          </div>

          <div className="flex flex-col gap-5">
            {/* 2-Column Grid for Primary Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Preferred Name */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-textMain">Recipient Name:</span>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Name to use in the brief…"
                  className="w-full bg-bgMain text-textMain text-sm px-4 py-3 focus:outline-none transition-all focus:ring-1"
                  style={{ border: '1px solid #9CA3AF', borderRadius: '12px' }}
                />
              </div>

              {/* Region Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-textMain">{t('regionLabel')}</span>
                <MultiSelectDropdown 
                  options={['Global', 'United States', 'Canada', 'United Kingdom', 'Australia', 'Europe'].map(r => ({ id: r, name: r }))}
                  selected={selectedRegions}
                  onChange={setSelectedRegions}
                  placeholder="Select regions…"
                />
              </div>

              {/* News Sources Dropdown */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-textMain">{t('newsSourcesLabel')}</span>
                <MultiSelectDropdown 
                  options={[
                    { id: 'h1', name: 'Business', isHeader: true },
                    { id: 'forbes.com', name: 'Forbes' }, { id: 'entrepreneur.com', name: 'Entrepreneur' }, { id: 'inc.com', name: 'Inc.' }, { id: 'fastcompany.com', name: 'Fast Company' }, { id: 'hbr.org', name: 'Harvard Business Review' }, { id: 'businessinsider.com', name: 'Business Insider' }, { id: 'bloomberg.com', name: 'Bloomberg' },
                    { id: 'h2', name: 'Marketing', isHeader: true },
                    { id: 'hubspot.com', name: 'HubSpot' }, { id: 'searchenginejournal.com', name: 'Search Engine Journal' }, { id: 'searchengineland.com', name: 'Search Engine Land' }, { id: 'socialmediaexaminer.com', name: 'Social Media Examiner' }, { id: 'marketingbrew.com', name: 'Marketing Brew' }, { id: 'neilpatel.com', name: 'Neil Patel' },
                    { id: 'h3', name: 'Technology & AI', isHeader: true },
                    { id: 'techcrunch.com', name: 'TechCrunch' }, { id: 'theverge.com', name: 'The Verge' }, { id: 'wired.com', name: 'Wired' }, { id: 'arstechnica.com', name: 'Ars Technica' }, { id: 'openai.com', name: 'OpenAI' }, { id: 'anthropic.com', name: 'Anthropic' }, { id: 'ai.google', name: 'Google AI' }, { id: 'blogs.microsoft.com', name: 'Microsoft AI Blog' },
                    { id: 'h4', name: 'Health & Wellness', isHeader: true },
                    { id: 'healthline.com', name: 'Healthline' }, { id: 'mayoclinic.org', name: 'Mayo Clinic' }, { id: 'webmd.com', name: 'WebMD' }, { id: 'mindbodygreen.com', name: 'MindBodyGreen' }, { id: 'verywellhealth.com', name: 'Verywell Health' },
                    { id: 'h5', name: 'Fitness & Nutrition', isHeader: true },
                    { id: 'precisionnutrition.com', name: 'Precision Nutrition' }, { id: 'acefitness.org', name: 'ACE Fitness' }, { id: 'nasm.org', name: 'NASM' }, { id: 'examine.com', name: 'Examine' },
                    { id: 'h6', name: 'Spirituality & Mindfulness', isHeader: true },
                    { id: 'gaia.com', name: 'Gaia' }, { id: 'mindful.org', name: 'Mindful' }, { id: 'chopra.com', name: 'Chopra' }, { id: 'soundstrue.com', name: 'Sounds True' },
                    { id: 'h7', name: 'Coaching & Personal Development', isHeader: true },
                    { id: 'tonyrobbins.com', name: 'Tony Robbins' }, { id: 'mindvalley.com', name: 'Mindvalley' }, { id: 'success.com', name: 'Success Magazine' }, { id: 'psychologytoday.com', name: 'Psychology Today' }
                  ]}
                  selected={selectedNewsSources}
                  onChange={setSelectedNewsSources}
                  placeholder="Select sources…"
                />
              </div>

              {/* Topics Dropdown */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-textMain">{t('topicsLabel')}</span>
                <MultiSelectDropdown 
                  options={['Business', 'Marketing', 'Sales', 'AI', 'Automation', 'Leadership', 'Finance', 'Investing', 'Real Estate', 'Coaching', 'Consulting', 'Health', 'Wellness', 'Nutrition', 'Fitness', 'Mental Health', 'Spirituality', 'Mindfulness', 'Psychology', 'Travel', 'Luxury', 'Beauty', 'Fashion', 'E-commerce', 'SaaS', 'Small Business'].map(t => ({ id: t, name: t }))}
                  selected={selectedTopics}
                  onChange={setSelectedTopics}
                  placeholder="Select topics…"
                />
              </div>
            </div>

            {/* Custom Keywords Input */}
            <div className="flex flex-col gap-1.5 w-full mt-2">
              <span className="text-xs font-semibold text-textMain">{t('customKeywordsLabel')}</span>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="e.g. Kajabi, Meta Ads, Hormone Health…"
                className="w-full bg-bgMain text-textMain text-sm px-4 py-3 focus:outline-none transition-all"
                style={{ border: '1px solid #9CA3AF', borderRadius: '12px' }}
              />
            </div>

            {/* Custom Websites List & Button */}
            <div className="flex flex-col gap-3 w-full mt-2">
              {customNewsSources.length > 0 && (
                <div className="flex flex-col gap-2 bg-bgMain/30 p-4 rounded-xl border border-borderColor/50">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--accent-ink, var(--accent))' }}>Custom Sources</span>
                  <div className="flex flex-wrap gap-2">
                    {customNewsSources.map((src, i) => (
                      <div key={i} className="flex items-center gap-1.5" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '50px', background: 'var(--accent)', color: 'var(--accent-text, #fff)', boxShadow: '0 2px 8px rgba(197, 168, 128, 0.25)' }}>
                        {src.name}
                        <button onClick={() => setCustomNewsSources(customNewsSources.filter((_, idx) => idx !== i))} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Website Modal/Inline */}
              {!showCustomModal ? (
                <button onClick={() => setShowCustomModal(true)} style={{ backgroundColor: 'transparent', color: 'var(--accent-ink, var(--accent))', border: '1px solid var(--accent)', transition: 'all 0.2s' }} className="py-2.5 px-5 text-sm w-full sm:w-auto self-start rounded-lg font-bold flex justify-center items-center hover:bg-[var(--accent)] hover:text-[var(--accent-text)]">
                  {t('addCustomSourceBtn')}
                </button>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-bgMain rounded-xl border border-accent/30 mt-1 w-full max-w-md shadow-lg animate-fade-in">
                  <span className="text-sm font-bold text-textMain mb-1">Add Custom Source</span>
                  <input type="text" placeholder="Website Name" value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-bgSurface text-textMain text-sm px-3 py-2.5 focus:outline-none placeholder:text-textMuted/50" style={{ border: '1px solid var(--borderColor)', borderRadius: '8px' }} />
                  <input type="text" placeholder="https://..." value={customUrl} onChange={e => setCustomUrl(e.target.value)} className="w-full bg-bgSurface text-textMain text-sm px-3 py-2.5 focus:outline-none placeholder:text-textMuted/50" style={{ border: '1px solid var(--borderColor)', borderRadius: '8px' }} />
                  <div className="flex gap-3 mt-1">
                    <button onClick={() => {
                      if(!customName || !customUrl) return;
                      try { new URL(customUrl.includes('http') ? customUrl : 'https://'+customUrl); } catch(e) { notify('Invalid URL format'); return; }
                      setCustomNewsSources([...customNewsSources, { name: customName, url: customUrl.includes('http') ? customUrl : 'https://'+customUrl }]);
                      setCustomName(''); setCustomUrl(''); setShowCustomModal(false);
                    }} className="px-5 py-2 text-sm font-bold rounded-lg transition-all" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text, #fff)' }}>Save Source</button>
                    <button onClick={() => setShowCustomModal(false)} className="px-5 py-2 bg-transparent text-textMuted hover:text-textMain rounded-lg text-sm font-bold transition-all">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Automation & Actions */}
        <ActionsCard 
          t={t}
          scheduleActive={scheduleActive} setScheduleActive={setScheduleActive}
          cronHour={cronHour} setCronHour={setCronHour}
          cronMinute={cronMinute} setCronMinute={setCronMinute}
          handleTestNow={handleTestNow} isTesting={isTesting}
          handleSaveSettings={handleSaveSettings} savingSettings={savingSettings}
        />
      </div>
      
      {/* CUSTOM MODAL POPUP */}
      {popupState && (
        <ActionModal
          title={popupState.type === 'success' ? t('Success') : t('Error')}
          message={popupState.text}
          isError={popupState.type !== 'success'}
          onClose={() => setPopupState(null)}
          buttonText="Entendido"
        />
      )}
    </div>
  );
}
