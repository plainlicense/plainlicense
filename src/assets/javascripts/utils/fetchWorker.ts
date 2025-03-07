import { logger } from "~/utils"

async function locateMissingWorker() {
  const origin = window.location.origin || import.meta.url.replace("docs", "")
  const metaFile = new URL("manifest.json", origin)
  const response = await fetch(metaFile)
  if (response.ok) {
    const meta = await response.json()
    const cacheWorker = meta.find(
      ([key, _value]: [string, { file: string; integrity: string }]) =>
        key.includes("cacheWorker") && !key.includes(".map"),
    )
    if (!cacheWorker) {
      logger.error("Cache worker not found in meta data")
      return
    } else {
      logger.debug("Cache worker found in meta data")
      return cacheWorker[0].file
    }
  } else {
    logger.error("Failed to fetch build meta data to locate worker")
  }
}

const cacheWorkerUrl = "cacheWorker.ts"

// registers the service worker
if ("serviceWorker" in navigator && window.isSecureContext) {
  logger.debug("Registering service worker")
  const register = async () => {
    navigator.serviceWorker
      .register(cacheWorkerUrl, { scope: "/" })
      .catch(async (error) => {
        if (error.message.includes("404")) {
          const workerUrl = await locateMissingWorker()
          if (workerUrl) {
            navigator.serviceWorker.register(workerUrl, { scope: "/" })
          }
        }
      })
      .then((registration) => {
        if (registration?.installing) {
          logger.debug("Service worker installing")
        } else if (registration?.waiting) {
          logger.debug("Service worker installed")
        } else if (registration?.active) {
          logger.debug("Service worker active")
        }
      })
      .catch((error) => {
        logger.error("Service worker registration failed:", error)
      })
  }
  Promise.resolve(register())
}
