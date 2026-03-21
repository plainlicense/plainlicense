import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import favicons from "astro-favicons";
import sveltia from "astro-loader-sveltia-cms";
import { defineConfig, fontProviders, sessionDrivers } from "astro/config";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import starlightAutoDrafts from "starlight-auto-drafts";
import starlightBlog from "starlight-blog";
import starlightContextualMenu from "starlight-contextual-menu";
import starlightHeadingBadges from "starlight-heading-badges";
import starlightLLMsTxt from "starlight-llms-txt";
import starlightTags from "starlight-tags";
import { searchForWorkspaceRoot } from "vite";
import exportsIntegration from "./src/integrations/exports.ts";

const rootDir = searchForWorkspaceRoot(process.cwd());
if (!rootDir) {
  throw new Error(
    "Could not find workspace root. Ensure that this project is within a valid workspace with a package.json file.",
  );
}
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Automatically generate short-slug redirects for all licenses.
 * Reads content/licenses/{category}/{name}.md and maps:
 *   /licenses/{name}  →  /licenses/{category}/{name}
 *   /{name}           →  /licenses/{category}/{name}
 *
 * Adding a new license file is all that's needed — no manual config step.
 */
function getLicenseRedirects() {
  const redirects = {};
  const contentBase = join(__dirname, "content/licenses");
  let categories;
  try {
    categories = readdirSync(contentBase);
  } catch (err) {
    if (err && err.code === "ENOENT") {
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
      if (err && err.code === "ENOENT") {
        // Category directory disappeared or is missing; skip it.
        continue;
      }
      throw err;
    }
    let files;
    try {
      files = readdirSync(catDir);
    } catch (err) {
      if (err && err.code === "ENOENT") {
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

export default defineConfig({
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "workerd",
    config: {
      account_id: "1bb2d128ac96f8ee9dc75e99a54e9260",
      assets: {
        binding: "ASSETS",
        directory: `${rootDir}/dist`,
        html_handling: "auto-trailing-slash",
        not_found_handling: "single-page-application",
        run_worker_first: false,
      },
      compatibility_date: "2025-03-20",
      compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
      kv_namespaces: [
        {
          binding: "SESSION",
        },
      ],
      name: "plainlicense",
      observability: {
        enabled: true,
      },
      placement: {
        mode: "smart",
      },
      preview_urls: true,
      routes: [
        {
          custom_domain: true,
          pattern: "plainlicense.org",
        },
      ],
      vars: {
        // R2 bucket's access key (not secret key) for CMS images
        S3_ACCESS_KEY: "2af46c19f417f0b062f540805412da84",
      },
      secrets_store_secrets: [
        {
          secret_name: "PL_S3_SECRET_KEY",
          binding: "S3_SECRET_KEY",
          store_id: "98acd7f077774ecfb34a31ac8cce6c98",
        },
      ],
      workers_dev: true,
    },
    sessionKVBindingName: "SESSION",
    auxiliaryWorkers: [
      {
        config: {
          account_id: "1bb2d128ac96f8ee9dc75e99a54e9260",
          compatibility_date: "2025-03-20",
          main: `${rootDir}/workers/oauth/src/index.js`,
          minify: true,
          compatibility_flags: [
            "nodejs_compat",
            "global_fetch_strictly_public",
          ],
          name: "plainlicense-oauth-proxy",
          routes: [
            {
              pattern: "auth.plainlicense.org",
              custom_domain: true,
            },
          ],
          vars: {
            ALLOWED_DOMAINS: "plainlicense.org,*.plainlicense.org",
          },
          observability: {
            enabled: true,
          },
          placement: {
            mode: "smart",
          },
          secret_store_secrets: [
            {
              secret_name: "GITHUB_CLIENT_ID",
              binding: "GITHUB_CLIENT_ID",
              store_id: "98acd7f077774ecfb34a31ac8cce6c98",
            },
            {
              secret_name: "GITHUB_CLIENT_SECRET",
              binding: "GITHUB_CLIENT_SECRET",
              store_id: "98acd7f077774ecfb34a31ac8cce6c98",
            },
          ],
          preview_urls: false,
          workers_dev: false,
          assets: {
            binding: "auth_proxy_assets",
            directory: `${rootDir}/workers/oauth/public`,
            run_worker_first: false,
            html_handling: "auto-trailing-slash",
            not_found_handling: "404-page",
          },

          ratelimits: [
            {
              name: "OAUTH_PROXY_RATE_LIMIT",
              namespace_id: "2000",
              simple: {
                limit: 10,
                period: 60,
              },
            },
          ],
        },
      },
    ],
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
  favicon: join(__dirname, "assets/images/logo_only_color_transp.svg"),
  fonts: [
    {
      cssVariable: "--sl-font",
      fallbacks: [
        "Noto Sans",
        "Open Sans",
        "Lato",
        "Helvetica Neue",
        "Helvetica",
        "system-ui",
        "sans-serif",
      ],
      formats: ["woff2", "woff"],
      name: "Inter",
      provider: fontProviders.google(),
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      weights: [500, 700],
    },
    {
      cssVariable: "--sl-font-mono",
      fallbacks: [
        "Fira Code Mono",
        "Inconsolata",
        "Monaco",
        "Consolas",
        "Courier New",
        "monospace",
      ],
      formats: ["woff2", "woff"],
      name: "Source Code Pro",
      provider: fontProviders.google(),
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      weights: [500, 700],
    },
    {
      cssVariable: "--font-raleway",
      fallbacks: [
        "Montserrat",
        "Noto Sans",
        "Open Sans",
        "Lato",
        "Helvetica Neue",
        "Helvetica",
        "system-ui",
        "sans-serif",
      ],
      formats: ["woff2", "woff"],
      name: "Raleway",
      provider: fontProviders.google(),
      styles: ["normal"],
      subsets: ["latin"],
      weights: [500, 700],
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
    sveltia({
      title: "Plain License CMS",
      route: "/admin/",
      config: {
        backend: {
          name: "github",
          repo: "plainlicense/plainlicense",
          branch: "main",
          base_url: "https://auth.plainlicense.org",
        },
        collections: [
          {
            name: "licenses",
            label: "Licenses",
            folder: "content/licenses",
            path: "{{category}}/{{slug}}",
            create: true,
            identifier_field: "plain_name",
            fields: [
              // Zone 1 - Identity
              { label: "Title", name: "title", widget: "string" },
              {
                label: "Plain language name (e.g. 'Plain MIT License')",
                name: "plain_name",
                widget: "string",
              },
              { label: "SPDX ID", name: "spdx_id", widget: "string" },
              {
                label: "Version of this plain language version",
                name: "plain_version",
                widget: "string",
                hint: "Semver, e.g. 1.0.0",
              },
              {
                name: "license_family",
                label: "License family",
                widget: "select",
                options: [
                  "public-domain",
                  "permissive",
                  "copyleft",
                  "source-available",
                  "proprietary",
                ],
              },
              {
                label: "Is this a public domain dedication (not a license)?",
                name: "is_dedication",
                widget: "boolean",
                default: false,
              },
              {
                label: "Status",
                name: "status",
                widget: "select",
                options: ["draft", "published"],
                default: "draft",
              },
              {
                label:
                  "Description (1–3 sentences, answers 'what kind of license is this?')",
                name: "description",
                widget: "text",
              },
              {
                name: "tldr",
                label:
                  "TL;DR — 2 to 4 bullets (answers 'what do I need to know right now?')",
                widget: "list",
                field: { widget: "string" },
              },
              // Zone 3 - Conditions
              {
                label: "Requires attribution?",
                name: "attribution_required",
                widget: "boolean",
                default: false,
              },
              {
                label:
                  "Additional how-to instructions (leave blank for most licenses)",
                name: "extra_how",
                widget: "markdown",
                required: false,
              },
              // Claude mapping fields
              {
                label: "Has a clause map?",
                name: "has_mapping",
                widget: "boolean",
                default: false,
              },
              {
                label: "Clause map version",
                name: "mapping_version",
                widget: "string",
                required: false,
                hint: "Semver. Required if has_mapping is true.",
              },
              // Display controls
              {
                label: "Show original comparison?",
                name: "show_original_comparison",
                widget: "boolean",
                default: true,
              },
              {
                label: "Show shame counter?",
                name: "show_shame_counter",
                widget: "boolean",
                default: true,
              },
              {
                label: "Featured?",
                name: "featured",
                widget: "boolean",
                default: false,
              },
              {
                label: "Fair Code license?",
                name: "fair_code",
                widget: "boolean",
                default: false,
              },
              // SEO fields (optional overrides for auto-generated values)
              {
                label: "Meta description (overrides auto-generated)",
                name: "meta_description",
                widget: "string",
                required: false,
              },
              {
                label: "OG Image",
                name: "og_image",
                widget: "image",
                required: false,
              },
              {
                label: "Authors",
                name: "authors",
                widget: "list",
                required: false,
              },
              {
                label: "Changelog",
                name: "changelog",
                widget: "text",
                required: false,
              },
              // Readability metrics (computed at build time)
              {
                label: "Readability: Gunning Fog",
                name: "plain_gunning_fog",
                widget: "number",
                value_type: "float",
                required: false,
              },
              {
                label: "Shame Words Count",
                name: "shame_words_count",
                widget: "number",
                value_type: "int",
                required: false,
              },
              {
                label:
                  "Original license (leave blank for PlainLicense originals)",
                name: "original",
                widget: "object",
                required: false,
                fields: [
                  {
                    label: "Full original name (e.g. 'MIT License')",
                    name: "name",
                    widget: "string",
                  },
                  {
                    label: "SPDX identifier",
                    name: "spdx_id",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "Version (raw, e.g. '2.0')",
                    name: "version",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "Display version (e.g. 'MIT License (1988)')",
                    name: "version_display",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "Steward organization",
                    name: "organization",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "Has a single official authoritative source?",
                    name: "has_official_source",
                    widget: "boolean",
                    default: false,
                  },
                  {
                    label: "Canonical URL",
                    name: "canonical_url",
                    widget: "string",
                  },
                  {
                    label:
                      "Does the original text include a link to its own canonical URL?",
                    name: "link_in_original",
                    widget: "boolean",
                    default: false,
                  },
                  {
                    label: "Deprecated in SPDX?",
                    name: "is_deprecated",
                    widget: "boolean",
                    default: false,
                  },
                  {
                    label: "OSI Approved",
                    name: "is_osi_approved",
                    widget: "boolean",
                    required: false,
                  },
                  {
                    label: "FSF Approved",
                    name: "is_fsf_approved",
                    widget: "boolean",
                    required: false,
                  },
                  {
                    name: "permissions",
                    label: "Permissions (choosealicense.com tags)",
                    widget: "select",
                    multiple: true,
                    required: false,
                    options: [
                      "commercial-use",
                      "distribution",
                      "modifications",
                      "patent-use",
                      "private-use",
                      "revokable",
                    ],
                  },
                  {
                    name: "conditions",
                    label: "Conditions (choosealicense.com tags)",
                    widget: "select",
                    multiple: true,
                    required: false,
                    options: [
                      "disclose-source",
                      "document-changes",
                      "include-copyright",
                      "include-copyright--source",
                      "network-use-disclose",
                      "same-license",
                      "same-license--file",
                      "same-license--library",
                    ],
                  },
                  {
                    name: "limitations",
                    label: "Limitations (choosealicense.com tags)",
                    widget: "select",
                    multiple: true,
                    required: false,
                    options: [
                      "liability",
                      "patent-use",
                      "trademark-use",
                      "warranty",
                    ],
                  },
                  { label: "Body", name: "body", widget: "markdown" },
                ],
              },
            ],
          },
          {
            name: "blog-posts",
            label: "Blog",
            folder: "content/blog/posts",
            create: true,
            fields: [
              { label: "Title", name: "title", widget: "string" },
              { label: "Date", name: "date", widget: "datetime" },
              { label: "Author", name: "author", widget: "string" },
              { label: "Description", name: "description", widget: "text" },
              {
                label: "Tags",
                name: "tags",
                widget: "list",
                required: false,
              },
              {
                label: "Category",
                name: "category",
                widget: "select",
                options: ["announcements", "tutorials", "updates"],
                required: false,
              },
              {
                label: "Featured",
                name: "featured",
                widget: "boolean",
                default: false,
                required: false,
              },
              {
                label: "OG Image",
                name: "og_image",
                widget: "image",
                required: false,
              },
              {
                label: "Related Licenses",
                name: "related_licenses",
                widget: "list",
                required: false,
              },
              {
                label: "Status",
                name: "status",
                widget: "select",
                options: ["draft", "published"],
                default: "draft",
              },
              { label: "Body", name: "body", widget: "markdown" },
            ],
          },
          {
            name: "template-blocks",
            label: "Template Blocks",
            folder: "content/template-blocks",
            create: true,
            fields: [
              { label: "Title", name: "title", widget: "string" },
              { label: "Block ID", name: "block_id", widget: "string" },
              {
                label: "Category",
                name: "category",
                widget: "select",
                options: [
                  "warranty",
                  "permission",
                  "condition",
                  "disclaimer",
                  "notice",
                ],
              },
              {
                label: "Description",
                name: "description",
                widget: "text",
                required: false,
              },
              { label: "Version", name: "version", widget: "string" },
              {
                label: "Block Title",
                name: "block_title",
                widget: "string",
                required: false,
              },
              { label: "Body", name: "body", widget: "markdown" },
            ],
          },
        ],
      },
      publish_mode: "editorial_workflow",
      local_backend: true,
      app_title: "Plain License CMS",
      site_url: "https://plainlicense.org",
      logout_redirect_url: "https://plainlicense.org",
      custom_logo: {
        src: `${__dirname}/src/assets/images/logo_only_color_transp.svg`,
        alt: "Plain License Logo",
        show_in_header: true,
      },
      media_folder: "images/",
      media_libraries: {
        cloudflare_r2: {
          access_key_id: "2af46c19f417f0b062f540805412da84",
          bucket: "plainlicense-cms",
          account_id: "1bb2d128ac96f8ee9dc75e99a54e9260",
          prefix: "uploads/",
          public_url: "https://media.plainlicense.org/",
        },
      },
      editor: {
        preview: true,
      },
      issue_reports: {
        url: "https://github.com/plainlicense/plainlicense/issues",
      },
    }),
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
      },
      customCss: ["./src/assets/stylesheets/custom.css"],
      expressiveCode: {
        themes: ["ayu-dark", "github-light-high-contrast"],
        useStarlightDarkModeSwitch: true,
      },
      sidebar: [
        {
          label: "Licenses",
          link: "/licenses/permissive/mit",
        },
        {
          label: "About",
          link: "/about",
        },
      ],
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
        }),
        starlightAutoDrafts(),
        starlightHeadingBadges(),
        starlightContextualMenu({
          actions: ["copy", "view", "claude", "chatgpt"],
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
          demote: ["/contributing*", "/changelog*", "/tags*"],
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
      description: "Creative licenses in plain language for everyone.",
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
    dark: "ayu-dark",
    light: "github-light-high-contrast",
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
      cssMinify: "lightningcss",
      minify: "esbuild",
      rolldownOptions: {
        treeshake: "smallest",
        optimization: {
          inlineConst: { mode: "smart" },
        },
        experimental: {
          chunkOptimization: true,
          nativeMagicString: true,
        },
        output: {
          codeSplitting: true,
          comments: false,
          minify: true,
          minifyInternalExports: true,
          sanitizeFileName: true,
          sourcemap: false,
        },
      },
      css: {
        minify: true,
      },
      server: {
        fs: {
          allow: [rootDir],
        },
      },
    },
  },
});
