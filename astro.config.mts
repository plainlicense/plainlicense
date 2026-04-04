/// <reference types="astro/client" />

import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import astroCloudflarePagesHeaders from "astro-cloudflare-pages-headers";
import favicons from "astro-favicons";
import { defineConfig, fontProviders, sessionDrivers } from "astro/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import rehypeExternalLinks from "rehype-external-links";
import starlightAutoDrafts from "starlight-auto-drafts";
import starlightBlog from "starlight-blog";
import starlightHeadingBadges from "starlight-heading-badges";
import starlightLLMsTxt from "starlight-llms-txt";
import starlightPageActions from "starlight-page-actions";
import starlightTags from "starlight-tags";
import { searchForWorkspaceRoot } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import exportsIntegration from "./src/integrations/exports.js";

const rootDir = searchForWorkspaceRoot(process.cwd());
if (!rootDir) {
  throw new Error(
    "Could not find workspace root. Ensure that this project is within a valid workspace with a package.json file.",
  );
}

const headers = {
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data: https://avatars.githubusercontent.com https://ui-avatars.com; style-src 'self' 'unsafe-inline'; frame-src 'self' https://challenges.cloudflare.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const __dirname = dirname(fileURLToPath(import.meta.url));

type LicenseCategory =
  | "public-domain"
  | "permissive"
  | "copyleft"
  | "source-available"
  | "proprietary";

const appName = "PlainLicense";

/**
 * Automatically generate short-slug redirects for all licenses.
 * Reads content/licenses/{category}/{name}.md and maps:
 *   /licenses/{name}  →  /licenses/{category}/{name}
 *   /{name}           →  /licenses/{category}/{name}
 *
 * Adding a new license file is all that's needed — no manual config step.
 */
function getLicenseRedirects() {
  const redirects: Record<string, string> = {};
  const contentBase = join(__dirname, "content/licenses");
  let categories: LicenseCategory[];
  try {
    categories = readdirSync(contentBase) as LicenseCategory[];
  } catch (err) {
    if (err && (err as { code?: string }).code === "ENOENT") {
      // content/licenses does not exist; no license redirects to generate.
      return redirects;
    }
    throw err;
  }
  for (const category of categories) {
    const catDir = join(contentBase, category);
    try {
      if (!statSync(catDir).isDirectory()) continue;
    } catch (err) {
      if (err && (err as { code?: string }).code === "ENOENT") {
        // Category directory disappeared or is missing; skip it.
        continue;
      }
      throw err;
    }
    let files: string[];
    try {
      files = readdirSync(catDir);
    } catch (err) {
      if (err && (err as { code?: string }).code === "ENOENT") {
        // Category directory disappeared between checks; skip it.
        continue;
      }
      throw err;
    }
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const name = file.replace(/\.md$/, "");
      const canonical = `/licenses/${category}/${name}`;
      const shortWithPrefix = `/licenses/${name}`;
      const shortRoot = `/${name}`;
      if (shortWithPrefix in redirects || shortRoot in redirects) {
        throw new Error(
          `License name conflict: "${name}" appears in multiple categories. ` +
            `Each license name must be unique across all categories.`,
        );
      }
      // Short URL without category: /licenses/mit → /licenses/permissive/mit
      redirects[shortWithPrefix] = canonical;
      // Shortest URL at root: /mit → /licenses/permissive/mit
      redirects[shortRoot] = canonical;
    }
  }
  return redirects;
}

const categoryLabels: Record<LicenseCategory, string> = {
  permissive: "Permissive",
  copyleft: "Copyleft",
  "public-domain": "Public Domain",
  "source-available": "Source Available",
  proprietary: "Proprietary",
};

/**
 * Build the Starlight sidebar from the license content directory + static pages.
 * Reads content/licenses/{category}/{name}.md at config time so new licenses
 * appear automatically without manual sidebar edits.
 */
