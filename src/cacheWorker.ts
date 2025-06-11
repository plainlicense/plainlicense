declare const self: ServiceWorkerGlobalScope;

import woff2Bangers from './assets/fonts/bangers-regular.woff2';
import woff2Inter from './assets/fonts/inter-v.woff2';
import woff2Raleway from './assets/fonts/raleway.woff2';
import woff2SourceCodePro from './assets/fonts/sourcecodepro-regular.woff2';
import svgNamedLogo from './assets/images/logo_named.svg';
import svgLogo from './assets/images/logo_only_color_transp.svg';

// Configuration types
interface CacheConfig {
  cacheName: string;
  preCacheUrls: string[];
  version: number;
}

interface Manifest {
  [oldPath: string]: {
    file: string; // new path
    integrity: string; // integrity hash (sha384)
  };
}

type RequestLike = string | URL | Request;
type CachePreCacheUrls = { preCacheUrls: string[] };

interface Payload {
  type: 'CACHE_CONFIG' | 'CACHE_URLS';
  payload: CacheConfig | CachePreCacheUrls;
}

const CONFIG: CacheConfig = {
  cacheName: 'plain-license-v1',
  preCacheUrls: [woff2Inter, woff2Bangers, woff2SourceCodePro, woff2Raleway, svgNamedLogo, svgLogo],
  version: Date.now(),
};

const preCacheExts = ['js', 'css', 'html', 'json', 'svg', 'woff', 'woff2'];

/**
 * Check if we're in development mode
 * @returns boolean
 */
const isDev = (): boolean => {
  const { origin, hostname, port } = self.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    port === '8000' ||
    origin.includes('localhost')
  );
};

// simple logger utility; only logs in development
const logger = {
  error: (message: string, error?: Error) => {
    if (isDev()) {
      if (error instanceof CacheError) {
        console.error(`%c[ServiceWorker] Cache Error: ${message}`, 'color: aquamarine');
        console.error(error.toString());
      } else if (error instanceof NetworkError) {
        console.error(`%c[ServiceWorker] Network Error: ${message}`, 'color: aquamarine');
        console.error(`Status: ${error.status || 'unknown'}`);
        console.error(error.message);
      } else if (error) {
        console.error(`%c[ServiceWorker] ${message}`, 'color: aquamarine');
        console.error(error);
      }
    }
  },
  info: (message: string) => {
    if (isDev()) {
      console.info(`%c[ServiceWorker] ${message}`, 'color: cyan');
    }
  },
};

/** ======================
 *    Custom Errors
 *========================**/
// represents Cache errors
class CacheError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'CacheError';
    this.cause = cause;
    // Set the cause on the error object for error chaining
    if (cause && 'cause' in Error) {
      Object.defineProperty(this, 'cause', {
        value: cause,
        configurable: true,
        writable: true,
      });
    }
  }

  override toString(): string {
    return this.cause ? `${this.message}\nCaused by: ${this.cause.toString()}` : this.message;
  }
}

// represents network errors
class NetworkError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    // Include the status in the error message if available
    if (status) {
      this.message = `${message} (HTTP ${status})`;
    }
  }
}

// Load the manifest file
async function loadManifest(
  url: URL,
): Promise<Record<string, { file: string; integrity: string }> | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new NetworkError('Failed to fetch the manifest', response.status);
    }
    return await response.json();
  } catch (error) {
    logger.error('Error loading manifest:', error as Error);
    return undefined;
  }
}

const MANIFEST: Manifest = {};
(async () => {
  try {
    const data = await loadManifest(new URL('manifest.json', self.location.origin));
    if (!data) {
      throw new CacheError('Failed to load manifest file');
    }
    const editedKeys = Object.keys(data).map((key) => key.replace('docs/', ''));
    Object.assign(
      MANIFEST,
      Object.fromEntries(editedKeys.map((key) => [key, data[`docs/${key}`]])),
    );
  } catch (error) {
    logger.error('Failed to initialize manifest:', error as Error);
  }
})().catch((error) => {
  logger.error('Unhandled error in manifest initialization:', error as Error);
});

const normalizeUrl = (url: RequestLike): URL => {
  return url instanceof URL ? url : url instanceof Request ? new URL(url.url) : new URL(url);
};

const normalizeRequest = (url: RequestLike): Request => {
  return url instanceof Request ? url : new Request(url);
};

