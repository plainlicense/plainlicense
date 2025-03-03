/**
 * @module utils/helpers
 * @description General purpose utility functions
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import { logger } from "./log"
import { ParsedURLPath, UrlAsObject } from "./types"

/**
 * Create a script tag with the given src, async and defer attributes
 * and appends it to the head
 * @param src the source of the script
 * @param async async attribute
 * @param defer defer attribute
 * @param ignoreDnt ignore do not track attribute
 */
export const createScript = (src: string, async = true, defer = true, ignoreDnt = false) => {
  const alreadyLoaded = document.querySelector(`script[src="${src}"]`)
  if (alreadyLoaded) {
    return
  }
  const script = document.createElement("script")
  script.type = "text/javascript"
  script.src = src
  script.async = async
  script.defer = defer
  if (ignoreDnt) {
    script.dataset["ignoreDnt"] = "true"
  }
  document.head.appendChild(script)
}

/**
 * Sets a CSS variable on the document element
 * @param name name of the variable (e.g. data-theme)
 * @param value value to set
 */
export function setCssVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

/**
 * Checks if the given URL is an anchor link target
 * @param url - the URL to check
 * @returns true if the URL is an anchor link target
 */
export function isAnchorLinkTarget(url: string | URL) {
  url = typeof url === "string" ? new URL(url, window.location.origin) : url
  return url.origin === window.location.origin && url.hash !== ""
}

/**
 * Parses a URL and returns a parsed object
 * Essentially combines URL and Node's path.parse as a convenience
 * @param path - the URL to parse
 * @returns the parsed URL object
 */
export function parsePath(path: string): ParsedURLPath {
  const parts = path.split("/")
  const base = parts.pop() || ""
  const dir = parts.join("/") || "/"
  const nameParts = base.split(".")
  const ext = nameParts.length > 1 ? nameParts.pop()! : ""
  const name = nameParts.join(".")
  const root = parts[0] === "" ? "/" : ""

  const basePath = { base, dir, ext, name, root }

  let urlObj: UrlAsObject | {} = {}
  try {
    const url = new URL(path, window.location.origin)
    urlObj = {
      hash: url.hash,
      host: url.host,
      hostname: url.hostname,
      href: url.href,
      origin: url.origin,
      password: url.password,
      pathname: url.pathname,
      port: url.port,
      protocol: url.protocol,
      search:
        url.search.length ?
          Object.fromEntries(new URLSearchParams(url.search).entries()) || ""
        : url.search || "",
      username: url.username,
    }
  } catch (error) {
    // Leave as null if URL construction fails
  }

  if (Object.keys(urlObj).length) {
    return {
      ...basePath,
      ...urlObj,
    }
  }

  return basePath
}

/**
 * Creates a circular replacer function for JSON.stringify to handle circular references.
 * Detects and replaces circular references in objects with the string "[Circular]".
 * @returns A replacer function for JSON.stringify.
 */
function getCircularReplacer() {
  const seen = new WeakSet()
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        try {
          return JSON.parse(JSON.stringify(value, null, 2))
        } catch (err) {
          return "[Circular]"
        }
      }
      seen.add(value)
    }
    return value
  }
}
const piSmasher = getCircularReplacer()
export const stringify = (obj: any) => JSON.stringify(obj, piSmasher, 2)

export function fixSvgDimensions(): void {
  const svgs = Array.from(document.getElementsByTagName("svg"))
  if (!svgs || svgs.length === 0) {
    return
  }
  const valueMap = svgs
    .map((svg: SVGElement, i: number) => {
      const width = svg.getAttribute("width")
      const height = svg.getAttribute("height")
      if (width || height) {
        const value = width && width !== "NaN" ? width : height
        return { index: i, value: value !== "NaN" && value !== "0" ? value : "24" }
      }
      return
    })
    .filter(Boolean)
  if (valueMap.length === 0) {
    return
  }
  requestAnimationFrame(() => {
    valueMap.forEach((item: any) => {
      const svg = svgs[item.index]
      svg.setAttribute("width", item.value)
      svg.setAttribute("height", item.value)
    })
  })
}

// A simple range function
// from https://stackoverflow.com/a/10050831 by Fuji
export function range(size: number, startAt: number = 0): ReadonlyArray<number> {
  return [...Array(size).keys()].map((i) => i + startAt)
}

/**
 * Logs an object to the console.
 * Iterates through objects and arrays and logs their contents with labels.
 * @param obj - the object to log
 * @param label - an optional label to prepend to the log messages
 */
export function logObject(obj: any, label: string = "") {
  if (!obj) {
    logger.error(`No object to log for ${label}`)
    return
  }
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    logger.debug(`${label}: `, obj)
    return
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      logger.debug(`${label}[${i}]: `, item)
    })
    return
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      logger.debug(`${label}.${key}: `, obj[key])
    })
  } else {
    logger.debug(`${label}: `, obj)
  }
}

export function setNavId() {
  const nav = document.querySelector("nav.md-tabs")
  if (!nav) {
    logger.error("No nav element found")
    return
  }
  nav.setAttribute("id", "hero-tabs")
  logger.debug("Set nav id to 'hero-tabs'")
}

/**
 * Unhides the 'hidden' attribute of an HTML element.
 * @param element An HTMLElement to unhide
 */
export function removeHiddenAttr(element: HTMLElement) {
  if ("hidden" in element) {
    element.hidden = false
  }
}

/**
 * Checks if :has() selector is supported
 */
export function supportsHasSelector(): boolean {
  try {
    // Try to compile a :has() selector
    document.querySelector(":has()")
    return true
  } catch {
    // If it throws, :has() is not supported
    try {
      // Double-check with CSS.supports()
      return CSS.supports("selector(:has(*))")
    } catch {
      // If both checks fail, :has() is definitely not supported
      return false
    }
  }
}

/**
 * Creates a delay for the specified milliseconds.
 * @param ms The number of milliseconds to delay.
 * @returns A promise that resolves after the specified delay.
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
