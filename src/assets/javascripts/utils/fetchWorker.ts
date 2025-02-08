import { logger } from "~/utils"

const cacheWorkerUrl = new URL("cacheWorker.ts", import.meta.url).href

// registers the service worker
if ("serviceWorker" in navigator && window.isSecureContext) {
  logger.info("Registering service worker")
  const register = async () => {
    navigator.serviceWorker
      .register(cacheWorkerUrl, { scope: "/" })
      .then((registration) => {
        if (registration.installing) {
          logger.info("Service worker installing")
        } else if (registration.waiting) {
          logger.info("Service worker installed")
        } else if (registration.active) {
          logger.info("Service worker active")
        }
      })
      .catch((error) => {
        logger.error("Service worker registration failed:", error)
      })
  }
  Promise.resolve(register())
}