const hasCryptoHash = (url: URL | string): boolean => {
  const u = url instanceof URL ? url.pathname : url;
  const name = u.split('/').pop();
  return name?.split('.').length === 3;
};

const getCryptoHashlessBaseName = (url: URL | string) => {
  const u = url instanceof URL ? url.pathname : url;
  if (!hasCryptoHash(u)) {
    return u.split('/').pop();
  }
  const parts = u.split('/').pop()?.split('.');
  const hashlessName = [parts?.slice(0), parts?.slice(-1)].filter(Boolean);
  if (hashlessName && hashlessName.length === 2) {
    return hashlessName.join('.');
  }
  return '';
};

const isHTML = (url: RequestLike): boolean => {
  const u = normalizeUrl(url);
  return u.pathname.endsWith('.html');
};

/**
 * Cache manager for managing cache operations
 *
 * @method init - Initialize cache configuration
 * @method cleanup - Cleanup old caches
 * @method precache - Precache all the preCacheUrls in the cache configuration
 */
class CacheManager {
  private config: CacheConfig = CONFIG;
  private cache: Cache | null = null;
  public cacheKeys: string[] = [];

  constructor() {
    this.init().catch((error) => {
      logger.error('Failed to initialize cache manager:', error as Error);
    });
  }

  // gets the cache configuration
  async init(): Promise<void> {
    this.config = CONFIG;
    this.cache = await caches.open(this.config.cacheName);
    this.cacheKeys = await this.getCacheKeys();
    this.validateConfig();
  }

  public async getCache(): Promise<Cache> {
    if (!(this.cache && this.cache instanceof Cache)) {
      this.cache = await caches.open(this.config.cacheName);
    }
    return this.cache;
  }

  public async updateKeys(): Promise<string[]> {
    const newKeys = await caches.keys();
    if (newKeys.length && newKeys.some((key) => !this.cacheKeys.includes(key))) {
      this.cacheKeys = newKeys;
      logger.info(`Cache keys updated, keys: ${this.cacheKeys.join(', ')}`);
    }
    return this.cacheKeys;
  }

  public async getCacheKeys(): Promise<string[]> {
    if (!this.cacheKeys?.length) {
      await this.updateKeys();
    }
    return this.cacheKeys;
  }

  public async cacheIt(request: RequestLike | RequestLike[], response?: Response): Promise<void> {
    if (Array.isArray(request)) {
      const promises = request.map((req) => this.cacheIt(req, response));
      await Promise.all(promises);
      return;
    }
    const normalizedRequest = normalizeRequest(request);
    const keys = await this.getCacheKeys();
    if (keys.includes(normalizedRequest.toString())) {
      logger.info('Resource already cached');
      return;
    }
    const cache = await this.getCache();
    if (response?.ok) {
      await cache.put(normalizedRequest, response.clone());
      this.cacheKeys.push(normalizedRequest.toString());
      logger.info('cache complete');
      return;
    }
    try {
      if (await cache.match(normalizedRequest)) {
        return;
      }
      await cache.add(normalizedRequest);
      this.cacheKeys.push(normalizedRequest.toString());
      logger.info('cache complete');
    } catch (error) {
      throw new CacheError('Failed to cache url', error as Error);
    } finally {
      await this.checkForStaleKey(normalizedRequest);
    }
  }

  /**
   * Validate the cache configuration
   */
  private validateConfig(): void {
    if (!(this.config?.cacheName.length && this.config.cacheName.trim())) {
      throw new CacheError('Cache name is required');
    }
    if (!this.config.preCacheUrls?.length) {
      throw new CacheError(
        'At least one url is required. Our poor cache worker has nothing to do.',
      );
    }
    logger.info('Cache configuration validated');
  }

  private toBaseName(s: RequestLike): string {
    try {
      const url = normalizeUrl(s);
      const file = url.pathname.split('/')?.pop();
      const parts = file?.split('.');
      if (!parts) {
        logger.error('Failed to get base name: No parts found');
        return '';
      }
      return parts.length >= 2 ? parts.slice(0, -2).join('.') : parts[0] || '';
    } catch (error) {
      logger.error('Failed to get base name:', error as Error);
      return '';
    }
  }

