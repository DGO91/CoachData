'use strict';

const http = require('http');

class OAuthBridgeServer {
    constructor({ listenPort, targetPort }) {
        this._listenPort = listenPort;
        this._targetBase = `http://localhost:${targetPort}/oauth2callback?code=`;
        this._server = http.createServer(this._handleRequest.bind(this));
    }

    _handleRequest(req, res) {
        const url = new URL(req.url, 'http://x'); 

        if (url.pathname !== '/oauth2callback') {
            res.writeHead(404);
            return res.end('Not Found');
        }

        const error = url.searchParams.get('error');
        if (error) {
            const desc = url.searchParams.get('error_description') || error;
            console.warn(`[OAuthBridge] OAuth error received: ${error} — ${desc}`);
            res.writeHead(400);
            return res.end(`OAuth error: ${desc}`);
        }

        const code = url.searchParams.get('code');
        if (!code) {
            console.warn('[OAuthBridge] /oauth2callback called without a code param');
            res.writeHead(400);
            return res.end('Missing authorization code');
        }

        const target = this._targetBase + encodeURIComponent(code);
        res.writeHead(302, { Location: target });
        res.end();
    }

    start() {
        this._server.listen(this._listenPort, () => {
            console.log(`[Suite] Google OAuth Callback Bridge active on http://localhost:${this._listenPort}`);
        });
        return this;
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (this._server.listening) {
                this._server.close((err) => (err ? reject(err) : resolve()));
            } else {
                resolve();
            }
        });
    }
}

module.exports = OAuthBridgeServer;
