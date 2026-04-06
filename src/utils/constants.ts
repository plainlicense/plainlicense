/** Single source of truth for site-wide constants. */

export const SITE_URL = "https://plainlicense.org";
export const SITE_TITLE = "Plain License";
export const SITE_TAGLINE = "Licenses you can actually understand.";
export const SITE_DESCRIPTION =
  "Plain language rewrites of popular licenses — clear, accurate, and free to use.";

export const GITHUB_REPO = "https://github.com/plainlicense/plainlicense";
export const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
export const GITHUB_DISCUSSIONS = `${GITHUB_REPO}/discussions`;

export const ROUTES = {
  HOME: "/",
  LICENSES: "/licenses/",
  BLOG: "/blog/",
  FAQ: "/faq/",
  ABOUT: "/about/",
  HELPING: "/helping/",
  FIND: "/find/",
  SHAME: "/shame/",
  BLOG_RSS: "/blog/rss.xml",
} as const;

export const FAVICON_PATH = "/favicon.svg";

/** Build a canonical license URL from a slug. */
export function licenseUrl(slug: string): string {
  return `${SITE_URL}/licenses/${slug}`;
}

/** Timeout (ms) for copy-to-clipboard success feedback. */
export const COPY_FEEDBACK_MS = 2000;