  /**
   * Checks for and deletes stale cache keys.
   * @param url The URL/string/Request to check for stale keys against.
   */
  private async checkForStaleKey(url: RequestLike): Promise<void> {
    try {
      const normalizedUrl = normalizeUrl(url);
      const cache = await this.getCache();
      const baseName = await this.toBaseName(normalizedUrl);
      const staleKeys = this.cacheKeys.filter(
        (key) => key.includes(baseName) && normalizedUrl.toString() !== key,
      );
      if (staleKeys.length) {
        logger.info(`Stale keys found: ${staleKeys.join(', ')}`);
        await Promise.all(staleKeys.map((key) => cache.delete(key)));
        logger.info('Stale keys deleted');
      }
    } catch (error) {
      logger.error('Failed to check for stale keys:', error as Error);
    }
  }
  /**
   * Cleanup old caches
   */
  async cleanup(): Promise<void> {
    try {
      const deletionPromises = await this.getCacheKeys().then((keys) =>
        keys.filter((key) => key !== this.config.cacheName).map((key) => caches.delete(key)),
      );

      await Promise.all(deletionPromises);
      logger.info('Old caches cleaned up');
    } catch (error) {
      throw new CacheError('Failed to cleanup caches', error as Error);
    }
  }

  /**
   * Precache all the preCacheUrls in the cache configuration
   */
  async precache(): Promise<void> {
    await this.cacheIt(this.config.preCacheUrls);
    // Handle manifest entries
    const manifestKeys = Object.keys(MANIFEST);
    const manifestPromises = manifestKeys.map(async (key) => {
      const manifestEntry = MANIFEST[key];
      if (!manifestEntry) {
        return;
      }
      if (this.config.preCacheUrls.includes(manifestEntry.file)) {
        return;
      }
      if (preCacheExts.some((ext) => key.endsWith(ext))) {
        const url = new URL(manifestEntry.file);
        await this.cacheIt(url);
      }
    });

    await Promise.all(manifestPromises);
    logger.info('Precaching complete');
  }

  /**
   * Attempt to fetch a resource
   * @param request Request | string | URL - request to fetch
   * @param init RequestInit - request options
   * @returns Promise<Response> - response
   */
  private async tryFetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    try {
      const normalized = normalizeUrl(request);
      const isHTMLRequest = isHTML(normalized);
      const response = await fetch(request, init);
      if (!response.ok) {
        throw new NetworkError('Network response was not ok', response.status);
      }
      if (isHTMLRequest) {
        const name = normalized.pathname.split('/').pop();
        if (name === 'index.html' || name === '/') {
          response.headers.set('Permissions-Policy', 'autoplay=(self)');
        }
      }
      this.cacheKeys.push(request.toString());
      return response;
    } catch (error) {
      logger.error(`Failed to fetch request for ${request.toString()}`, error as Error);
      throw new NetworkError(`Failed to fetch request for ${request.toString()}`, 500);
    } finally {
      await this.checkForStaleKey(request);
    }
  }

  /**
   * Fallback fetch for failed fetches. Attempts to remove the hash from the url and fetch again. We're basically checking if the build process went wrong.
   * @param request Request | string | URL - request to fetch
   * @param init RequestInit - request options
   * @returns Promise<Response> - response
   */
  async fallbackFetch(request: Request | string | URL, init?: RequestInit): Promise<Response> {
    const normalizedRequest = normalizeRequest(request);
    const response = await fetch(normalizedRequest, init);
    if (response.ok) {
      return response;
    }
    const errorMessage = response instanceof Response ? await response.json() : 'No response';
    logger.error(
      `Failed to fetch request for ${normalizedRequest.toString()} `,
      new Error(errorMessage),
    );
    logger.error('Attempting fallback fetch');
    const url = new URL(normalizedRequest.toString());
    const name = getCryptoHashlessBaseName(url);

    if (MANIFEST && name) {
      const key = Object.keys(MANIFEST).find((key) => key.includes(name));
      if (key && MANIFEST[key]) {
        const newLocation = MANIFEST[key].file;
        return this.tryFetch(newLocation, init);
      }
    }
    if (url.hash?.length) {
      url.hash = '';
      return this.tryFetch(url, init);
    }
    return response;
  }
}

// Initialize cache manager
const cacheManager = new CacheManager();

/**
 * Cache strategies for fetching resources
 */
