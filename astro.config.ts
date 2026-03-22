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
import exportsIntegration from "./src/integrations/exports.js";

const rootDir = searchForWorkspaceRoot(process.cwd());
if (!rootDir) {
  throw new Error(
    "Could not find workspace root. Ensure that this project is within a valid workspace with a package.json file.",
  );
}
const __dirname = dirname(fileURLToPath(import.meta.url));

type LicenseCategory =
  | "public-domain"
  | "permissive"
  | "copyleft"
  | "source-available"
  | "proprietary";

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
              // title defaults to the plain name
              {
                label: "Title",
                name: "title",
                widget: "string",
                required: false,
              },
              {
                label: "Plain language name (e.g. 'Plain MIT License')",
                name: "plain_name",
                widget: "string",
                pattern: "^Plain [A-Z][A-Za-z0-9 -.]+",
                required: true,
              },
              {
                label: "SPDX ID",
                name: "spdx_id",
                comment:
                  "The SPDX ID of *the plain license* if it has one (currently none do), not the original license. The original license's SPDX ID, if applicable, goes in the 'original' field.",
                widget: "string",
                required: false,
              },
              {
                label: "Version of this plain language version",
                name: "plain_version",
                widget: "computed",
                default: "0.1.0",
                hint: "Semver, e.g. 1.0.0",
                required: true,
                readonly: true,
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
                multiple: false,
                comment:
                  "Family of the license. If it has no requirements at all, it's probably public domain. If it has minimal requirements, like just attribution, it's probably permissive. If it doesn't allow changes, relicensing, or sharing it's proprietary. If it allows some changes and sharing but has restrictions on how you can use it, like commercially, it's source-available (sources available but not open source). If it allows changes, sharing, and commercial use but requires you share alike, it's copyleft.",
                required: true,
              },
              {
                label: "Is this a public domain dedication (not a license)?",
                name: "is_dedication",
                widget: "compute",
                // @ts-expect-error
                value: "{{fields.license_family}}" === "public-domain",

                default: false,
                // we can infer from license family
                required: false,
              },
              {
                label: "Status",
                name: "status",
                widget: "select",
                options: ["draft", "published"],
                default: "draft",
                required: true,
              },
              {
                label:
                  "Description (1–3 sentences, answers 'what kind of license is this?')",
                name: "description",
                widget: "text",
                required: false,
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
                default: true,
                required: false,
              },
              {
                label:
                  "Additional how-to instructions (leave blank for most licenses)",
                name: "extra_how",
                widget: "richtext",
                required: false,
              },
              // Claude mapping fields
              {
                label: "Has a clause map?",
                name: "has_mapping",
                widget: "boolean",
                default: false,
                required: false,
              },
              {
                label: "Clause map version",
                name: "mapping_version",
                widget: "string",
                hint: "Semver. Required if has_mapping is true.",
                pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
                default: "0.1.0",
                required: false,
              },
              // Display controls
              {
                label: "Show original comparison?",
                name: "show_original_comparison",
                widget: "boolean",
                default: true,
                required: false,
              },
              {
                label: "Show shame counter?",
                name: "show_shame_counter",
                widget: "boolean",
                default: true,
                required: false,
              },
              {
                label: "Featured?",
                name: "featured",
                widget: "boolean",
                default: false,
                required: false,
              },
              {
                label: "Fair Code license?",
                name: "fair_code",
                widget: "boolean",
                default: false,
                required: false,
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
                collection: "authors",
                multiple: true,
                display_fields: ["{{authors.*.name}}"],
                search_fields: ["{{authors.*.name}}"],
                value_field: "{{authors.*.uuid}}",
                required: false,
              },
              {
                label: "Changelog",
                name: "changelog",
                widget: "richtext",
                required: false,
              },
              {
                label: "UUID",
                name: "uuid",
                widget: "uuid",
                hide: true,
                readonly: true,
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
                    label: "Alternative names (e.g. 'Expat License')",
                    name: "alternative_names",
                    widget: "list",
                    field: { widget: "string" },
                    required: false,
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
                  { label: "Body", name: "body", widget: "richtext" },
                ],
              },
            ],
          },
          {
            name: "authors",
            label: "Authors",
            folder: "content/authors",
            create: true,
            extension: "md",
            fields: [
              { label: "Name", name: "name", widget: "string" },
              { label: "URL", name: "url", widget: "string", required: false },
              {
                label: "Avatar",
                name: "avatar",
                widget: "image",
                required: false,
              },
              {
                label: "Title",
                name: "title",
                widget: "string",
                required: false,
              },
              {
                label: "About/Bio",
                name: "about",
                widget: "text",
                required: false,
              },
              {
                label: "Email",
                name: "email",
                widget: "string",
                required: false,
              },
              {
                label: "UUID",
                name: "uuid",
                widget: "uuid",
                hide: true,
                readonly: true,
                prefix: "author-",
              },
              {
                label: "Social links",
                name: "social_links",
                widget: "object",
                required: false,
                fields: [
                  {
                    label: "GitHub",
                    name: "github",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "X/Twitter",
                    name: "twitter",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "LinkedIn",
                    name: "linkedin",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "Bluesky",
                    name: "bluesky",
                    widget: "string",
                    required: false,
                  },
                ],
              },
              {
                name: "blog-posts",
                label: "Blog",
                folder: "content/blog/posts",
                create: true,
                format: "yaml-frontmatter",
                extension: "mdx",
                preview_path: "",
                thumbnail: "og_image",
                fields: [
                  { label: "Title", name: "title", widget: "string" },
                  {
                    label: "Creation Date",
                    name: "creation_date",
                    widget: "datetime",
                  },
                  {
                    label: "Publication Date",
                    name: "publication_date",
                    widget: "datetime",
                    required: false,
                  },
                  {
                    label: "Last Updated",
                    name: "last_updated",
                    widget: "datetime",
                  },
                  {
                    label: "Authors",
                    name: "authors",
                    widget: "list",
                    collection: "authors",
                    multiple: true,
                    display_fields: ["{{authors.*.name}}"],
                    search_fields: ["{{authors.*.name}}"],
                    value_field: "{{authors.*.uuid}}",
                    required: false,
                  },
                  {
                    label: "Description",
                    name: "description",
                    widget: "text",
                    hint: "1-3 sentences, answers 'what's this post about?'. Markdown supported.",
                    required: false,
                  },
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
                    options: [
                      "announcements",
                      "guides",
                      "updates",
                      "community",
                      "license-talk",
                    ],
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
                    widget: "relation",
                    collection: "licenses",
                    search_fields: [
                      "title",
                      "plain_name",
                      "spdx_id",
                      "original.name",
                    ],
                    value_field: "uuid",
                    required: false,
                  },
                  {
                    label: "Status",
                    name: "status",
                    widget: "select",
                    options: ["draft", "published"],
                    default: "draft",
                  },
                  {
                    label: "UUID",
                    name: "uuid",
                    widget: "uuid",
                    hide: true,
                    readonly: true,
                  },
                  {
                    label: "Series",
                    name: "series",
                    widget: "object",
                    required: false,
                    fields: [
                      {
                        label:
                          "Name of the series (e.g. 'MIT License Explained')",
                        name: "name",
                        widget: "string",
                      },
                      {
                        label: "Description of the series",
                        name: "description",
                        widget: "text",
                      },
                      {
                        label: "Slug",
                        name: "slug",
                        hide: true,
                        widget: "string",
                        hint: "Used in URLs for series overview pages. Should be lowercase with hyphens, e.g. 'mit-license-explained'.",
                      },
                      {
                        label: "Index",
                        hint: "Index of this post within the series, starting at 1. Used to order posts in the series.",
                        name: "index",
                        widget: "number",
                        value_type: "int",
                        readonly: true,
                        hide: true,
                      },
                      {
                        label: "UUID",
                        name: "uuid",
                        widget: "uuid",
                        hide: true,
                        readonly: true,
                      },
                    ],
                  },
                  { label: "Body", name: "body", widget: "richtext" },
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
                  {
                    label: "Version",
                    name: "version",
                    widget: "string",
                    pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
                    required: true,
                  },
                  {
                    label: "Block Title",
                    name: "block_title",
                    widget: "string",
                    required: false,
                  },
                  {
                    label: "UUID",
                    name: "uuid",
                    widget: "uuid",
                    hide: true,
                    readonly: true,
                  },
                  { label: "Body", name: "body", widget: "richtext" },
                ],
              },
            ],
          },
        ],
        app_title: "Plain License CMS",
        site_url: "https://plainlicense.org",
        logout_redirect_url: "https://plainlicense.org",
        logo: {
          src: `${__dirname}/src/assets/images/logo_only_color_transp.svg`,
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
          rss: true,
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
      rollupOptions: {
        external: [],
        jsx: {
          factory: "h",
          fragment: "Fragment",
        },
        output: {
          dir: `${rootDir}/dist/_astro`,
          format: "es",
          entryFileNames: "[name]-[hash].js",
          chunkFileNames: "[name]-[hash].js",
          assetFileNames: "[name]-[hash][extname]",
          compact: true,
          interop: "esModule",
          minifyInternalExports: true,
          sourcemap: false,
        },
        treeshake: "smallest",
      },
    },
    server: {
      fs: {
        allow: [rootDir],
      },
    },
  },
});
