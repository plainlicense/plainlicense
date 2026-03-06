import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * SC-015: Concurrent Editing.
 * Verification: CMS is configured with a Git-based backend which provides
 * natural conflict resolution and versioning.
 */
describe('SC-015: CMS Conflict Prevention', () => {
  it('CMS configuration uses a Git-based backend', async () => {
    const configPath = path.resolve('public/admin/config.yml');
    const content = await fs.readFile(configPath, 'utf8');
    const config = yaml.load(content) as any;
    
    // Verify backend is GitHub (Git-based)
    expect(config.backend.name).toBe('github');
    expect(config.backend.repo).toBeDefined();
    
    // Check if publishing mode is set to "editorial_workflow" 
    // (This enables draft/review/publish cycles which prevent direct overwrites)
    expect(config.publish_mode).toBe('editorial_workflow');
  });
});
