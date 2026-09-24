import React, { useState, useEffect } from 'react';
import { 
  Search, Mail, Send, ArrowRight, Play, Square, Loader2, PhoneCall, FileText, ShieldCheck
} from 'lucide-react';
import { useNotifications } from './common/Notifications';
import { authFetch } from '../core/api/authFetch';

export default function Overview({ onNavigate, translate }) {
  const { notify, confirm: askConfirm } = useNotifications();
  const [agentRunning, setAgentRunning] = useState(false);
  const [lastRunSuccess, setLastRunSuccess] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Evening Summary State
  const [esRunning, setEsRunning] = useState(false);
  const [esLastRunSuccess, setEsLastRunSuccess] = useState(null);
  const [esLoadingAction, setEsLoadingAction] = useState(false);
  const [esScheduleActive, setEsScheduleActive] = useState(false);
  const [esCronHour, setEsCronHour] = useState(20);
  const [esCronMinute, setEsCronMinute] = useState(0);

  // Sync / check status of the personal agent on load & poll every 5s
  useEffect(() => {
    let active = true;
    
    async function checkStatus() {
      try {
        const [paRes, esRes] = await Promise.all([
          authFetch('/api/agents/personal-agent-status'),
          authFetch('/api/agents/evening-summary-status')
        ]);
        
        if (active && paRes.ok) {
          const paData = await paRes.json();
          setAgentRunning(paData.running);
          setLastRunSuccess(paData.lastSuccess);
        }

        if (active && esRes.ok) {
          const esData = await esRes.json();
          setEsRunning(esData.running);
          setEsLastRunSuccess(esData.lastSuccess);
          setEsScheduleActive(esData.scheduleActive);
          setEsCronHour(esData.cronHour);
          setEsCronMinute(esData.cronMinute);
        }
      } catch (err) {
        console.warn('Agent status poll error:', err);
      }
    }
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Handle personal agent triggers
  const handleToggleAgent = async () => {
    setLoadingAction(true);
    try {
      // Viven en agentRoutes, montado en /api/agents. Sin el prefijo caian en el
      // fallback del SPA: 200 con HTML y el boton no hacia nada.
      const endpoint = agentRunning ? '/api/agents/stop-personal-agent' : '/api/agents/run-personal-agent';
      const res = await authFetch(endpoint, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setAgentRunning(!agentRunning);
      } else {
        notify(data.message || 'Operation failed');
      }
    } catch (err) {
      notify('Error triggering agent: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Evening Summary triggers
  const handleToggleEveningSummary = async () => {
    setEsLoadingAction(true);
    try {
      const endpoint = esRunning ? '/api/stop-evening-summary' : '/api/run-evening-summary';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setEsRunning(!esRunning);
      } else {
        notify(data.message || 'Operation failed');
      }
    } catch (err) {
      notify('Error triggering Evening Summary: ' + err.message);
    } finally {
      setEsLoadingAction(false);
    }
  };

  // Handle Evening Summary schedule update
  const handleSetEsSchedule = async (active, hour, minute) => {
    try {
      await authFetch('/api/agents/set-evening-summary-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, hour, minute })
      });
      setEsScheduleActive(active);
      if (hour !== undefined) setEsCronHour(hour);
      if (minute !== undefined) setEsCronMinute(minute);
    } catch (err) {
      console.warn('Failed to update schedule', err);
    }
  };

  const getAgentStatusText = (running, lastSuccess) => {
    if (running) return translate('running', 'Running');
    if (lastSuccess === true) return translate('success', 'Success');
    if (lastSuccess === false) return translate('failed', 'Interrupted');
    return translate('disconnected', 'Disconnected');
  };

  const getAgentStatusColor = (running, lastSuccess) => {
    if (running) return '#f39c12';
    if (lastSuccess === true) return 'var(--success)';
    if (lastSuccess === false) return '#e74c3c';
    return '#95a5a6';
  };

  const CARDS = [
    {
      key: 'prospect',
      icon: <Search size={24} />,
      title: translate('prospect', 'Prospect Analyzer'),
      desc: translate('prospect_desc', 'Scrape and analyze target URLs with advanced AI insights.'),
    },
    {
      key: 'email',
      icon: <Mail size={24} />,
      title: translate('email', 'Email Organizer'),
      desc: translate('email_desc', 'Manage and organize emails with intelligent rules.'),
    },
    {
      key: 'mail-responder',
      icon: <Send size={24} />,
      title: translate('mail-responder', 'Mail Responder'),
      desc: translate('mail-responder_desc', 'Generate high-end email responses using Google and Anthropic APIs.'),
    },
    {
      key: 'pre-call-agent',
      icon: <PhoneCall size={24} />,
      title: translate('pre-call-agent', 'Pre-Call Agent'),
      desc: translate('pre-call-agent_desc', 'Automatic prep for upcoming meetings gathering CRM and Gmail data.'),
    },
    {
      key: 'auto-plan',
      icon: <FileText size={24} />,
      title: translate('auto-plan', 'Auto Plan Creator'),
      desc: translate('auto-plan_desc', 'Generate strategic operations plans instantly from sales call transcripts.'),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-fade-in pt-6 pb-20">
      
      {/* Welcome Hero */}
      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-borderColor flex flex-col items-center text-center relative overflow-hidden bg-bgSurface">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-gold)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-textMain mb-4 relative z-10">
          {translate('welcome_title_part1', 'Welcome to the')} {translate('welcome_title_elite', 'Elite')} {translate('welcome_title_part2', 'Suite')}
        </h1>
        <p className="text-base md:text-lg text-textMuted max-w-2xl relative z-10">
          {translate('welcome_subtitle', 'All your CoachData Media agent systems integrated into one premium interface.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Navigation Cards */}
        {CARDS.map((card) => (
          <div 
            key={card.key} 
            className="glass-panel-inner p-6 flex flex-col justify-between group cursor-pointer hover:-translate-y-1 transition-all duration-300 border border-borderColor hover:border-[var(--color-gold)] shadow-sm hover:shadow-xl"
            onClick={() => onNavigate(card.key)}
          >
            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-bgMuted flex items-center justify-center text-[var(--color-gold)] mb-4 group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-textMain mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{card.title}</h3>
              <p className="text-sm text-textMuted leading-relaxed line-clamp-3">{card.desc}</p>
            </div>
            <div className="mt-6 flex items-center justify-between text-[var(--accent)] font-bold text-xs uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
              <span>{translate('launch', 'Launch')}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}

        {/* Dynamic Personal Agent Status control widget */}
        <div className="glass-panel-inner p-6 flex flex-col justify-between " >
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent)] mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-textMain mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{translate('personal_agent', 'Morning Briefing')}</h3>
            <p className="text-sm text-textMuted leading-relaxed mb-4">
              {translate('personal_agent_desc', 'Connect WhatsApp morning calendars & briefing schedules automatically.')}
            </p>
            
            <div className="flex items-center gap-2 mb-6 bg-bgMuted w-max px-3 py-1.5 rounded-lg border border-borderColor">
              <span className="relative flex h-2.5 w-2.5">
                {agentRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: getAgentStatusColor(agentRunning, lastRunSuccess) }}></span>}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: getAgentStatusColor(agentRunning, lastRunSuccess) }}></span>
              </span>
              <span className="text-xs font-bold text-textMain uppercase tracking-wider">{getAgentStatusText(agentRunning, lastRunSuccess)}</span>
            </div>
          </div>
          
          <button 
            className="premium-btn w-full py-3 flex items-center justify-center gap-2 font-bold shadow-lg mt-auto"
            onClick={handleToggleAgent} 
            disabled={loadingAction}
          >
            {loadingAction ? (
              <Loader2 className="animate-spin" size={18} />
            ) : agentRunning ? (
              <>
                <Square size={16} className="fill-current" />
                <span>{translate('stop', 'Stop')}</span>
              </>
            ) : (
              <>
                <Play size={16} className="fill-current" />
                <span>{translate('activate', 'Activate')}</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Evening Summary Status control widget */}
        <div className="glass-panel-inner p-6 flex flex-col justify-between " >
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-bgMuted flex items-center justify-center text-[var(--color-gold)] mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold text-textMain mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{translate('evening-summary', 'Evening Summary')}</h3>
            <p className="text-sm text-textMuted leading-relaxed mb-4 line-clamp-2">
              {translate('evening-summary_desc', 'AI Financial & Performance Reporter generating the end of day closing summary.')}
            </p>
            
            <div className="flex items-center gap-2 mb-4 bg-bgMuted w-max px-3 py-1.5 rounded-lg border border-borderColor">
              <span className="relative flex h-2.5 w-2.5">
                {esRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: getAgentStatusColor(esRunning, esLastRunSuccess) }}></span>}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: getAgentStatusColor(esRunning, esLastRunSuccess) }}></span>
              </span>
              <span className="text-xs font-bold text-textMain uppercase tracking-wider">{getAgentStatusText(esRunning, esLastRunSuccess)}</span>
            </div>
            
            <div className="bg-bgMuted rounded-xl p-3 border border-borderColor mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Auto Schedule:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={esScheduleActive}
                    onChange={(e) => handleSetEsSchedule(e.target.checked, esCronHour, esCronMinute)}
                  />
                  <div className={`w-8 h-4 bg-bgSurface border border-borderColor rounded-full peer peer-checked:bg-[var(--color-gold)] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-borderColor after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${esScheduleActive ? 'after:translate-x-full after:border-white' : ''}`}></div>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={esCronHour} 
                  onChange={(e) => handleSetEsSchedule(esScheduleActive, parseInt(e.target.value, 10), esCronMinute)}
                  disabled={!esScheduleActive}
                  className="bg-bgSurface text-textMain text-xs border border-borderColor rounded p-1 focus:outline-none focus:border-[var(--color-gold)] cursor-pointer disabled:opacity-50"
                >
                  {Array.from({length: 24}).map((_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}h</option>
                  ))}
                </select>
                <span className="text-textMuted font-bold">:</span>
                <select 
                  value={esCronMinute} 
                  onChange={(e) => handleSetEsSchedule(esScheduleActive, esCronHour, parseInt(e.target.value, 10))}
                  disabled={!esScheduleActive}
                  className="bg-bgSurface text-textMain text-xs border border-borderColor rounded p-1 focus:outline-none focus:border-[var(--color-gold)] cursor-pointer disabled:opacity-50"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}m</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <button 
            className="premium-btn w-full py-3 flex items-center justify-center gap-2 font-bold shadow-lg mt-auto"
            onClick={handleToggleEveningSummary} 
            disabled={esLoadingAction}
          >
            {esLoadingAction ? (
              <Loader2 className="animate-spin" size={18} />
            ) : esRunning ? (
              <>
                <Square size={16} className="fill-current" />
                <span>{translate('stop', 'Stop')}</span>
              </>
            ) : (
              <>
                <Play size={16} className="fill-current" />
                <span>{translate('activate', 'Activate')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
