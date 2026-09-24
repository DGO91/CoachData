const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getSupabaseClient } = require('../infrastructure/database/supabaseClient');

/**
 * CoachData Agent SDK
 * Centralized boilerplate for all microservices/agents.
 */
class AgentCore {
    constructor(agentName, port) {
        this.agentName = agentName;
        this.port = port || process.env.PORT || 4000;
        this.app = express();
        this.supabase = getSupabaseClient();
        
        this._initializeMiddlewares();
        this._initializeBaseRoutes();
    }

    _initializeMiddlewares() {
        this.app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
        this.app.use(cors());
        this.app.use(express.json());
        
        // Log incoming requests
        this.app.use((req, res, next) => {
            console.log(`[${this.agentName}] ${req.method} ${req.url}`);
            next();
        });
    }

    _initializeBaseRoutes() {
        this.app.get('/status', (req, res) => {
            res.json({
                agent: this.agentName,
                status: 'online',
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Retrieves credentials for a given tenant securely from Supabase,
     * replacing the need for local .json files.
     */
    async getTenantCredentials(tenantId) {
        if (!this.supabase) {
            console.warn(`[${this.agentName}] Supabase not initialized, cannot fetch credentials for ${tenantId}.`);
            return null;
        }

        try {
            // Find the user_id associated with this tenant
            const { data: tenant } = await this.supabase
                .from('tenants')
                .select('auth_user_id')
                .eq('id', tenantId)
                .single();

            if (!tenant) throw new Error('Tenant not found');

            // Fetch the credentials
            const { data: creds } = await this.supabase
                .from('user_credentials')
                .select('*')
                .eq('user_id', tenant.auth_user_id)
                .single();
                
            return creds || {};
        } catch (err) {
            console.error(`[${this.agentName}] Error fetching credentials:`, err.message);
            return null;
        }
    }

    /**
     * Retrieves Google OAuth Tokens from Supabase for a tenant
     */
    async getGoogleTokens(tenantId) {
        const creds = await this.getTenantCredentials(tenantId);
        if (!creds) return null;
        
        return {
            calendar: creds.google_calendar_oauth ? JSON.parse(creds.google_calendar_oauth) : null,
            gmail: creds.google_mail_oauth ? JSON.parse(creds.google_mail_oauth) : null,
            general: creds.google_oauth_token ? JSON.parse(creds.google_oauth_token) : null
        };
    }

    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[${this.agentName}] Microservice started on port ${this.port}`);
                resolve(this.server);
            });
        });
    }
}

module.exports = AgentCore;
