const axios = require('axios');

class EvolutionService {
    constructor() {
        this.baseUrl = process.env.EVOLUTION_API_URL;
        this.globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;
    }

    _getHeaders() {
        return {
            'apikey': this.globalApiKey,
            'Content-Type': 'application/json'
        };
    }

    async createInstance(tenantId) {
        if (!this.baseUrl || !this.globalApiKey) {
            throw new Error('Evolution API URL or Global API Key is not configured in .env');
        }

        const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
        
        try {
            // Check if exists
            try {
                const checkRes = await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
                    headers: this._getHeaders()
                });
                if (checkRes.data && checkRes.data.instance) {
                    console.log('[EvolutionService] Instance state is:', checkRes.data.instance.state);
                    if (checkRes.data.instance.state !== 'open') {
                        try {
                            const qrRes = await axios.get(`${this.baseUrl}/instance/connect/${instanceName}`, {
                                headers: this._getHeaders()
                            });
                            if (qrRes.data && qrRes.data.base64) {
                                return { instanceName, qrBase64: qrRes.data.base64, state: 'connecting' };
                            }
                        } catch (e) {
                            console.error('[EvolutionService] Failed to fetch QR for existing instance:', e.message);
                        }
                    }
                    return { instanceName, state: checkRes.data.instance.state };
                }
            } catch (e) {
                // Ignore 404
            }

            // Create new instance
            const response = await axios.post(`${this.baseUrl}/instance/create`, {
                instanceName: instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            }, {
                headers: this._getHeaders()
            });
            
            return {
                instanceName: response.data.instance.instanceName,
                qrBase64: response.data.qrcode.base64,
                state: 'connecting'
            };
        } catch (error) {
            console.error('[EvolutionService] Error creating instance:', error.response?.data || error.message);
            throw error;
        }
    }

    async getConnectionState(instanceName) {
        if (!this.baseUrl || !this.globalApiKey) return { state: 'disconnected' };
        try {
            const response = await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
                headers: this._getHeaders()
            });
            return response.data?.instance || { state: 'disconnected' };
        } catch (error) {
            return { state: 'disconnected' };
        }
    }

    async logoutInstance(instanceName) {
        if (!this.baseUrl || !this.globalApiKey) return;
        try {
            await axios.delete(`${this.baseUrl}/instance/logout/${instanceName}`, {
                headers: this._getHeaders()
            });
            await axios.delete(`${this.baseUrl}/instance/delete/${instanceName}`, {
                headers: this._getHeaders()
            });
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new EvolutionService();
