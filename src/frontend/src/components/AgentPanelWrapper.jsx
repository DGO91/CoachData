import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export default function AgentPanelWrapper({ serviceKey, theme, language }) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);

  // Sync theme and language to the iframe when they change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
      iframe.contentWindow.postMessage({ type: 'lang-change', lang: language }, '*');
    }
  }, [theme, language, loading]);

  const handleIframeLoad = () => {
    setLoading(false);
    // Send immediate sync payload upon loading complete
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
      iframe.contentWindow.postMessage({ type: 'lang-change', lang: language }, '*');
    }
  };

  // Re-enable loader when switching services
  useEffect(() => {
    setLoading(true);
  }, [serviceKey]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 5, gap: '1rem',
          transition: 'background-color 0.3s'
        }}>
          <Loader2 className="animate-spin" style={{ color: 'var(--accent-primary)', width: '36px', height: '36px' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            {language === 'en' ? 'Orchestrating microservice…' : 'Orquestando microservicio…'}
          </span>
        </div>
      )}
      
      <div className="iframe-fallback-container" style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}>
        <iframe
          ref={iframeRef}
          src={`/svc/${serviceKey}/`}
          onLoad={handleIframeLoad}
          title={serviceKey}
          style={{ width: '100%', height: '100%', border: 'none', display: loading ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}
