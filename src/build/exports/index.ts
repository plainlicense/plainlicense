/**
 * Core export generation orchestrator.
 * Coordinates markdown, plaintext, PDF, SPDX XML, and embed HTML generation.
 */

import { generateMarkdown } from './markdown.ts';
import { generatePlaintext } from './plaintext.ts';
import { generatePDF } from './pdf.ts';
import { parseComponentPlaceholders } from '../../utils/component-parser.ts';
import { sha256 } from '../../utils/hash.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ExportContext {
  licenseId: string;
  version: string;
  content: string;
  metadata: any;
  outputDir: string;
}

export type ExportFormat = 'markdown' | 'plaintext' | 'pdf' | 'spdx' | 'embed';

export class ExportOrchestrator {
  private formats: ExportFormat[] = ['markdown', 'plaintext', 'pdf', 'spdx', 'embed'];
  private manifestPath: string = '';

  async generateAll(ctx: ExportContext) {
    const licenseId = ctx.licenseId.trim();
    const version = ctx.version.trim();
    const { content, outputDir } = ctx;
    
    // Manifest location
    const exportsIdx = outputDir.lastIndexOf('exports');
    if (exportsIdx !== -1) {
      this.manifestPath = path.join(outputDir.substring(0, exportsIdx + 7), 'build-manifest.json');
    } else {
      this.manifestPath = path.join(path.dirname(outputDir), 'build-manifest.json');
    }

    const contentHash = await sha256(content);

    if (await this.isUnchanged(licenseId, version, contentHash)) {
      console.log(`Skipping exports for ${licenseId}@${version} (unchanged)`);
      return;
    }

    console.log(`Generating exports for ${licenseId}@${version}...`);
    
    // Process reactive components for static formats
    const staticContent = this.processReactiveComponents(content);
    const staticCtx = { ...ctx, content: staticContent, licenseId, version };

    // In parallel for performance
    const results = await Promise.allSettled([
      generateMarkdown(staticCtx),
      generatePlaintext(staticCtx),
      generatePDF(staticCtx),
      this.generateSPDX(staticCtx),
      this.generateEmbed(staticCtx)
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`Some exports failed for ${licenseId}:`, failures);
    } else {
      await this.updateManifest(licenseId, version, contentHash);
    }
  }

  private async isUnchanged(id: string, version: string, hash: string): Promise<boolean> {
    try {
      const manifest = JSON.parse(await fs.readFile(this.manifestPath, 'utf8'));
      return manifest[id]?.version === version && manifest[id]?.hash === hash;
    } catch {
      return false;
    }
  }

  private async updateManifest(id: string, version: string, hash: string) {
    let manifest: any = {};
    try {
      manifest = JSON.parse(await fs.readFile(this.manifestPath, 'utf8'));
    } catch {}

    manifest[id] = { version, hash, lastBuilt: new Date().toISOString() };
    await fs.mkdir(path.dirname(this.manifestPath), { recursive: true });
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  private processReactiveComponents(content: string): string {
    const placeholders = parseComponentPlaceholders(content);
    let result = content;

    for (const p of placeholders) {
      let staticVersion = '';
      if (p.type === 'faq') {
        const items = p.props.items ? this.safeParseJSON(p.props.items) : [];
        if (Array.isArray(items) && items.length > 0) {
          staticVersion = '\n\n### FAQ\n\n' + items.map((i: any) => `**Q: ${i.question || i.q}**\n${i.answer || i.a}`).join('\n\n') + '\n';
        } else {
          // Try to get FAQ items from license ID or title if available
          staticVersion = '\n\n### FAQ\n(See interactive version on website for full details)\n';
        }
      } else if (p.type === 'table') {
        const title = p.props.title || 'Comparison Table';
        staticVersion = `\n\n### ${title}\n(Detailed comparison table available on the interactive website version)\n`;
      } else if (p.type === 'tree') {
        const title = p.props.title || 'Decision Tree';
        staticVersion = `\n\n### ${title}\n(Interactive decision tool available on the website)\n`;
      }
      result = result.replace(p.raw, staticVersion);
    }

    return result;
  }

  private safeParseJSON(str: string): any {
    try {
      // If it's already an object-like string, try to parse it
      if (str.startsWith('[') || str.startsWith('{')) {
        return JSON.parse(str.replace(/'/g, '"'));
      }
      return str;
    } catch {
      return str;
    }
  }

  private async generateSPDX(ctx: ExportContext) {
    const { licenseId, version, outputDir } = ctx;
    const fileName = `${licenseId}.xml`;
    const filePath = path.join(outputDir, fileName);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<spdx:License xmlns:spdx="http://spdx.org/rdf/terms#" spdxId="${licenseId}">
  <spdx:name>${licenseId} (Plain Language)</spdx:name>
  <spdx:version>${version}</spdx:version>
</spdx:License>`;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, xml);
    console.log(`Generated SPDX XML export: ${filePath}`);
  }

  private async generateEmbed(ctx: ExportContext) {
    const { licenseId, version, metadata, outputDir } = ctx;
    const fileName = `${licenseId}-embed.html`;
    const filePath = path.join(outputDir, fileName);

    const html = `<div class="pl-embed" data-license="${licenseId}" data-version="${version}">
  <a href="https://plainlicense.org/licenses/${metadata.slug}">${metadata.title}</a>
</div>`;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, html);
    console.log(`Generated Embed HTML export: ${filePath}`);
  }
}
