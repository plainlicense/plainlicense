/// <reference types="astro/client" />
import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders, sessionDrivers } from "astro/config";
import astroCloudflarePagesHeaders from "astro-cloudflare-pages-headers";
import sveltia from "astro-loader-sveltia-cms";
import { searchForWorkspaceRoot } from "vite";
import { cmsConfig } from "../../cmsconfig/";

const headers = {
  "content-security-policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://*.plainlicense.org https://plainlicense.org; img-src 'self' https://media.plainlicense.org https://plainlicense.org blob: data: https://*.githubusercontent.com https://picsum.photos https://fastly.picsum.photos https://*.plainlicense.org https://plainlicense.org; media-src 'self' https://*.plainlicense.org https://plainlicense.org blob:; frame-src 'self' https://*.plainlicense.org https://plainlicense.org https://challenges.cloudflare.com blob:; script-src 'self' https://unpkg.com https://ajax.cloudflare.com https://challenges.cloudflare.com; connect-src 'self' https://*.plainlicense.org https://plainlicense.org https://1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com blob: data: https://unpkg.com https://api.github.com https://www.githubstatus.com https://picsum.photos https://generativelanguage.googleapis.com https://api.anthropic.com https://api.cloudflare.com https://*.plainlicense.org https://plainlicense.org https://1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com; frame-ancestors 'self'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
};

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    configPath: "./wrangler.json",
    imageService: {
      build: "compile",
      runtime: "cloudflare-binding",
    },
    imagesBindingName: "IMAGES",
    sessionKVBindingName: "SESSION",
  }),

  base: "/",
  build: {
    assets: "_astro",
    inlineStylesheets: "auto",
  },
  compressHTML: true,
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
  output: "static",
  prefetch: {
    defaultStrategy: "viewport",
  },
  prerenderConflictBehavior: "warn",
  session: {
    driver: sessionDrivers.cloudflareKVBinding({
      binding: "SESSION",
    }),
  },
  site: "https://admin.plainlicense.org",
  image: {
    domains: [
      "avatars.githubusercontent.com",
      "docs.plainlicense.org",
      "generativelanguage.googleapis.com",
      "github.com",
      "1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com",
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
  trailingSlash: "always",
  server: {
    headers: headers,
  },
  integrations: [sveltia(cmsConfig), astroCloudflarePagesHeaders()],
  vite: {
    build: {
      cssCodeSplit: true,
      cssMinify: "esbuild",
      rollupOptions: {
        treeshake: "recommended",
      },
    },
    assetsInclude: ["*.webp", "*.avif", "*.jpg", "*.jpeg", "*.png", "*.svg"],
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
      headers: headers,
    },
  },
});
