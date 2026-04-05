import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";
import {
  getLicenseSlug,
  getPublishedBlogPosts,
  getPublishedLicenses,
} from "../../utils/collections";

/** Brand colors (RGB tuples) */
const COLORS = {
  oxfordBlue: [0, 0, 34] as [number, number, number],
  emerald: [21, 219, 149] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  dutchWhite: [244, 228, 193] as [number, number, number],
  midnight: [13, 15, 21] as [number, number, number],
};

// Google Fonts TTF URLs (use older UA to get TTF format)
const FONT_PLUS_JAKARTA =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap";
const FONT_LEXEND =
  "https://fonts.googleapis.com/css2?family=Lexend+Giga:wght@400;500&display=swap";

async function fetchTtfUrl(cssUrl: string): Promise<string> {
  const res = await fetch(cssUrl, {
    headers: { "User-Agent": "Safari 10" },
  });
  const css = await res.text();
  const match = css.match(/url\(([^)]+\.ttf)\)/);
  if (!match) {
    throw new Error(`Could not extract TTF URL from: ${cssUrl}`);
  }
  return match[1];
}

// ── Gather all pages ────────────────────────────────────────

interface PageData {
  title: string;
  description: string;
}

const pages: Record<string, PageData> = {};

// 1. Licenses
const licenses = await getPublishedLicenses();
for (const license of licenses) {
  const slug = getLicenseSlug(license);
  pages[`licenses/${slug}`] = {
    title: license.data.plain_name || license.data.spdx_id,
    description: license.data.description ?? "",
  };
}

// 2. Blog posts
const blogPosts = await getPublishedBlogPosts();
for (const post of blogPosts) {
  const slug = post.id.replace(/^posts\//, "").replace(/\.mdx?$/, "");
  pages[`blog/${slug}`] = {
    title: post.data.title,
    description: post.data.description ?? "",
  };
}

// 3. Static pages with known titles/descriptions
const staticPages: Record<string, PageData> = {
  index: {
    title: "Plain License",
    description: "Creative licenses in plain language for everyone.",
  },
  "licenses/index": {
    title: "All Licenses",
    description: "Browse all plain language licenses by category.",
  },
  "blog/index": {
    title: "Blog",
    description: "News, guides, and updates from Plain License.",
  },
  "about/index": {
    title: "Plain License's Mission",
    description:
      "Plain License's mission provides simple, clear licenses for everyone.",
  },
  "faq/index": {
    title: "Plain License FAQ",
    description: "Plain License frequently asked questions.",
  },
  shame: {
    title: "Hall of Shame",
    description: "The price of complexity in legal language.",
  },
  "helping/index": {
    title: "How to Contribute",
    description: "How to help improve Plain License.",
  },
  "helping/craft": {
    title: "License Crafting Guide",
    description: "How to improve or add Plain License licenses.",
  },
  "helping/write": {
    title: "Writing Guidelines",
    description: "Writing standards for Plain License content.",
  },
  "helping/translate": {
    title: "Translation Guide",
    description: "Help translate Plain License into other languages.",
  },
  "helping/legal": {
    title: "Legal Feedback",
    description: "Provide legal feedback on Plain License licenses.",
  },
  "helping/code": {
    title: "Developer Guide",
    description: "Contributing code to Plain License.",
  },
  "helping/commit": {
    title: "Commit Format",
    description: "Commit message conventions for Plain License.",
  },
  "helping/voice": {
    title: "Brand Voice Guide",
    description: "Plain License brand voice and tone guidelines.",
  },
  "helping/donate": {
    title: "Donate",
    description: "Support Plain License with a donation.",
  },
};

Object.assign(pages, staticPages);

// ── Resolve fonts ───────────────────────────────────────────

const jakartaTtf = await fetchTtfUrl(FONT_PLUS_JAKARTA);
const lexendTtf = await fetchTtfUrl(FONT_LEXEND);

// ── Generate images ─────────────────────────────────────────

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page: PageData) => ({
    title: page.title,
    description: page.description,
    logo: {
      path: "./src/.reserve/images/logos/logo_only_color_transp.png",
      size: [80],
    },
    bgGradient: [COLORS.midnight, COLORS.oxfordBlue],
    border: {
      color: COLORS.emerald,
      width: 12,
      side: "inline-start",
    },
    padding: 70,
    font: {
      title: {
        color: COLORS.white,
        size: 64,
        weight: "Bold",
        families: ["Plus Jakarta Sans"],
        lineHeight: 1.15,
      },
      description: {
        color: COLORS.dutchWhite,
        size: 32,
        weight: "Normal",
        families: ["Lexend Giga"],
        lineHeight: 1.5,
      },
    },
    fonts: [jakartaTtf, lexendTtf],
  }),
});
