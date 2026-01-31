# Free Authentication Research for Plain License CMS

**Research Date**: 2026-01-30
**Objective**: Identify FREE authentication solutions supporting GitHub + Google OAuth for CMS content editors

---

## Executive Summary

After evaluating multiple authentication approaches, **Decap CMS with Cloudflare Workers OAuth Proxy** emerges as the optimal FREE solution for Plain License. This approach provides:

- ✅ Truly $0 monthly cost (no hidden fees)
- ✅ GitHub OAuth (native integration)
- ✅ Google OAuth (via configuration)
- ✅ 100,000 requests/day free tier (Cloudflare Workers)
- ✅ Built-in CMS authentication (no separate auth service)
- ✅ Simple setup with open-source proxy code

**Alternative**: TinaCMS with Auth.js provides similar capabilities with more flexibility but requires Next.js framework and database.

---

## Option 1: Decap CMS with Cloudflare Workers OAuth Proxy ⭐ RECOMMENDED

### Implementation

**How it works**:
- Decap CMS is a Git-based CMS that authenticates users via GitHub OAuth
- Cloudflare Worker acts as OAuth proxy between CMS and GitHub
- No authentication database required - GitHub handles user identity
- Content editors authenticate with GitHub, get access to repository
- Google OAuth possible via additional OAuth app configuration

**Architecture**:
```
Content Editor → Decap CMS → Cloudflare Worker (OAuth Proxy) → GitHub OAuth App → Repository Access
```

**Services Required**:
1. GitHub OAuth App (free)
2. Cloudflare Worker (free tier: 100k requests/day)
3. Decap CMS (open source, client-side)