const cacheExts = [
  'avif',
  'css',
  'html',
  'jpeg',
  'jpg',
  'js',
  'json',
  'mp4',
  'png',
  'svg',
  'webm',
  'webp',
  'woff',
  'woff2',
];

const staleWhileRevalidateExts = ['html', 'json', 'css', 'js'];

async function routeToStrategy(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return await fetch(request);
  }
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    (url.origin === self.location.origin &&
      !url.href.includes('assets') &&
      (url.href.endsWith('.png') ||
        url.href.endsWith('.ico') ||
        url.href.endsWith('.jpg') ||
        url.href === self.location.href))
  ) {
    return await fetch(request);
  }
  // spellchecker:off
  const ext = url.pathname.split('.').pop();
  if (!(cacheExts.some((ext) => url.pathname.endsWith(ext)) && ext)) {
    return await fetch(request).catch((error) => {
      logger.error('Failed to fetch:', error as Error);
      throw new NetworkError('Failed to fetch request', 500);
    });
  }
  if (staleWhileRevalidateExts.includes(ext)) {
    return await staleWhileRevalidate(request);
  }
  return await cacheFirst(request);
  // spellchecker:on
}

/**
 * Cache first strategy
 * @param request Request
 * @returns Promise<Response>
 */
async function cacheFirst(request: Request): Promise<Response> {
  const normalizedRequest = normalizeRequest(request);
  const cache = await cacheManager.getCache();
  const cached = await cache.match(normalizedRequest);
  if (cached) {
    return cached;
  }

  try {
    const response = await cacheManager.fallbackFetch(normalizedRequest);
    if (!response.ok) {
      throw new NetworkError('Network response was not ok', response.status);
    }
    await cacheManager.cacheIt(normalizedRequest, response.clone());
    return response;
  } catch (error) {
    logger.error(`CatchFirst strategy failed for ${normalizedRequest.url}`, error as Error);
    throw error;
  }
}

/**
 * Stale while revalidate strategy
 * @param request Request
 * @returns Promise<Response>
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await cacheManager.getCache();
  const cached = await cache.match(request);

  // Create network promise without awaiting
  const networkPromise = cacheManager
    .fallbackFetch(request)
    .then(async (response) => {
      if (!response.ok) {
        throw new NetworkError('Network response was not ok', response.status);
      }
      // Cache the new response in background
      await cacheManager.cacheIt(request, response.clone());
      return response;
    })
    .catch((error) => {
      logger.error(
        `Network fetch in staleWhileRevalidate failed for ${request.url} `,
        error as Error,
      );
      throw error;
    });

  if (cached) {
    // Start revalidation in background
    networkPromise.catch((error) => {
      logger.error('Background revalidation failed:', error as Error);
    });
    logger.info('Returning cached response while revalidating');
    return cached;
  }

  logger.info('No cached response, waiting for network');
  return networkPromise;
}

/**
 * Fetch event listener for handling requests
 */
self.addEventListener('install', (event: ExtendableEvent): void => {
  event.waitUntil(
    (async () => {
      try {
        await cacheManager.precache(); // Add precaching during install
        await self.skipWaiting();
        logger.info('Service worker installed');
      } catch (error) {
        logger.error('Install failed:', error as Error);
        throw error;
      }
    })(),
  );
});

/**
 * Fetch event listener for handling requests
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    (async () => {
      try {
        return await routeToStrategy(event.request);
      } catch (error) {
        logger.error(`Failed to fetch request for ${event.request.url}`, error as Error);
        throw error;
      }
    })(),
  );
});

/**
 * Activate event listener for service worker activation
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      try {
        await cacheManager.cleanup();
        await self.clients.claim();
        logger.info('Service worker activated');
      } catch (error) {
        logger.error('Activation failed:', error as Error);
        throw error;
      }
    })(),
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const payload = event.data as Payload;
  if (payload.type === 'CACHE_URLS' && payload.payload && payload.payload.preCacheUrls) {
    CONFIG.preCacheUrls.push(...payload.payload.preCacheUrls);
    event.waitUntil(
      (async () => {
        try {
          await cacheManager.precache();
        } catch (error) {
          logger.error('Precaching failed:', error as Error);
        }
      })(),
    );
  } else {
    logger.info('Received unsupported message type or missing payload');
    return;
  }
});
