import { describe, it, expect } from 'vitest';

interface ManifestEntry {
  plainId: string;
  currentVersion: string;
  versions: string[];
  formats: string[];
}

describe('Export manifest structure', () => {
  it('has the expected shape', () => {
    const entry: ManifestEntry = {
      plainId: 'Plain-MIT',
      currentVersion: '0.2.5',
      versions: ['0.2.5', '0.2.1'],
      formats: ['gfm.md', 'cm.md', 'txt', 'pdf', 'xml', '-embed.html'],
    };

    expect(entry.plainId).toMatch(/^Plain-/);
    expect(entry.versions).toContain(entry.currentVersion);
    expect(entry.formats.length).toBeGreaterThan(0);
  });
});