function buildSidebar() {
  const contentBase = join(__dirname, "content/licenses");
  const licenseGroups: {
    label: string;
    items: { label: string; link: string }[];
  }[] = [];

  for (const [category, label] of Object.entries(categoryLabels)) {
    const catDir = join(contentBase, category);
    let files: string[];
    try {
      if (!statSync(catDir).isDirectory()) continue;
      files = readdirSync(catDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }
    if (files.length === 0) continue;
    licenseGroups.push({
      label,
      items: files.map((f) => {
        const name = f.replace(/\.md$/, "");
        const filePath = join(catDir, f);
        // Extract plain_name from YAML frontmatter for a readable sidebar label
        let displayLabel = name.toUpperCase();
        try {
          const content = readFileSync(filePath, "utf-8");
          const match = content.match(/^plain_name:\s*(.+)$/m);
          if (match) displayLabel = match[1].trim().replace(/^['"]|['"]$/g, "");
        } catch {
          // Fall back to uppercase slug
        }
        return {
          label: displayLabel,
          link: `/licenses/${category}/${name}/`,
        };
      }),
    });
  }

  return [
    {
      label: "Licenses",
      items: [{ label: "All Licenses", link: "/licenses/" }, ...licenseGroups],
    },
    {
      label: "About",
      items: [
        { label: "Our Mission", link: "/about/" },
        { label: "FAQ", link: "/faq/" },
      ],
    },
    {
      label: "Contributing",
      collapsed: true,
      items: [
        { label: "How to Help", link: "/helping/" },
        { label: "License Crafting", link: "/helping/craft/" },
        { label: "Writing Guidelines", link: "/helping/write/" },
        { label: "Translations", link: "/helping/translate/" },
        { label: "Legal Feedback", link: "/helping/legal/" },
        { label: "Developer Guide", link: "/helping/code/" },
        { label: "Commit Format", link: "/helping/commit/" },
        { label: "Brand Voice", link: "/helping/voice/" },
        { label: "Donate", link: "/helping/donate/" },
      ],
    },
    {
      label: "Blog",
      link: "/blog/",
    },
  ];
}

export default defineConfig({
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "node",
    experimental: {
      headersAndRedirectsDevModeSupport: true,
    },
    configPath: "./wrangler.json",
    imagesBindingName: "IMAGES",
    sessionKVBindingName: "SESSION",
  }),
  base: "/",
  build: {
    assets: "_astro",
    inlineStylesheets: "auto",
  },
  compressHTML: true,
  experimental: {
    chromeDevtoolsWorkspace: true,
    clientPrerender: true,
    contentIntellisense: true,
    queuedRendering: {
      contentCache: true,
      enabled: true,
    },
    rustCompiler: true,
    svgo: {
      plugins: ["preset-default"],
    },
  },
  trailingSlash: "always",
  fonts: [
    {
      cssVariable: "--sl-font",
      fallbacks: [
        "Noto Sans",
        "Helvetica Neue",
        "Helvetica",
        "system-ui",
        "sans-serif",
      ],
      formats: ["woff2", "woff"],
      name: "Lexend",
      provider: fontProviders.google(),
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
      weights: [300, 400, 500, 600, 700],
    },
    {
      cssVariable: "--sl-font-mono",
      fallbacks: [
        "Fira Code",
        "Inconsolata",
        "Monaco",
        "Consolas",
        "Courier New",
        "monospace",
      ],
      formats: ["woff2", "woff"],
      name: "JetBrains Mono",
      provider: fontProviders.google(),
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      weights: [400, 500, 700],
    },
    {
      cssVariable: "--font-heading",
      fallbacks: [
        "Noto Sans",
        "Helvetica Neue",
        "Helvetica",
        "system-ui",
        "sans-serif",
      ],
      formats: ["woff2", "woff"],
      name: "Plus Jakarta Sans",
      provider: fontProviders.google(),
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      weights: [500, 600, 700, 800],
    },
  ],
  // Image optimization
  image: {
    domains: [
      "avatars.githubusercontent.com",
      "docs.plainlicense.org",
      "generativelanguage.googleapis.com",
      "github.com",
      "https://1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com",
      "media.plainlicense.org",
      "picsum.photos",
      "plainlicense.org",
      "plainr.plainlicense.org",
      "raw.githubusercontent.com",
      "readscore.plainlicense.org",
      "ui-avatars.com",
    ],
    layout: "constrained",
    responsiveStyles: true,
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    astroCloudflarePagesHeaders({}),
    starlight({
      title: "Plain License",
      description: "Creative licenses in plain language for everyone.",
      logo: {
        src: "./src/assets/images/logo_named.svg",
        alt: "Plain License Logo",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/plainlicense/plainlicense",
        },
      ],
      components: {
        Header: "./src/components/overrides/Header.astro",
        Footer: "./src/components/overrides/Footer.astro",
        Sidebar: "./src/components/overrides/Sidebar.astro",
        ThemeSelect: "./src/components/overrides/ThemeSelect.astro",
      },
      customCss: ["./src/assets/stylesheets/custom.css"],
      expressiveCode: {
        themes: ["ayu-dark", "github-light-high-contrast"],
        useStarlightDarkModeSwitch: true,
        removeUnusedThemes: true,
        shiki: {
          bundledLangs: [
            "json",
            "yaml",
            "git-commit",
            "markdown",
            "diff",
            "typescript",
            "javascript",
          ],
        },
      },
      sidebar: buildSidebar(),
      plugins: [
        starlightBlog({
          authors: {
            adam: {
              name: "Adam Poulemanos",
              url: "https://github.com/bashandbone",
              picture: "https://avatars.githubusercontent.com/u/89049923?v=4",
              title: "Founder",
            },
          },
          metrics: {
            readingTime: true,
          },
          rss: true,
        }),
        starlightAutoDrafts(),
        starlightHeadingBadges(),
        starlightPageActions({
          baseUrl: `https://docs.knitli.com/${appName.toLowerCase()}`,
          actions: { claude: true, chatgpt: true, markdown: true },
          share: true,
        }),

        starlightLLMsTxt({
          projectName: "Plain License",
          description: `Plain License is a community project that provides creative licenses in plain language for everyone. Our mission is to make it easy for creators and users to understand their rights and obligations under various licenses, without needing a law degree.
          
          We recraft popular creative licenses into easy-to-understand versions that capture the original intent. All Plain License licenses have fallback provisions to their original hard-to-understand counterparts, ensuring similar legal treatment while being more accessible. Our project is open source and community-driven, with contributions from volunteers around the world. We believe that clear, plain language licenses can empower creators and users alike, fostering a more inclusive and vibrant creative ecosystem.
          `,
          promote: [
            "/licenses/*/*/*",
            "/blog/**",
            "/index*",
            "/faq/*",
            "/helping/*",
            "/about/*",
          ],
          demote: [
            "/contributing*",
            "/changelog*",
            "/tags*",
            "/series*",
            "/authors*",
            "/admin*",
          ],
          minify: {
            whitespace: true,
            note: true,
            details: true,
          },
        }),
        starlightTags({
          onInlineTagsNotFound: "warn",
        }),
      ],
    }),
    sitemap({
      filter: (page) => {
        return !/\^\/(?!(cdn-cgi|admin)\/)/.test(page);
      },
      changefreq: "weekly",
      lastmod: new Date(),
      namespaces: {
        image: false,
        video: false,
      },
    }),
    favicons({
      name: "Plain License",
      short_name: "PlainLicense",
      input: {
        favicons: [
          join(__dirname, "src/assets/images/logo_only_color_transp.svg"),
        ],
      },
    }),
    preact(),
    mdx(),
    exportsIntegration(),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        dark: "ayu-dark",
        light: "github-light-high-contrast",
      },
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          content: { type: "text", value: " \u{279A}" },
          rel: ["nofollow"],
        },
      ],
    ],
  },
  output: "static",
  prefetch: {
    defaultStrategy: "viewport",
  },
  prerenderConflictBehavior: "warn",
  redirects: getLicenseRedirects(),
  session: {
    driver: sessionDrivers.cloudflareKVBinding({
      binding: "SESSION",
    }),
  },
  site: "https://plainlicense.org",
  server: {
    headers: headers,
  },
  vite: {
    assetsInclude: [
      "src/*.webp",
      "src/*.png",
      "src/*.jpg",
      "src/*.jpeg",
      "src/*.svg",
      "src/*.avif",
    ],
    build: {
      cssCodeSplit: true,
      cssMinify: "esbuild",
      minify: "esbuild",
      rollupOptions: {
        external: [],
        jsx: {
          factory: "h",
          fragment: "Fragment",
        },
        treeshake: "smallest",
      },
    },
    optimizeDeps: {
      exclude: ["starlight-blog", "starlight-auto-drafts", "starlight-tags"],
    },
    plugins: [tsConfigPaths()],
    server: {
      fs: {
        allow: [rootDir],
      },
      headers: headers,
    },
  },
});
