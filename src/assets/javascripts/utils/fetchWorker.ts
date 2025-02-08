import { logger } from "~/utils"
import cacheWorkerUrl from "~worker/cache_worker.ts?worker"

// registers the service worker
if ("serviceWorker" in navigator && window.isSecureContext && cacheWorker) {
  logger.info("Registering service worker")
  navigator.serviceWorker.register(cacheWorker, { scope: "/" }).then((registration) => {
    if (registration.installing) {
      logger.info("Service worker installing")
    } else if (registration.waiting) {
      logger.info("Service worker installed")
    } else if (registration.active) {
      logger.info("Service worker active")
    }
  })
}
