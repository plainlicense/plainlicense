/**
 * @module log
 * @description A simple logger for development purposes.
 * Only logs to the console in development.
 *
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @license Plain Unlicense (Public Domain)
 */
import { isDev } from "./conditionChecks"

let isDevelopment = false

const url = new URL(window.location.href)
isDevelopment = isDev(url)

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`%c[DEBUG] ${message}`, "color: aqua", ...args)
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(`%c[ERROR] ${message}`, "color: magenta", ...args)
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`%c[WARNING] ${message}`, "color: orange", ...args)
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(`%c[INFO] ${message}`, "color: white", ...args)
    }
  },
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data)
    }
  },
}
