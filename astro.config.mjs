import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  } catch {
    return redirects;
  }
  for (const category of categories) {
    const catDir = join(contentBase, category);
    try {
      if (!statSync(catDir).isDirectory()) continue;
    } catch {
      continue;
    }
    let files;
    try {
      files = readdirSync(catDir);
    } catch {
      continue;
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
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    starlight({
      title: 'Plain License',
      description: 'Plain language versions of popular software licenses',
      logo: {
        src: './src/assets/images/logo_named.svg',
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
      sidebar: [
        {
          label: 'Licenses',
          link: '/licenses/permissive/mit',
        },
        {
          label: 'Blog',
          link: '/blog',
        },
        {
          label: 'About',
          link: '/about',
        },
      ],
    }),
    sitemap(),
    preact(),
    mdx(),
  ],
});
