import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { authFetch } from '../core/api/authFetch';

const TRANSLATIONS = {
  es: {
    title: "Evolution API (WhatsApp)",
    connected: "Conectado Exitosamente",
    disconnect: "Desconectar Dispositivo",
    scan: "Escanea este código QR con tu aplicación de WhatsApp para enlazar el dispositivo al agente.",
    waiting: "Esperando escaneo…",
    disconnected: "Status: Desconectado",
    generateSubtitle: "Genera un QR para enlazar tu WhatsApp al ecosistema.",
    btnGenerate: "Generar Código QR"
  },
  en: {
    title: "Evolution API (WhatsApp)",
    connected: "Successfully Connected",
    disconnect: "Disconnect Device",
    scan: "Scan this QR code with your WhatsApp app to link the device to the agent.",
    waiting: "Waiting for scan…",
    disconnected: "Status: Disconnected",
    generateSubtitle: "Generate a QR to link your WhatsApp to the ecosystem.",
    btnGenerate: "Generate QR Code"
  }
};

export default function WhatsAppEvolutionConnect({ tenantId, language }) {
  const lang = language === 'en' ? 'en' : 'es';
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollInterval = useRef(null);

  const fetchStatus = async () => {
    try {
      const response = await authFetch(`/api/evolution/status?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data.state);
        
        if (data.state === 'open') {
          setStatus('connected');
          if (pollInterval.current) clearInterval(pollInterval.current);
        }
      }
    } catch (err) {
      console.error('Error fetching evolution status:', err);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchStatus();
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [tenantId]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      if (data.qrBase64) {
        setQrCode(data.qrBase64);
        setStatus('connecting');
        
        // Start polling for connection success
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(() => {
          fetchStatus();
        }, 3000);
      } else if (data.state === 'open' || data.state === 'connected') {
        setStatus('connected');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await authFetch(`/api/evolution/disconnect?tenantId=${tenantId}`, {
        method: 'DELETE'
      });
      setStatus('disconnected');
      setQrCode(null);
      if (pollInterval.current) clearInterval(pollInterval.current);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full animate-fade-in">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-borderColor/50">
        <Smartphone size={22} style={{ color: 'var(--accent-ink, var(--accent))' }} />
        <h4 className="font-bold text-textMain m-0 text-lg">{t('title')}</h4>
      </div>
      
      {error && (
        <div className="p-4 bg-red-500/10 text-red-600 border border-red-500/30 rounded-xl mb-4 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {status === 'connected' ? (
        <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 border border-green-500/30 rounded-xl gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-lg border border-green-500/30">
            <CheckCircle size={32} />
          </div>
          <p className="text-green-500 font-bold text-lg m-0">{t('connected')}</p>
          <button 
            onClick={handleDisconnect} 
            disabled={loading}
            className="mt-2 px-6 py-2 rounded-lg font-bold transition-all border hover:bg-red-500/10"
            style={{ borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : t('disconnect')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 flex-1">
          {status === 'connecting' && qrCode ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-textMuted text-sm text-center">
                {t('scan')}
              </p>
              <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-white/20">
                {qrCode.startsWith('data:image') ? (
                   <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} className="rounded-lg" />
                ) : (
                   <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} className="rounded-lg" />
                )}
              </div>
              <div className="mt-2 text-accentSage flex items-center justify-center gap-2 text-sm font-bold bg-accentSage/10 px-4 py-2 rounded-full border border-accentSage/30">
                <RefreshCw size={14} className="spin" /> {t('waiting')}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full py-8 border border-dashed border-borderColor rounded-xl bg-bgMain/30">
              <div className="w-16 h-16 rounded-full bg-bgMain border border-borderColor flex items-center justify-center text-textMuted">
                <Smartphone size={24} />
              </div>
              <div className="text-center">
                <span className="text-textMain font-bold block mb-1">{t('disconnected')}</span>
                <span className="text-textMuted text-sm">{t('generateSubtitle')}</span>
              </div>
              <button 
                onClick={handleConnect} 
                disabled={loading}
                className="premium-btn px-8 py-3.5 text-sm font-bold flex items-center gap-2 rounded-xl"
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <Smartphone size={18} />}
                {t('btnGenerate')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
