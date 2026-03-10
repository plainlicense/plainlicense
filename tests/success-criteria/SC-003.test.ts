import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * SC-003: Download reliability.
 * Verification: 100% success rate for local file access of generated exports.
 * (Network simulation is better suited for E2E, here we verify file integrity).
 */
describe('SC-003: Download Integrity', () => {
  it('all export files are readable and have non-zero size', async () => {
    const exportBaseDir = path.resolve('public/exports');
    const licenseDirs = await fs.readdir(exportBaseDir);
    
    let totalFilesChecked = 0;

    for (const licenseSlug of licenseDirs) {
      const licensePath = path.join(exportBaseDir, licenseSlug);
      if (!(await fs.stat(licensePath)).isDirectory()) continue;

      const versions = await fs.readdir(licensePath);
      for (const version of versions) {
        const versionPath = path.join(licensePath, version);
        if (!(await fs.stat(versionPath)).isDirectory()) continue;

        const files = await fs.readdir(versionPath);
        for (const file of files) {
          const filePath = path.join(versionPath, file);
          const stats = await fs.stat(filePath);
          
          expect(stats.size).toBeGreaterThan(0);
          
          // Verify we can read the first byte
          const fd = await fs.open(filePath, 'r');
          const { bytesRead } = await fd.read(Buffer.alloc(1), 0, 1, 0);
          await fd.close();
          
          expect(bytesRead).toBe(1);
          totalFilesChecked++;
        }
      }
    }
    
    console.log(`Checked ${totalFilesChecked} export files for integrity.`);
    expect(totalFilesChecked).toBeGreaterThan(0);
  });
});
