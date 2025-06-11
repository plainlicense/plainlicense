/** biome-ignore-all lint/correctness/noNodejsModules: the rule is for web */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const cacheFilePath = path.join(__dirname, '../../..', '.cache', 'file-hashes.json');

/**
 * Computes the MD5 hash of a file.
 * @param filePath - The path to the file.
 * @returns The MD5 hash of the file as a hexadecimal string.
 */
export function getFileHash(filePath: fs.PathOrFileDescriptor): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

/**
 * Loads the file hash cache from disk.
 * If the cache file exists, it attempts to parse and return its contents. If the file doesn't exist or is invalid, it returns an empty cache object.
 * @returns The loaded cache object, or an empty object if the cache file is missing or invalid.
 */
export function loadCache(): Record<string, string> {
  if (fs.existsSync(cacheFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    } catch (error) {
      console.warn("Cache file exists but couldn't be parsed. Creating new cache.");
      return {};
    }
  }
  // Ensure directory exists
  const cacheDir = path.dirname(cacheFilePath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return {};
}

/**
 * Saves the file hash cache to disk.
 * @param cache - The cache object to save.
 */
export function saveCache(cache: Record<string, string>): void {
  const cacheDir = path.dirname(cacheFilePath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));
}

export function copyIfChanged(source: string, destination: string): void {
  const cache = loadCache();
  const sourceHash = getFileHash(source);

  if (cache[source] !== sourceHash || !fs.existsSync(destination)) {
    fs.copyFileSync(source, destination);
    cache[source] = sourceHash;
    saveCache(cache);
  }
}

/**
 * Checks if a file should be copied based on its hash in the cache.
 * Compares the current file hash with the cached hash and returns true if they are different or if the file is not in the cache.
 * @param filePath - The path to the file to check.
 * @returns True if the file should be copied, false otherwise.
 */
export function shouldCopyFile(filePath: string): boolean {
  const cache = loadCache();
  const currentHash = getFileHash(filePath);

  console.log(`Current Hash: ${currentHash}, Cached Hash: ${cache[filePath]}`);
  console.log(`Should copy file: ${filePath}, ${cache[filePath] !== currentHash}`);
  if (!cache[filePath]) {
    return true;
  }
  return cache[filePath] !== currentHash;
}
