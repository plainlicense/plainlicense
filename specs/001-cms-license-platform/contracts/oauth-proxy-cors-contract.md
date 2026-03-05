# OAuth Proxy CORS Contract

**Component**: Cloudflare Worker OAuth Proxy (`workers/oauth-proxy/`)
**Purpose**: Define Cross-Origin Resource Sharing (CORS) policies for secure CMS-to-OAuth communication
**Priority**: HIGH - Security requirement before production
**Related**: FR-046 (Authentication Security), T131-T144 (OAuth implementation)

---

## Overview

The OAuth proxy sits between Sveltia CMS (browser-based admin UI) and external OAuth providers (GitHub, Google). It must enforce strict CORS policies to prevent unauthorized access while allowing legitimate CMS operations.

## Allowed Origins

### Production Environment
```
Origin: https://plainlicense.org/admin
Status: ALLOWED
```

### Staging Environment
```
Origin: https://staging.plainlicense.org/admin
Status: ALLOWED
```

### Development Environment
```
Origin: http://localhost:4321/admin
Origin: http://127.0.0.1:4321/admin
Status: ALLOWED (development only)
```

### Rejected Origins
```
All other origins: REJECTED with 403 Forbidden
Examples:
  - https://plainlicense.org/ (missing /admin path)
  - https://evil-site.com/admin
  - null (browser file:// protocol)
```

---

## CORS Headers

### Preflight Request (OPTIONS)

**Request Headers**:
```http
OPTIONS /oauth/callback HTTP/1.1
Origin: https://plainlicense.org/admin
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

**Response Headers**:
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://plainlicense.org/admin
Access-Control-Allow-Methods: POST, GET
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
Access-Control-Allow-Credentials: true
Vary: Origin
```

### Actual Request (POST/GET)

**Request Headers**:
```http
POST /oauth/token HTTP/1.1
Origin: https://plainlicense.org/admin
Content-Type: application/json
Authorization: Bearer <token>
```

**Response Headers**:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://plainlicense.org/admin
Access-Control-Allow-Credentials: true
Content-Type: application/json
Vary: Origin
```

---

## Security Policies

### Origin Validation

**Implementation**:
```typescript
const ALLOWED_ORIGINS = [
  'https://plainlicense.org/admin',
  'https://staging.plainlicense.org/admin',
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:4321/admin', 'http://127.0.0.1:4321/admin']
    : [])
];

function validateOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return null; // No Origin header (same-origin or non-browser request)
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin; // Valid origin
  }

  return null; // Invalid origin
}
```

**Rejection Behavior**:
- If origin not in allowlist: Return `403 Forbidden`
- If no `Origin` header: Allow (same-origin request)
- Log all rejected requests for security monitoring

### Rate Limiting

**Per-Origin Limits**:
```yaml
Rate Limit Configuration:
  Window: 60 seconds (1 minute)
  Max Requests: 10 requests per origin per window

Exceeded Limit Response:
  Status: 429 Too Many Requests
  Headers:
    Retry-After: 60
    X-RateLimit-Limit: 10
    X-RateLimit-Remaining: 0
    X-RateLimit-Reset: <unix_timestamp>
```

**Implementation**:
```typescript
// Use Cloudflare Workers KV for distributed rate limiting
const rateLimitKey = `ratelimit:${origin}:${Math.floor(Date.now() / 60000)}`;
const requestCount = await env.KV.get(rateLimitKey) || 0;

if (requestCount >= 10) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: {
      'Retry-After': '60',
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0'
    }
  });
}

await env.KV.put(rateLimitKey, String(requestCount + 1), { expirationTtl: 120 });
```

### Content Security Policy Integration

**Worker Response Headers**:
```http
Content-Security-Policy: default-src 'none'; script-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Endpoint Specifications

### GET /oauth/authorize

**Purpose**: Initiate OAuth flow with external provider
**Allowed Origins**: All allowlisted origins
**Methods**: GET
**Credentials**: Not required

**Request**:
```http
GET /oauth/authorize?provider=github&state=abc123 HTTP/1.1
Origin: https://plainlicense.org/admin
```

**Response**:
```http
HTTP/1.1 302 Found
Location: https://github.com/login/oauth/authorize?client_id=...
Access-Control-Allow-Origin: https://plainlicense.org/admin
```

### POST /oauth/callback

**Purpose**: Exchange authorization code for access token
**Allowed Origins**: All allowlisted origins
**Methods**: POST
**Credentials**: Required

**Request**:
```http
POST /oauth/callback HTTP/1.1
Origin: https://plainlicense.org/admin
Content-Type: application/json

{
  "code": "auth_code_from_provider",
  "state": "abc123",
  "provider": "github"
}
```

**Response**:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://plainlicense.org/admin
Access-Control-Allow-Credentials: true
Content-Type: application/json

