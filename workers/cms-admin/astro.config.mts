/// <reference types="astro/client" />
import cloudflare from "@astrojs/cloudflare";
import astroCloudflarePagesHeaders from "astro-cloudflare-pages-headers";
import sveltia from "astro-loader-sveltia-cms";
import { defineConfig } from "astro/config";
import { cmsConfig } from "~cfg";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    configPath: "./wrangler.jsonc",
  }),
  integrations: [sveltia(cmsConfig), astroCloudflarePagesHeaders()],
  vite: {
    server: {
      headers: {
        "*": {
          // @ts-expect-error
          "content-security-policy":
            "Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://*.plainlicense.org https://plainlicense.org; img-src 'self' https://media.plainlicense.org https://plainlicense.org blob: data: https://*.githubusercontent.com https://picsum.photos https://fastly.picsum.photos https://*.plainlicense.org https://plainlicense.org; media-src 'self' https://*.plainlicense.org https://plainlicense.org blob:; frame-src 'self' https://*.plainlicense.org https://plainlicense.org blob:; script-src 'self' https://unpkg.com; connect-src 'self' https://*.plainlicense.org https://plainlicense.org https://1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com blob: data: https://unpkg.com https://api.github.com https://www.githubstatus.com https://picsum.photos https://generativelanguage.googleapis.com https://api.anthropic.com https://api.cloudflare.com https://*.plainlicense.org https://plainlicense.org https://1bb2d128ac96f8ee9dc75e99a54e9260.r2.cloudflarestorage.com; frame-ancestors 'none'",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "permissions-policy":
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
        },
      },
    },
  },
});
