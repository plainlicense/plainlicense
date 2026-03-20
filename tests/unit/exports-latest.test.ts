import { describe, it, expect } from 'vitest';

// Test the latest alias file naming logic
describe('Latest alias generation', () => {
  it('strips semver from filename', () => {
    const versionedName = 'Plain-MIT-0.2.5.gfm.md';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-MIT.gfm.md');
  });

  it('handles embed suffix correctly', () => {
    const versionedName = 'Plain-MIT-0.2.5-embed.html';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-MIT-embed.html');
  });

  it('handles PDF correctly', () => {
    const versionedName = 'Plain-Elastic-0.1.0.pdf';
    const latestName = versionedName.replace(/-\d+\.\d+\.\d+/, '');
    expect(latestName).toBe('Plain-Elastic.pdf');
  });
});
