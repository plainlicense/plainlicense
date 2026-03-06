import type { AstroIntegration } from 'astro';
import { getCollection } from 'astro:content';
import { ExportOrchestrator } from './exports/index.ts';
import path from 'node:path';

/**
 * Astro integration for license export generation.
 * Runs during the build process to generate markdown, PDF, etc.
 */
export function exportGenerator(): AstroIntegration {
  return {
    name: 'license-export-generator',
    hooks: {
      'astro:build:start': async () => {
        // We need to run this outside of Astro's main build for now
        // because we can't easily access collections here in older versions.
        // In Astro 5.x, we can use getCollection if we are in a SSR/Server context.
        console.log('Starting export generation...');
      },
      'astro:build:done': async ({ dir }) => {
        console.log('Build done, generating exports...');
        // In a real implementation, we would fetch collections and generate
        // However, we'll use a separate script for now to avoid complexity
        // with the Astro build context.
      }
    }
  };
}
