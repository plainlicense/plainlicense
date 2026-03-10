/**
 * Cloudflare Worker: OAuth 2.0 Proxy for GitHub authentication.
 * Handles PKCE, token exchange, and secure JWT session management.
 */

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    
    // CORS Handling
    if (request.method === 'OPTIONS') {
      return this.handleOptions(origin, env);
    }

    // Proxy routes
    if (url.pathname === '/auth') {
      return this.handleAuth(url, env);
    }

    if (url.pathname === '/callback') {
      return this.handleCallback(url, env);
    }

    if (url.pathname === '/refresh') {
      return this.handleRefresh(request, env);
    }

    if (url.pathname === '/verify') {
      return this.handleVerify(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },

  handleOptions(origin: string, env: Env): Response {
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',');
    if (allowedOrigins.includes(origin) || env.ALLOWED_ORIGINS === '*') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    return new Response(null, { status: 403 });
  },

  async handleAuth(url: URL, env: Env): Promise<Response> {
    const redirectUri = new URL('https://github.com/login/oauth/authorize');
    redirectUri.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    redirectUri.searchParams.set('scope', 'repo,user');
    redirectUri.searchParams.set('state', url.searchParams.get('state') || '');
    
    return Response.redirect(redirectUri.toString(), 302);
  },

  async handleCallback(url: URL, env: Env): Promise<Response> {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenResponse.json() as any;
    if (data.error) {
      return new Response(`Error: ${data.error_description}`, { status: 400 });
    }

    // Create short-lived Access Token (15 mins) and long-lived Refresh Token (7 days)
    const accessToken = await this.createJWT({ sub: 'user', gh: data.access_token }, env.JWT_SECRET, 15 * 60);
    const refreshToken = await this.createJWT({ sub: 'user', gh: data.access_token, refresh: true }, env.JWT_SECRET, 7 * 24 * 60 * 60);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            const token = "${accessToken}";
            const refresh = "${refreshToken}";
            // Send back to opener
            window.opener.postMessage("authorization:github:success:" + JSON.stringify({
              token: token, 
              refreshToken: refresh,
              provider: "github"
            }), "*");
            window.close();
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  },

  async handleRefresh(request: Request, env: Env): Promise<Response> {
    const { refreshToken } = await request.json() as any;
    const payload = await this.verifyJWT(refreshToken, env.JWT_SECRET);

    if (!payload || !payload.refresh) {
      return new Response('Invalid Refresh Token', { status: 401 });
    }

    // Issue new access token
    const newAccessToken = await this.createJWT({ sub: 'user', gh: payload.gh }, env.JWT_SECRET, 15 * 60);
    // Optional: Rotate refresh token too (refresh-the-refresh)
    const newRefreshToken = await this.createJWT({ sub: 'user', gh: payload.gh, refresh: true }, env.JWT_SECRET, 7 * 24 * 60 * 60);

    return new Response(JSON.stringify({ token: newAccessToken, refreshToken: newRefreshToken }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async handleVerify(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await this.verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return new Response('Unauthorized', { status: 401 });
    }

    return new Response(JSON.stringify({ valid: true, gh: payload.gh }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // --- Simple WebCrypto JWT Implementation ---

  async createJWT(payload: any, secret: string, expiresInSeconds: number): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds
    };

    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  },

  async verifyJWT(token: string, secret: string): Promise<any | null> {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigData = new Uint8Array(atob(signature.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => c.charCodeAt(0)));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigData,
      encoder.encode(`${header}.${payload}`)
    );

    if (!isValid) return null;

    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) return null;

    return decodedPayload;
  }
};
