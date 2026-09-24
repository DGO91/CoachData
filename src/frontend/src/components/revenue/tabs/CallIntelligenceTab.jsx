// src/frontend/src/components/revenue/tabs/CallIntelligenceTab.jsx
import React from 'react';
import CallIntelligenceCenter from '../CallIntelligenceCenter';

export default function CallIntelligenceTab({ language, onNextStep, setCallResult }) {
  return (
    <CallIntelligenceCenter 
      language={language} 
      onNextStep={onNextStep} 
      setCallResult={setCallResult} 
    />
  );
}