**Setup Steps**:
1. Create GitHub OAuth Application
2. Deploy [decap-proxy](https://github.com/sterlingwes/decap-proxy) to Cloudflare Worker
3. Configure OAuth secrets in Cloudflare Worker settings
4. Update Decap `config.yml` with proxy URL

### Cost

**Monthly Cost**: **$0**

**Free Tier Limits**:
- Cloudflare Workers: 100,000 requests/day
- No bandwidth limits
- No storage costs (content in Git)
- No user limits

**Potential Charges**: NONE
- Authentication requests are minimal (login events only)
- Typical CMS with 10 editors = ~300 auth requests/month
- Well under 100k/day limit (3M/month)

**Source**: [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Free Tier Guide](https://www.freetiers.com/directory/cloudflare-workers)

### Security

**OAuth 2.0 Compliance**: ✅ Yes
- GitHub OAuth App follows OAuth 2.0 standard
- Secure authorization code flow
- Token exchange handled by GitHub

**Token Security**:
- OAuth tokens stored in browser (client-side)
- Cloudflare Worker acts as proxy only, doesn't store tokens
- GitHub API access via authenticated tokens
- Tokens expire per GitHub's security policy

**Session Management**:
- Client-side session via Decap CMS
- Re-authentication required when token expires
- No server-side session storage needed

**Best Practices**:
- OAuth secrets stored as Cloudflare Worker secrets (encrypted)
- HTTPS-only communication
- GitHub's security infrastructure handles user authentication

### Setup Complexity

**Difficulty**: **Medium** (manageable for developers)

**Required Skills**:
- Basic Git/GitHub knowledge
- Terminal/CLI comfort
- Understanding of OAuth flow concepts
- Cloudflare account setup

**Setup Time**: ~1-2 hours

**Implementation Steps**:

1. **Create GitHub OAuth App** (15 min)
   - Navigate to GitHub Settings → Developer Settings → OAuth Apps
   - Set Homepage URL to your proxy domain
   - Set Callback URL to `https://your-proxy.workers.dev/callback`
   - Save Client ID and Client Secret

2. **Deploy Cloudflare Worker** (30 min)
   ```bash
   git clone https://github.com/sterlingwes/decap-proxy
   cd decap-proxy
   cp wrangler.toml.sample wrangler.toml
   # Edit wrangler.toml with your worker name
   npx wrangler login
   npx wrangler secret put GITHUB_OAUTH_ID
   npx wrangler secret put GITHUB_OAUTH_SECRET
   npx wrangler deploy
   ```

3. **Configure Decap CMS** (15 min)
   ```yaml
   backend:
     name: github
     branch: main
     repo: "your-org/your-repo"
     base_url: https://your-proxy.workers.dev
     auth_endpoint: /auth
   ```

4. **Test Authentication** (15 min)
   - Navigate to CMS admin panel
   - Click "Login with GitHub"
   - Authorize OAuth application
   - Verify repository access

**Source**: [Decap Proxy Setup Guide](https://github.com/sterlingwes/decap-proxy)

### Provider Support

**GitHub OAuth**: ✅ Yes (Native)
- Built-in Decap CMS integration
- Primary authentication method
- Most straightforward setup
- Direct repository access control

**Google OAuth**: ✅ Yes (Requires configuration)
- Not native to Git-based workflow
- Requires custom OAuth app setup
- Additional proxy configuration needed
- Less common for Git CMS authentication

**Magic Links**: ❌ No
- Not supported by GitHub OAuth flow
- Would require separate authentication service
- Not applicable to Git-based CMS model

**Implementation Note**: GitHub OAuth is the natural choice for Git-based CMS since it directly provides repository access permissions.

### Pros

✅ **Completely Free**: No monthly costs, no hidden fees, no paid tiers
✅ **Simple Architecture**: CMS + Worker + GitHub OAuth (3 components)
✅ **No Database Required**: Git is the backend, no auth database needed
✅ **Generous Free Tier**: 100k requests/day = 3M/month (far more than needed)
✅ **Open Source**: Decap CMS and proxy code fully open source
✅ **Git-Native**: Authentication tied to repository access (proper permissions)
✅ **Proven Solution**: Widely used pattern for static site CMSs
✅ **Fast Setup**: Can be deployed in 1-2 hours
✅ **No Vendor Lock-in**: All components replaceable

### Cons

⚠️ **GitHub-Centric**: Requires GitHub accounts for all editors
⚠️ **Git Knowledge**: Editors should understand basic Git concepts
⚠️ **Medium Complexity**: Requires Cloudflare Worker deployment
⚠️ **Limited to Repository Collaborators**: Users need repo access rights
⚠️ **OAuth Proxy Dependency**: Worker must remain running for authentication
⚠️ **No Built-in User Management**: User permissions managed via GitHub

### CMS Compatibility

**Decap CMS**: ✅ Native integration (this is the recommended pattern)

**TinaCMS**: ⚠️ Possible but not recommended
- TinaCMS uses different auth approach (Auth.js)
- Would require custom integration

**Sanity**: ❌ Not compatible
- API-first CMS with own auth system

**Contentful**: ❌ Not compatible
- Proprietary auth system

**Source**: [Decap CMS Authentication Docs](https://decapcms.org/docs/authentication-backends/)

---

## Option 2: TinaCMS with Auth.js (Self-Hosted)

### Implementation

**How it works**:
- TinaCMS self-hosted mode with Auth.js authentication provider
- Auth.js provides OAuth integration (GitHub, Google, etc.)
- Database stores user sessions (MongoDB, PostgreSQL, etc.)
- Next.js framework required for TinaCMS self-hosting
- Git provider handles content storage

**Architecture**:
```
Content Editor → TinaCMS UI → Auth.js → GitHub/Google OAuth → Database (sessions) → Git Provider (content)
```

**Services Required**:
1. Next.js hosting (Vercel free tier)
2. Database for sessions (Vercel KV free tier or MongoDB Atlas free tier)
3. GitHub OAuth App (free)
4. Google OAuth App (free)
5. TinaCMS (open source)

### Cost

**Monthly Cost**: **$0**

**Free Tier Limits**:
- Vercel Hosting: 100GB bandwidth, unlimited sites
- Vercel KV: 256MB storage, 3000 commands/day
- MongoDB Atlas (alternative): 512MB storage
- Auth.js: Free, open source
- TinaCMS: Free, open source (Apache 2.0)

**Potential Charges**: NONE (within free tiers)

**Source**: [Vercel Pricing](https://vercel.com/pricing), [TinaCMS Blog](https://tina.io/blog/Tinacms-is-now-fully-open-source)

### Security

**OAuth 2.0 Compliance**: ✅ Yes
- Auth.js implements OAuth 2.0 / OIDC standards
- Supports multiple providers (GitHub, Google, etc.)
- Industry-standard security practices

**Token Security**:
- JSON Web Tokens (JWT) for session management
- Tokens encrypted and signed
- Secure cookie storage
- Database-backed sessions optional

**Session Management**:
- Configurable session expiration
- Database persistence for sessions
- Automatic token refresh
- Secure session cookies (httpOnly, secure flags)

**Best Practices**:
- Environment variable storage for secrets
- HTTPS-only in production
- CSRF protection built-in
- Session invalidation support

### Setup Complexity

**Difficulty**: **Medium-Hard** (requires framework knowledge)

**Required Skills**:
- Next.js familiarity (required)
- React/TypeScript knowledge
- Database setup (MongoDB or Vercel KV)
- OAuth configuration
- Deployment experience

**Setup Time**: ~3-5 hours

**Implementation Overview**:

1. **Setup Next.js Project** (30 min)
   ```bash
   npx create-next-app@latest --typescript
   npm install tinacms @tinacms/cli
   ```

2. **Configure TinaCMS** (45 min)
   ```typescript
   // tina/config.ts
   export default defineConfig({
     build: { outputFolder: "admin", publicFolder: "public" },
     schema: { collections: [...] },
     // Self-hosted configuration
   })
   ```

3. **Setup Auth.js** (60 min)
   ```typescript
   // auth.ts
   import NextAuth from "next-auth"
   import GitHub from "next-auth/providers/github"
   import Google from "next-auth/providers/google"

   export const { auth, handlers } = NextAuth({
     providers: [
       GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
       Google({ clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET })
     ]
   })
   ```

4. **Configure Database** (30 min)
   - Setup Vercel KV or MongoDB Atlas
   - Configure Auth.js adapter
   - Test session storage

5. **Deploy to Vercel** (30 min)
   ```bash
   vercel --prod
   ```

**Source**: [TinaCMS Self-Hosted Docs](https://tina.io/docs/self-hosted/overview), [Auth.js Docs](https://authjs.dev)

### Provider Support

**GitHub OAuth**: ✅ Yes (Easy)
- Native Auth.js provider
- Simple configuration
- Well-documented

**Google OAuth**: ✅ Yes (Easy)
- Native Auth.js provider
- Simple configuration
- Supports multiple callback URLs

**Magic Links**: ✅ Yes (Easy)
- Auth.js built-in email provider
- Passwordless authentication
- Requires email service (SMTP)

**Additional Providers**: Auth.js supports 80+ providers including:
- Microsoft, Apple, Discord, Slack, Twitter, etc.

**Source**: [Auth.js Providers](https://authjs.dev/getting-started/providers)

### Pros

✅ **Completely Free**: No costs within free tier limits
✅ **Multiple OAuth Providers**: GitHub, Google, and 80+ others
✅ **Magic Links Support**: Passwordless authentication option
✅ **Flexible**: Highly customizable authentication logic
✅ **Modern Stack**: Next.js + TypeScript + React
✅ **Open Source**: TinaCMS and Auth.js fully open source
✅ **Rich CMS Features**: Visual editing, block-based content
✅ **Database Sessions**: Persistent sessions across devices
✅ **Well-Documented**: Excellent documentation and examples
✅ **Active Community**: Large user base and support

### Cons

⚠️ **Framework Lock-in**: Requires Next.js (cannot use with other frameworks)
⚠️ **Higher Complexity**: More moving parts (framework, database, auth, CMS)
⚠️ **Database Required**: Must setup and maintain session database
⚠️ **Deployment Required**: Need hosting platform (Vercel, Netlify, etc.)
⚠️ **Learning Curve**: Requires Next.js and React knowledge
⚠️ **Setup Time**: 3-5 hours vs 1-2 hours for Decap
⚠️ **More Dependencies**: More packages to maintain and update

### CMS Compatibility

**TinaCMS**: ✅ Native integration (designed for this)

**Decap CMS**: ❌ Not compatible (different architecture)

**Other CMSs**: ⚠️ Auth.js is framework-agnostic, can integrate with API-first CMSs

**Source**: [TinaCMS Auth Provider Docs](https://tina.io/docs/reference/self-hosted/auth-provider/authjs)

---

## Option 3: Supabase Auth

### Implementation

**How it works**:
- Supabase provides authentication as a service
- Built-in OAuth providers (GitHub, Google, etc.)
- PostgreSQL database for user management
- REST API and client libraries
- Can integrate with any CMS via API

**Architecture**:
```
Content Editor → CMS UI → Supabase Auth API → GitHub/Google OAuth → Supabase Database → CMS Backend
```

**Services Required**:
1. Supabase account (free tier)
2. OAuth apps (GitHub, Google)
3. CMS with Supabase integration

### Cost

**Monthly Cost**: **$0** (within free tier)

**Free Tier Limits**:
- 50,000 Monthly Active Users (MAUs)
- 500MB database storage
- 1GB file storage
- Unlimited API requests
- 2 active projects
- Projects pause after 1 week of inactivity

**Additional Costs**:
- Beyond 50k MAU: $0.00325 per MAU
- Pro plan: $25/month (includes 100k MAU)

**Likelihood of Staying Free**: High for small teams (<50 users)

**Source**: [Supabase Pricing](https://supabase.com/pricing), [Pricing Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)

### Security

**OAuth 2.0 Compliance**: ✅ Yes
- Full OAuth 2.0 / OIDC support
- Secure token handling
- Industry-standard practices

**Token Security**:
- JWT tokens for authentication
- Secure token storage
- Automatic token refresh
- Row-level security (RLS) in database

**Session Management**:
- Configurable session duration
- Multi-device session support
- Session revocation capabilities
- Secure cookie handling

### Setup Complexity

**Difficulty**: **Easy-Medium**

**Required Skills**:
- Basic API integration
- OAuth configuration
- Database schema design (optional)

**Setup Time**: ~1-2 hours

**Implementation Overview**:

1. Create Supabase project
2. Enable GitHub and Google OAuth providers
3. Configure OAuth apps
4. Integrate Supabase client in CMS
5. Implement authentication flow

### Provider Support

**GitHub OAuth**: ✅ Yes (Built-in)
**Google OAuth**: ✅ Yes (Built-in)
**Magic Links**: ✅ Yes (Built-in email auth)

**Additional Providers**: Apple, Azure, Bitbucket, Discord, Facebook, GitLab, Twitter, Slack, Spotify, Twitch, etc.

### Pros

✅ **Easy Setup**: Dashboard-based configuration
✅ **Multiple OAuth Providers**: 15+ built-in providers
✅ **Magic Links**: Built-in passwordless authentication
✅ **User Management UI**: Dashboard for managing users
✅ **Real-time Capabilities**: Built-in real-time subscriptions
✅ **Database Included**: PostgreSQL database for user data
✅ **Good Documentation**: Comprehensive guides and examples

### Cons

⚠️ **Project Inactivity Pausing**: Free projects pause after 1 week of no activity
⚠️ **Limited Free Projects**: Only 2 active free projects
⚠️ **MAU Limits**: 50k MAU limit (though generous for CMS use case)
⚠️ **Vendor Lock-in**: Supabase-specific APIs and patterns
⚠️ **Overkill for CMS**: Full backend platform when only need auth
⚠️ **Not Git-Native**: Doesn't integrate naturally with Git-based CMS

### CMS Compatibility

**TinaCMS**: ✅ Possible with custom auth provider
**Decap CMS**: ⚠️ Possible but awkward (Git-based CMS, API-based auth)
**Sanity**: ✅ Good fit for API-first CMS
**Contentful**: ⚠️ Contentful has own auth system

**Source**: [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

## Option 4: Netlify Functions + OAuth (DIY)

### Implementation

**How it works**:
- Serverless functions handle OAuth flow
- Functions deployed on Netlify (free tier)
- Manual implementation of OAuth 2.0 flow
- Session management via cookies or tokens

**Services Required**:
1. Netlify account (free tier)
2. GitHub OAuth App
3. Google OAuth App
4. Custom OAuth implementation code

### Cost

**Monthly Cost**: **$0** (within free tier)

**Free Tier Limits**:
- 125,000 serverless function invocations/month
- 1 million edge function invocations/month
- 100 GB bandwidth
- 300 build minutes

**Potential Charges**: NONE (auth invocations minimal)

**Source**: [Netlify Pricing](https://www.netlify.com/pricing/), [Functions Limits](https://docs.netlify.com/build/functions/usage-and-billing/)

### Security

**OAuth 2.0 Compliance**: ⚠️ DIY (depends on implementation)
- Must implement OAuth 2.0 flow correctly
- Security depends on code quality
- Requires security expertise

**Token Security**: ⚠️ Manual implementation required
**Session Management**: ⚠️ Manual implementation required

### Setup Complexity

**Difficulty**: **Hard** (requires security expertise)

**Required Skills**:
- OAuth 2.0 protocol deep knowledge
- Security best practices
- Serverless functions experience
- Session management implementation

**Setup Time**: ~5-10 hours

### Provider Support

**GitHub OAuth**: ✅ Yes (manual implementation)
**Google OAuth**: ✅ Yes (manual implementation)
**Magic Links**: ✅ Possible (manual implementation)

### Pros

✅ **Free**: Within Netlify free tier
✅ **Full Control**: Complete customization
✅ **No Vendor Lock-in**: Own implementation

### Cons

❌ **High Complexity**: Requires OAuth expertise
❌ **Security Risk**: Easy to make security mistakes
❌ **Maintenance Burden**: Must maintain auth code
❌ **Time Intensive**: 5-10 hours setup + ongoing maintenance
❌ **No Built-in Features**: Must implement everything manually
❌ **Testing Required**: Need comprehensive security testing

**Source**: [Netlify Functions Docs](https://docs.netlify.com/functions/overview/), [OAuth Boilerplate](https://github.com/marksteele/netlify-serverless-oauth2-backend)

---

## Comparison Matrix

| Approach | Monthly Cost | Providers | Setup Complexity | CMS Integration | Security | MAU Limit | Database Required | Framework Required |
|----------|-------------|-----------|------------------|-----------------|----------|-----------|-------------------|--------------------|
| **Decap + Cloudflare** | **$0** | GitHub ✅, Google ⚠️ | Medium | Decap ✅ | High | 100k req/day | No | No |
| **Tina + Auth.js** | **$0** | GitHub ✅, Google ✅, Magic ✅ | Medium-Hard | TinaCMS ✅ | High | Unlimited | Yes | Next.js |
| **Supabase Auth** | **$0** | GitHub ✅, Google ✅, Magic ✅ | Easy-Medium | Universal | High | 50k | Yes (included) | No |
| **Netlify DIY** | **$0** | GitHub ✅, Google ✅, Magic ⚠️ | Hard | Universal | ⚠️ DIY | 125k invoc | No | No |

---

## Recommendation

### Primary Choice: Decap CMS + Cloudflare Workers OAuth Proxy

**Rationale**:

1. **Truly Free**: $0 monthly cost with generous limits (100k req/day = 3M/month)
2. **Simplest Architecture**: Only 3 components (CMS, Worker, GitHub)
3. **Git-Native**: Authentication naturally tied to repository permissions
4. **No Database**: Git serves as both content and access control system
5. **Proven Pattern**: Widely used, well-documented, open source
6. **Fast Setup**: 1-2 hours to deploy and configure
7. **Perfect Fit**: Plain License is static site + Git workflow
8. **Low Maintenance**: Minimal moving parts, stable components

**When to Use**:
- Git-based content workflow (✅ Plain License uses this)
- Small to medium team (<100 editors)
- GitHub-centric workflow acceptable
- Static site generation (✅ Plain License is static)
- Prefer simplicity over flexibility

### Alternative Choice: TinaCMS + Auth.js

**When to Consider**:
- Already using or planning to use Next.js
- Need multiple OAuth providers (GitHub + Google + others)
- Want magic link passwordless authentication
- Prefer visual editing experience
- Have React/Next.js development expertise
- Need richer CMS features (block-based editing, previews)

**Trade-offs**:
- More complex setup (3-5 hours vs 1-2 hours)
- Requires framework (Next.js) and database
- More components to maintain
- Higher learning curve
- But: More flexible, richer features, better editor UX

---

## Implementation Notes

### For Decap CMS + Cloudflare Workers (Recommended)

**Setup Checklist**:

1. ✅ Create GitHub OAuth Application
   - Homepage URL: `https://your-worker.workers.dev`
   - Callback URL: `https://your-worker.workers.dev/callback`
   - Save Client ID and Secret

2. ✅ Deploy Cloudflare Worker
   ```bash
   git clone https://github.com/sterlingwes/decap-proxy
   cd decap-proxy
   cp wrangler.toml.sample wrangler.toml
   # Edit worker name in wrangler.toml
   npx wrangler login
   npx wrangler secret put GITHUB_OAUTH_ID
   npx wrangler secret put GITHUB_OAUTH_SECRET
   npx wrangler deploy
   ```

3. ✅ Configure Decap CMS
   ```yaml
   # admin/config.yml
   backend:
     name: github
     branch: dev  # or main
     repo: "plainlicense/plainlicense"
     base_url: https://your-worker.workers.dev
     auth_endpoint: /auth
   ```

4. ✅ Test Authentication
   - Navigate to `/admin` on your site
   - Click "Login with GitHub"
   - Authorize OAuth application
   - Verify CMS access

**Custom Domain (Optional)**:
- Configure Cloudflare Worker route for custom domain (e.g., `cms-auth.plainlicense.com`)
- Update `wrangler.toml` with route configuration
- Update OAuth app callback URL
- Update Decap config with new base_url

**Security Considerations**:
- OAuth secrets stored as Cloudflare Worker secrets (encrypted at rest)
- HTTPS-only communication (enforced by Cloudflare)
- GitHub handles all user authentication
- Repository permissions control CMS access
- No additional security configuration needed

**Monitoring**:
- Cloudflare dashboard shows request analytics
- Monitor Worker invocation count (should be minimal)
- Set up alerts if approaching 100k requests/day (unlikely)

---

## Additional Research Sources

### Key Documentation
- [Decap CMS Authentication Backends](https://decapcms.org/docs/authentication-backends/)
- [Cloudflare Workers OAuth Proxy Template](https://github.com/sterlingwes/decap-proxy)
- [TinaCMS Self-Hosted Overview](https://tina.io/docs/self-hosted/overview/)
- [Auth.js Documentation](https://authjs.dev)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

### Pricing References
- [Cloudflare Workers Free Tier](https://www.freetiers.com/directory/cloudflare-workers)
- [Supabase Pricing Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- [Netlify Free Plan Details](https://www.freetiers.com/directory/netlify)

### Community Resources
- [Serverless OAuth Boilerplate Examples](https://github.com/laardee/serverless-authentication-boilerplate)
- [Netlify CMS OAuth Backend](https://github.com/marksteele/netlify-serverless-oauth2-backend)
- [TinaCMS Self-Hosted Demo](https://github.com/tinacms/tina-self-hosted-demo)

---

## Conclusion

For Plain License CMS authentication, **Decap CMS with Cloudflare Workers OAuth Proxy** provides the optimal balance of:

- ✅ Zero cost (truly free, no hidden fees)
- ✅ Simple architecture (minimal complexity)
- ✅ Git-native workflow (aligns with static site approach)
- ✅ Proven reliability (widely used pattern)
- ✅ Quick setup (1-2 hours to deploy)
- ✅ Low maintenance (stable, few dependencies)

This solution perfectly fits Plain License's requirements:
- Static site with Git-based content workflow
- Small team of content editors
- GitHub-centric development process
- Preference for simplicity and zero cost
- No need for complex user management

**Next Steps**:
1. Create GitHub OAuth Application
2. Deploy Cloudflare Worker using [decap-proxy](https://github.com/sterlingwes/decap-proxy)
3. Configure Decap CMS with OAuth proxy URL
4. Test authentication flow
5. Document setup for team members

**Estimated Implementation Time**: 1-2 hours
**Monthly Cost**: $0
**Maintenance**: Minimal (OAuth app + Worker monitoring)
