// src/frontend/src/components/revenue/tabs/LeadHubTab.jsx
import React from 'react';
import LeadHub from '../LeadHub';

export default function LeadHubTab({ language, onNextStep, setLeadData }) {
  return <LeadHub language={language} onNextStep={onNextStep} setLeadData={setLeadData} />;
}
