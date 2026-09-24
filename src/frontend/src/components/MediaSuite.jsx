import React, { useState } from 'react';
import { LayoutGrid, FileText, MessageSquare } from 'lucide-react';
import ProjectDesk from './ProjectDesk';
import ContentDesk from './ContentDesk';
import MessageBank from './MessageBank';
import './MediaSuite.css';

export default function MediaSuite({ language, theme, initialSubTab = 'project-desk', orgScope, allowSeed = false }) {
  const [activeTab, setActiveTab] = useState(initialSubTab);

  const tabs = [
    { id: 'project-desk', label: language === 'es' ? 'Project Desk' : 'Project Desk', icon: LayoutGrid },
    { id: 'content-desk', label: language === 'es' ? 'Content Desk' : 'Content Desk', icon: FileText },
    { id: 'message-bank', label: language === 'es' ? 'Message Bank' : 'Message Bank', icon: MessageSquare }
  ];

  return (
    <div className="media-suite-container">
      <header className="media-suite-tabs-header">
        <div className="media-suite-tabs-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`media-suite-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="media-suite-content-area">
        {activeTab === 'project-desk' && <ProjectDesk language={language} theme={theme} orgScope={orgScope} allowSeed={allowSeed} />}
        {activeTab === 'content-desk' && <ContentDesk language={language} orgScope={orgScope} allowSeed={allowSeed} />}
        {activeTab === 'message-bank' && <MessageBank language={language} orgScope={orgScope} allowSeed={allowSeed} />}
      </div>
    </div>
  );
}
