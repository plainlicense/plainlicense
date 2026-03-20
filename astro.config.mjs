import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import favicons from 'astro-favicons';
import { defineConfig, fontProviders } from 'astro/config';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import starlightAutoDrafts from 'starlight-auto-drafts';
import starlightBlog from 'starlight-blog';
import starlightContextualMenu from 'starlight-contextual-menu';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightLLMsTxt from 'starlight-llms-txt';
import starlightTags from 'starlight-tags';
import { searchForWorkspaceRoot } from 'vite';
import exportsIntegration from './src/integrations/exports.ts';

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
  const contentBase = join(__dirname, 'content/licenses');
  let categories;
  try {
    categories = readdirSync(contentBase);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
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
      if (err && err.code === 'ENOENT') {
        // Category directory disappeared or is missing; skip it.
        continue;
      }
      throw err;
    }
    let files;
    try {
      files = readdirSync(catDir);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        // Category directory disappeared between checks; skip it.
        continue;
      }
      throw err;
    }
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const name = file.replace(/\.md$/, '');
      const canonical = `/licenses/${category}/${name}`;
      const shortWithPrefix = `/licenses/${name}`;
      const shortRoot = `/${name}`;
      if (shortWithPrefix in redirects || shortRoot in redirects) {
        throw new Error(
          `License name conflict: "${name}" appears in multiple categories. ` +
          `Each license name must be unique across all categories.`
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
  redirects: getLicenseRedirects(),
  site: 'https://plainlicense.org',
  base: '/',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'workerd',
    configPath: join(__dirname, 'wrangler.jsonc'),
    sessionKVBindingName: 'SESSION'
  }),
  compressHTML: true,
  fonts: [
    {
      name: 'Inter',
      provider: fontProviders.google,
      cssVariable: '--sl-font',
      fallbacks: ['Noto Sans', 'Open Sans', 'Lato', 'Helvetica Neue', 'Helvetica', 'system-ui', 'sans-serif'],
      weights: [500, 700],
      styles: ["normal", "italic", "bold"],
      formats: ['woff2', 'woff'],
      subsets: ['latin', 'latin-ext'],
      
    },
    {
      name: 'Source Code Pro',
      provider: fontProviders.google,
      cssVariable: '--sl-font-mono',
      fallbacks: ['Fira Code Mono', 'Inconsolata', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      weights: [500, 700],
      styles: ["normal", "italic", "bold"],
      formats: ['woff2', 'woff'],
      subsets: ['latin', 'latin-ext'],
    },
    {
      name: "Raleway",
      provider: fontProviders.google,
      cssVariable: "--font-raleway",
      fallbacks: ['Montserrat', 'Noto Sans', 'Open Sans', 'Lato', 'Helvetica Neue', 'Helvetica', 'system-ui', 'sans-serif'],
      weights: [500, 700],
      styles: ["normal", "bold"],
      formats: ['woff2', 'woff'],
      subsets: ['latin']
    }
  ],
  favicon: join(__dirname, 'assets/images/logo_only_color_transp.svg'),
  // Image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    responsiveStyles: true,
    layout: 'constrained',
    domains: [
      'github.com',
      'raw.githubusercontent.com',
      'docs.plainlicense.org',
      'plainlicense.org',
      'readscore.plainlicense.org',
      'plainr.plainlicense.org',
      'avatars.githubusercontent.com',
      'ui-avatars.com',
    ],
  },
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  markdown: {
    shikiConfig: { themes: {
      light: 'github-light-high-contrast',
      dark: 'ayu-dark'
    }},
  },
  vite: {
    server: {
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd())
        ],
      },
    },
    assetsInclude: [
      'src/*.webp',
      'src/*.png',
      'src/*.jpg',
      'src/*.jpeg',
      'src/*.svg',
      'src/*.avif',
    ],
    build: {
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      rollupOptions: {
        treeshake: "smallest",
      },
    },
    css: {
      lightningcss: {},
    }
  },
  prefetch: {
    defaultStrategy: "viewport",
  },
  experimental: {
    chromeDevtoolsWorkspace: true,
    clientPrerender: true,
    contentIntellisense: true,
    svgo: {
      plugins: [
        {
          name: 'preset-default',
    },
      ],
    },
  },
  integrations: [
    starlight({
      title: 'Plain License',
      description: 'Creative licenses in plain language for everyone.',
      logo: {
        src: './src/assets/images/logo_named.svg',
        alt: 'Plain License Logo',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/plainlicense/plainlicense' }
      ],
      components: {
        Header: './src/components/overrides/Header.astro',
        Footer: './src/components/overrides/Footer.astro',
        Sidebar: './src/components/overrides/Sidebar.astro',
      },
      customCss: [
        './src/assets/stylesheets/custom.css',
      ],
      expressiveCode: {
        themes: ["ayu-dark", "github-light-high-contrast"],
        useStarlightDarkModeSwitch: true,
      },
      sidebar: [
        {
          label: 'Licenses',
          link: '/licenses/permissive/mit',
        },
        {
          label: 'About',
          link: '/about',
        },
      ],
      plugins: [
        starlightBlog({
          authors: {
            adam: {
              name: 'Adam Poulemanos',
              url: 'https://github.com/bashandbone',
              picture: 'https://avatars.githubusercontent.com/u/89049923?v=4',
              title: 'Founder'
            },
          },
          metrics: {
            readingTime: true,
          },
        }),
        starlightAutoDrafts(),
        starlightHeadingBadges(),
        starlightContextualMenu({
          actions: ["copy", "view", "claude", "chatgpt"]
        }),
        starlightLLMsTxt({
          projectName: "Plain License",
          description: `Plain License is a community project that provides creative licenses in plain language for everyone. Our mission is to make it easy for creators and users to understand their rights and obligations under various licenses, without needing a law degree.
          
          We recraft popular creative licenses into easy-to-understand versions that capture the original intent. All Plain License licenses have fallback provisions to their original hard-to-understand counterparts, ensuring similar legal treatment while being more accessible. Our project is open source and community-driven, with contributions from volunteers around the world. We believe that clear, plain language licenses can empower creators and users alike, fostering a more inclusive and vibrant creative ecosystem.
          `,
          promote: ["/licenses/*/*/*", "/blog/**", "/index*", "/faq/*", "/helping/*", "/about/*"],
          demote: ["/contributing*", "/changelog*", "/tags*"],
          minify: {
            whitespace: true,
            note: true,
            details: true,
          },
        }),
        starlightTags({
          onInlineTagsNotFound: 'warn',
        }),
      ]
    }),
    sitemap({
      filter: (page) => { return !/\^\/(?!(cdn-cgi|admin)\/)/.test(page); },
      changefreq: 'weekly',
      lastmod: new Date(),
      namespaces: {
        image: false,
        video: false,
      },
    }),

    favicons({
      name: 'Plain License',
      short_name: 'PlainLicense',
      description: 'Creative licenses in plain language for everyone.',
      input: {
        favicons: [join(__dirname, 'src/assets/images/logo_only_color_transp.svg')],
      },
    }),
    preact(),
    mdx(),
    exportsIntegration(),
  ],
});
