/**
 * @module fetchWorker
 * @description Fetches and registers a service worker for caching assets.
 *
 * @overview
 * Registers the cache worker.
 */
import { logger } from '~/utils/log'

async function locateMissingWorker() {
  const {origin} = window.location;
  const metaFile = new URL('manifest.json', origin);
  const response = await fetch(metaFile);
  if (response.ok) {
    const meta = await response.json();
    const cacheWorker = meta.find(
      ([key, _value]: [string, { file: string; integrity: string }]) =>
        key.match(/^docs\/cacheWorker.js$/)
    );
    if (cacheWorker) {
      logger.debug('Cache worker found in meta data');
      return cacheWorker[0].file;
    }
    logger.error('Cache worker not found in meta data');
    return;
  }
  logger.error('Failed to fetch build meta data to locate worker');
}

const cacheWorkerUrl = 'cacheWorker.js';

// registers the service worker
if ('serviceWorker' in navigator && window.isSecureContext) {
  logger.debug('Registering service worker');
  const register = async () => {
    await navigator.serviceWorker
      .register(cacheWorkerUrl, { scope: '/' })
      .catch(async (error) => {
        if (error.message.includes('404')) {
          const workerUrl = await locateMissingWorker();
          if (workerUrl) {
            navigator.serviceWorker.register(workerUrl, { scope: '/' });
          }
        }
      })
      .then((registration) => {
        if (registration?.installing) {
          logger.debug('Service worker installing');
        } else if (registration?.waiting) {
          logger.debug('Service worker installed');
        } else if (registration?.active) {
          logger.debug('Service worker active');
        }
      })
      .catch((error) => {
        logger.error('Service worker registration failed:', error);
      });
  };
  (async () => {
    try {
      await register();
    } catch (error) {
      logger.error('Error during service worker registration:', error);
    }
  })().catch((error) => {
    logger.error('Unhandled error during service worker registration:', error);
  });
}
