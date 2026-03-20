import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportOrchestrator, type ExportContext } from '../../src/build/exports/index.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from '../../src/utils/hash.ts';

describe('ExportOrchestrator Integration', () => {
  const testOutputDir = path.resolve('tests/tmp/exports/mit/v0.2.1');
  const manifestPath = path.resolve('tests/tmp/exports/build-manifest.json');

  const mockCtx: ExportContext = {
    licenseId: 'mit',
    version: '0.2.1',
    content: '# MIT License\n\nCopyright {{ year }} [holders]',
    metadata: { slug: 'mit', title: 'MIT License' },
    outputDir: testOutputDir,
  };

  beforeEach(async () => {
    await fs.mkdir(path.dirname(testOutputDir), { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await fs.rm(path.resolve('tests/tmp'), { recursive: true, force: true });
    } catch {}
  });

  it('generates all expected export formats', { timeout: 15000 }, async () => {
    const orchestrator = new ExportOrchestrator();
    await orchestrator.generateAll(mockCtx);

    const files = await fs.readdir(testOutputDir);
    expect(files).toContain('mit.gfm.md');
    expect(files).toContain('mit.cm.md');
    expect(files).toContain('mit.txt');
    // Typst might not be installed in the environment — PDF is checked by SC-006.
    expect(files).toContain('mit.xml');
    expect(files).toContain('mit-embed.html');
  });

  it('creates and updates build manifest', { timeout: 15000 }, async () => {
    const orchestrator = new ExportOrchestrator();
    await orchestrator.generateAll(mockCtx);

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(manifest.mit).toBeDefined();
    expect(manifest.mit.version).toBe('0.2.1');
    expect(manifest.mit.hash).toBe(await sha256(mockCtx.content));
  });

  it('skips generation if content is unchanged', { timeout: 30000 }, async () => {
    const orchestrator = new ExportOrchestrator();

    // First run — generates and writes manifest
    await orchestrator.generateAll(mockCtx);

    // Second run — content is unchanged, should skip
    const consoleSpy = vi.spyOn(console, 'log');
    await orchestrator.generateAll(mockCtx);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping exports'));
  });
});
