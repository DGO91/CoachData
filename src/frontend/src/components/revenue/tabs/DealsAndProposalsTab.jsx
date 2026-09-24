// src/frontend/src/components/revenue/tabs/DealsAndProposalsTab.jsx
import React from 'react';
import DealClosingWorkspace from '../DealClosingWorkspace';

export default function DealsAndProposalsTab({ language, callResult, onNextStep }) {
  return (
    <DealClosingWorkspace 
      language={language} 
      callResult={callResult} 
      onNextStep={onNextStep} 
    />
  );
}
