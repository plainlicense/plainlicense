import { logger } from "~/utils"

const cacheWorkerUrl = "cacheWorker.ts"

// registers the service worker
if ("serviceWorker" in navigator && window.isSecureContext) {
  logger.debug("Registering service worker")
  const register = async () => {
    navigator.serviceWorker
      .register(cacheWorkerUrl, { scope: "/" })
      .then((registration) => {
        if (registration.installing) {
          logger.debug("Service worker installing")
        } else if (registration.waiting) {
          logger.debug("Service worker installed")
        } else if (registration.active) {
          logger.debug("Service worker active")
        }
      })
      .catch((error) => {
        logger.error("Service worker registration failed:", error)
      })
  }
  Promise.resolve(register())
}