{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 900
}
```

### POST /oauth/refresh

**Purpose**: Refresh expired access token
**Allowed Origins**: All allowlisted origins
**Methods**: POST
**Credentials**: Required

**Request**:
```http
POST /oauth/refresh HTTP/1.1
Origin: https://plainlicense.org/admin
Content-Type: application/json
Authorization: Bearer <refresh_token>
```

**Response**:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://plainlicense.org/admin
Access-Control-Allow-Credentials: true
Content-Type: application/json

{
  "access_token": "...",
  "expires_in": 900
}
```

---

## Error Handling

### 403 Forbidden - Invalid Origin

**Response**:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "forbidden",
  "message": "Origin not allowed",
  "origin": "https://evil-site.com/admin"
}
```

**Logging**:
```json
{
  "timestamp": "2026-01-30T12:34:56Z",
  "level": "WARN",
  "event": "cors_violation",
  "origin": "https://evil-site.com/admin",
  "ip": "192.0.2.1",
  "path": "/oauth/callback"
}
```

### 429 Too Many Requests

**Response**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests from this origin",
  "retry_after": 60
}
```

---

## Monitoring & Alerts

### Metrics to Track

1. **CORS Violations**:
   - Count of rejected origins per hour
   - Alert if >10 rejections per hour (potential attack)

2. **Rate Limit Hits**:
   - Origins hitting rate limits
   - Alert if same origin hits limit >3 times per day

3. **OAuth Flow Success Rate**:
   - Successful authorizations / total attempts
   - Alert if success rate <95%

### Cloudflare Workers Analytics

**Custom Metrics**:
```typescript
// Track CORS violations
await env.ANALYTICS.writeDataPoint({
  blobs: ['cors_violation', origin],
  doubles: [1],
  indexes: [request.cf.colo]
});

// Track successful OAuth flows
await env.ANALYTICS.writeDataPoint({
  blobs: ['oauth_success', provider],
  doubles: [1],
  indexes: [request.cf.colo]
});
```

---

## Testing Requirements

### Unit Tests

```typescript
describe('CORS Validation', () => {
  it('allows production origin', async () => {
    const request = new Request('https://auth.plainlicense.org/oauth/callback', {
      method: 'POST',
      headers: { 'Origin': 'https://plainlicense.org/admin' }
    });

    const response = await handleRequest(request);
    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://plainlicense.org/admin');
  });

  it('rejects invalid origin', async () => {
    const request = new Request('https://auth.plainlicense.org/oauth/callback', {
      method: 'POST',
      headers: { 'Origin': 'https://evil-site.com/admin' }
    });

    const response = await handleRequest(request);
    expect(response.status).toBe(403);
  });

  it('enforces rate limits', async () => {
    // Make 11 requests from same origin
    for (let i = 0; i < 11; i++) {
      const response = await handleRequest(mockRequest);
      if (i < 10) expect(response.status).toBe(200);
      else expect(response.status).toBe(429);
    }
  });
});
```

### Integration Tests

```typescript
describe('OAuth Flow with CORS', () => {
  it('completes full OAuth flow from CMS', async () => {
    // 1. Initiate authorization
    const authResponse = await fetch('https://auth.plainlicense.org/oauth/authorize', {
      headers: { 'Origin': 'https://plainlicense.org/admin' }
    });
    expect(authResponse.headers.get('Access-Control-Allow-Origin')).toBeTruthy();

    // 2. Exchange code for token
    const tokenResponse = await fetch('https://auth.plainlicense.org/oauth/callback', {
      method: 'POST',
      headers: { 'Origin': 'https://plainlicense.org/admin' },
      body: JSON.stringify({ code: 'test_code', state: 'test_state' })
    });
    expect(tokenResponse.status).toBe(200);

    // 3. Refresh token
    const refreshResponse = await fetch('https://auth.plainlicense.org/oauth/refresh', {
      method: 'POST',
      headers: {
        'Origin': 'https://plainlicense.org/admin',
        'Authorization': 'Bearer refresh_token'
      }
    });
    expect(refreshResponse.status).toBe(200);
  });
});
```

---

## Deployment Checklist

- [ ] Configure `ALLOWED_ORIGINS` environment variable in Cloudflare Workers
- [ ] Enable Cloudflare Workers KV for rate limiting
- [ ] Setup Cloudflare Workers Analytics for CORS violation tracking
- [ ] Configure alerting for CORS violations (>10/hour)
- [ ] Configure alerting for rate limit hits (same origin >3/day)
- [ ] Test CORS from production CMS domain
- [ ] Verify rate limiting works correctly
- [ ] Document OAuth flow for CMS editors

---

## Related Contracts

- **auth-contract.md**: OAuth 2.0 authentication flow
- **cms-content-contract.md**: Sveltia CMS configuration
- **FR-046**: Authentication security requirements
- **FR-047**: Content Security Policy requirements

---

## Version History

- **v1.0** (2026-01-30): Initial CORS contract based on expert panel recommendations
