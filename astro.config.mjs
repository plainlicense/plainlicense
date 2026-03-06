import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';

export default defineConfig({
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
