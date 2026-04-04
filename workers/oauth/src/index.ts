/// <reference path="../worker-configuration.d.ts" />
/**
 * List of supported OAuth providers.
 *
 * This script is from [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), modified for type safety and better error handling and removed gitlab-related code.
 * The original script is licensed under MIT License Copyright (c) 2026 Kohei Yoshino.
 */
const GITHUB_HOSTNAME = "github.com";
const supportedProviders = ["github"];

interface Env extends Cloudflare {
  ALLOWED_DOMAINS?: string;
  GITHUB_CLIENT_ID: { get: () => Promise<string> };
  GITHUB_CLIENT_SECRET: { get: () => Promise<string> };
  TURNSTILE_SECRET_KEY: { get: () => Promise<string> };
  TURNSTILE_SITE_KEY: string;
}

export type JsonResponse = {
  access_token?: string;
  error?: string;
};

/**
 * Escape the given string for safe use in a regular expression.
 * @param {string} str - Original string.
 * @returns {string} Escaped string.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
 */
const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Output HTML response that communicates with the window opener.
 * @param {object} args - Options.
 * @param {string} [args.provider] - Backend name, e,g. `github`.
 * @param {string} [args.token] - OAuth token.
 * @param {string} [args.error] - Error message when an OAuth token is not available.
 * @param {string} [args.errorCode] - Error code to be used to localize the error message in
 * Sveltia CMS.
 * @returns {Response} Response with HTML.
 */
const outputHTML = ({
  provider = "unknown",
  token,
  error,
  errorCode,
}: {
  provider?: string;
  token?: string;
  error?: string;
  errorCode?: string;
}): Response => {
  const state = error ? "error" : "success";
  const content = error ? { provider, error, errorCode } : { provider, token };

  return new Response(
    `
      <!doctype html><html><body><script>
        (() => {
          window.addEventListener('message', ({ data, origin }) => {
            if (data === 'authorizing:${provider}') {
              window.opener?.postMessage(
                'authorization:${provider}:${state}:${JSON.stringify(content)}',
                origin
              );
            }
          });
          window.opener?.postMessage('authorizing:${provider}', '*');
        })();
      </script></body></html>
    `,
    {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        // Delete CSRF token
        "Set-Cookie": `csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`,
      },
    },
  );
};

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token server-side.
 * @param {string} token - The Turnstile response token from the client.
 * @param {string} secretKey - The Turnstile secret key.
 * @param {string} remoteIp - The client's IP address.
 * @returns {Promise<boolean>} Whether the token is valid.
 */
const verifyTurnstile = async (
  token: string,
  secretKey: string,
  remoteIp: string,
): Promise<boolean> => {
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: remoteIp,
    }),
  });

  const result: { success: boolean } = await response.json();
  return result.success;
};

/**
 * Render the Turnstile challenge page that gates the OAuth flow.
 * On successful verification, the form auto-submits to POST /auth.
 */
