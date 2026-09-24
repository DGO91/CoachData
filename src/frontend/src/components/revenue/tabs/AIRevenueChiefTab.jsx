// src/frontend/src/components/revenue/tabs/AIRevenueChiefTab.jsx
import React from 'react';
import RevenueChiefAI from '../RevenueChiefAI';

export default function AIRevenueChiefTab({ language, leadData, onNextStep, setChiefResult }) {
  return (
    <RevenueChiefAI 
      language={language} 
      leadData={leadData} 
      onNextStep={onNextStep} 
      setChiefResult={setChiefResult} 
    />
  );
}