const renderChallengePage = (
  siteKey: string,
  provider: string,
  siteId: string,
): Response =>
  new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>Verifying — Plain License</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; background: #f8f9fa; color: #1a1a2e; }
    .container { text-align: center; }
    .container p { margin: 1rem 0 1.5rem; color: #555; }
    noscript p { color: #c00; }
  </style>
</head>
<body>
  <div class="container">
    <p>Verifying you are human before signing in&hellip;</p>
    <form id="auth-form" method="POST" action="/auth">
      <input type="hidden" name="provider" value="${provider}">
      <input type="hidden" name="site_id" value="${siteId}">
      <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onVerified" data-theme="auto" data-size="normal"></div>
      <noscript><p>JavaScript is required to continue.</p></noscript>
    </form>
  </div>
  <script>
    function onVerified() { document.getElementById('auth-form').submit(); }
  </script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );

/**
 * Handle GET /auth — show the Turnstile challenge page.
 */
const handleAuthChallenge = (
  request: Request,
  env: Env,
): Response => {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "";
  const siteId = searchParams.get("site_id") ?? "";

  if (!provider || !supportedProviders.includes(provider)) {
    return outputHTML({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  return renderChallengePage(env.TURNSTILE_SITE_KEY, provider, siteId);
};

/**
 * Handle POST /auth — verify Turnstile token, then redirect to the OAuth provider.
 */
const handleAuth = async (request: Request, env: Env): Promise<Response> => {
  const formData = await request.formData();
  const provider = formData.get("provider") as string | null;
  const domain = formData.get("site_id") as string | null;
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;

  if (!provider || !supportedProviders.includes(provider)) {
    return outputHTML({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  // Verify Turnstile token
  if (!turnstileToken) {
    return outputHTML({
      provider,
      error: "Verification challenge was not completed. Please try again.",
      errorCode: "TURNSTILE_MISSING",
    });
  }

  const clientIp = request.headers.get("CF-Connecting-IP") ?? "";
  const secretKey = await env.TURNSTILE_SECRET_KEY.get();

  if (!(await verifyTurnstile(turnstileToken, secretKey, clientIp))) {
    return outputHTML({
      provider,
      error: "Verification challenge failed. Please try again.",
      errorCode: "TURNSTILE_FAILED",
    });
  }

  const { ALLOWED_DOMAINS } = env;

  const GITHUB_CLIENT_ID = await env.GITHUB_CLIENT_ID.get();
  const GITHUB_CLIENT_SECRET = await env.GITHUB_CLIENT_SECRET.get();

  // Check if the domain is whitelisted
  if (
    ALLOWED_DOMAINS &&
    !ALLOWED_DOMAINS.split(/,/).some((str) =>
      // Escape the input, then replace a wildcard for regex
      (domain ?? "").match(
        new RegExp(`^${escapeRegExp(str.trim()).replace("\\*", ".+")}$`),
      ),
    )
  ) {
    return outputHTML({
      provider,
      error: "Your domain is not allowed to use the authenticator.",
      errorCode: "UNSUPPORTED_DOMAIN",
    });
  }

  // Generate a random string for CSRF protection
  const csrfToken = globalThis.crypto.randomUUID().replaceAll("-", "");
  let authURL = "";

  // GitHub
  if (provider === "github") {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return outputHTML({
        provider,
        error: "OAuth app client ID or secret is not configured.",
        errorCode: "MISCONFIGURED_CLIENT",
      });
    }

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "repo,user",
      state: csrfToken,
    });

    authURL = `https://${GITHUB_HOSTNAME}/login/oauth/authorize?${params.toString()}`;
  }

  // Redirect to the authorization server
  return new Response("", {
    status: 302,
    headers: {
      Location: authURL,
      // Cookie expires in 10 minutes; Use `SameSite=Lax` to make sure the cookie is sent by the
      // browser after redirect
      "Set-Cookie":
        `csrf-token=${provider}_${csrfToken}; ` +
        `HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
};

/**
 * Handle the `callback` method, which is the second request in the authorization flow.
 * @param {Request} request - HTTP request.
 * @param {Env} env - Environment variables.
 * @returns {Promise<Response>} HTTP response.
 */
const handleCallback = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const { url, headers } = request;
  const { searchParams } = new URL(url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  const [, provider, csrfToken] =
    headers.get("Cookie")?.match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/) ??
    [];

  if (!provider || !supportedProviders.includes(provider)) {
    return outputHTML({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  if (!code || !state) {
    return outputHTML({
      provider,
      error: "Failed to receive an authorization code. Please try again later.",
      errorCode: "AUTH_CODE_REQUEST_FAILED",
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return outputHTML({
      provider,
      error: "Potential CSRF attack detected. Authentication flow aborted.",
      errorCode: "CSRF_DETECTED",
    });
  }

  const GITHUB_CLIENT_ID = await env.GITHUB_CLIENT_ID.get();
  const GITHUB_CLIENT_SECRET = await env.GITHUB_CLIENT_SECRET.get();

  let tokenURL = "";
  let requestBody = {};

  // GitHub
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return outputHTML({
      provider,
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
    });
  }

  tokenURL = `https://${GITHUB_HOSTNAME}/login/oauth/access_token`;
  requestBody = {
    code,
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
  };

  let response: Response | undefined;
  let token = "";
  let error = "";

  try {
    response = await fetch(tokenURL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    //
  }

  if (!response) {
    return outputHTML({
      provider,
      error: "Failed to request an access token. Please try again later.",
      errorCode: "TOKEN_REQUEST_FAILED",
    });
  }
  // response exists
  try {
    const jsonResponse: Awaited<JsonResponse> = await response.json();
    token = jsonResponse.access_token ?? "";
    error = jsonResponse.error ?? "";
  } catch {
    return outputHTML({
      provider,
      error: "Server responded with malformed data. Please try again later.",
      errorCode: "MALFORMED_RESPONSE",
    });
  }

  return outputHTML({ provider, token, error });
};

export default {
  /**
   * The main request handler.
   * @param {Request} request - HTTP request.
   * @param {{ [key: string]: string }} env - Environment variables.
   * @returns {Promise<Response>} HTTP response.
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch/
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === "GET" && ["/auth", "/oauth/authorize"].includes(pathname)) {
      return handleAuthChallenge(request, env);
    }

    if (method === "POST" && ["/auth", "/oauth/authorize"].includes(pathname)) {
      return handleAuth(request, env);
    }

    if (
      method === "GET" &&
      ["/callback", "/oauth/redirect"].includes(pathname)
    ) {
      return handleCallback(request, env);
    }

    return new Response("", { status: 404 });
  },
};
