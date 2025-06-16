/**
 * @module utilities/conditionChecks
 * @description Utility functions for checking conditions
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved.
 */

import gsap from 'gsap'
import type { NotVisibleReport } from './types'

const LICENSE_HASHES = ['#reader', '#html', '#markdown', '#plaintext', '#changelog', '#official'];

const isProd = (url: URL) => {
  return url.hostname === 'plainlicense.org' && url.protocol === 'https:';
};

// tests if the site is in a development environment
export const isDev = (url: URL) => {
  return (
    (url.hostname === 'localhost' && url.port === '8000') ||
    (url.hostname === '127.0.0.1' && url.port === '8000')
  );
};

// tests if the URL is on the site
export const isOnSite = (url: URL) => {
  return isProd(url) || isDev(url);
};

// tests if the URL is the home page
export const isHome = (url: URL) => {
  return url.pathname === '/' || (url.pathname === '/index.html' && isOnSite(url));
};

const isMainSiteLicensePage = (url: URL) => {
  return (
    (url.pathname.endsWith('index.html') && url.pathname.split('/').length === 5) ||
    (url.pathname.endsWith('/') && url.pathname.split('/').length === 4)
  );
};

// tests if the URL is a license page
const isEmbeddedLicensePage = (url: URL) => {
  const path = url.pathname.split('/');
  const lastPath = path[path.length - 1];
  return (
    path[1] === 'embed' &&
    typeof lastPath === 'string' &&
    lastPath &&
    !lastPath.includes('index.html')
  );
};

/**
 * Tests if the URL is a license page
 * @param url the url to test
 * @returns boolean true if the URL is a license page
 */
export const isLicense = (url: URL) => {
  return isMainSiteLicensePage(url) || isEmbeddedLicensePage(url);
};

export const isLicenseHash = (url: URL) => {
  return url.hash.length > 1 && isLicense(url) && LICENSE_HASHES.includes(url.hash);
};

/**
 * Tests if the URL is the helping index page
 * @param url the url to test
 * @returns boolean true if the URL is the helping index page
 */
export const isHelpingIndex = (url: URL) => {
  return (
    url.pathname.includes('helping') &&
    ((url.pathname.split('/').length === 3 && url.pathname.endsWith('index.html')) ||
      (url.pathname.split('/').length === 2 && url.pathname.endsWith('/')))
  );
};

/**
 * Tests if the site is in a production environment
 * @param url the url to test
 * @returns boolean true if the site is in production
 */

// Tests if the event is a valid event (that it isn't null and is an instance of Event)
export const isValidEvent = (value: Event | null) => {
  return value !== null && value instanceof Event;
};

/**
 * @function elementIsVisible
 * Determines whether an HTML element is currently visible in the viewport.
 *
 * This utility function checks element visibility using modern browser APIs and fallback methods, and considers element and parent visibility, opacity, and content visibility.
 *
 * @param {HTMLElement | null} el - The HTML element to check for visibility.
 * @returns {boolean} A boolean indicating whether the element is currently visible.
 *
 * @description
 * - Uses `checkVisibility()` method if available for modern browsers
 * - Falls back to manual style and parent visibility checks
 * - Handles null and non-HTMLElement inputs gracefully
 *
 * @example
 * const header = document.querySelector('header');
 * const isHeaderVisible = elementIsVisible(header); // Returns true if header is visible
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility|MDN checkVisibility}
 */
export const elementIsVisible = (el: HTMLElement | null, checkParent = false): boolean => {
  if (!(el && el instanceof HTMLElement)) {
    return false;
  }

  const hasCheckVisibility = 'checkVisibility' in el && typeof el.checkVisibility === 'function';

  if (hasCheckVisibility) {
    return el.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    });
  }

  const isNotHidden =
    el.style.display !== 'none' && el.style.visibility !== 'hidden' && el.style.opacity !== '0';

  const parentNotHidden =
    el.parentElement?.style.contentVisibility !== 'hidden' &&
    el.parentElement?.style.visibility !== 'hidden';

  if (checkParent && el.parentElement) {
    return isNotHidden && parentNotHidden;
  }

  return isNotHidden;
};

/**
 * Checks if an element exists within the DOM or a specific container.
 * @param el - The element to check.
 * @param container - Optional container element. If provided, checks if the element is within this container. Otherwise, checks if the element is within the document body.
 * @returns `true` if the element is in the DOM (or container), `false` otherwise.
 */
export function elementInDom(el: Element, container?: Element): boolean {
  return container ? container.contains(el) : document.body.contains(el);
}

/**
 * Retrieves elements that are not visible within a specified parent element.
 * Primarily for debugging purposes.
 * @param parent - The parent element to check for visibility.
 * @returns An array of elements that are not visible.
 */
export function elementsNotVisible(parent: Element = document.body): Element[] {
  const children = gsap.utils.toArray('*', parent);
  return children
    .filter((el) => !elementIsVisible(el as HTMLElement))
    .filter(Boolean) as Element[];
}

/**
 * Generates a report of elements that are not visible within a specified parent element.
 * @param parent - The parent element to check for visibility.
 * @returns An array of NotVisibleReport objects for elements that are not visible.
 */
export function generateNonVisibleElementReport(
  parent: Element = document.body,
): NotVisibleReport[] {
  const elements = elementsNotVisible(parent);
  if (elements.length === 0) {
    return [];
  }
  return elements.map((el) => {
    const computedStyle = getComputedStyle(el);
    const parentComputedStyle = getComputedStyle(el.parentElement as Element);
    const report: NotVisibleReport = {
      contentVisibilityAuto: el.checkVisibility({ contentVisibilityAuto: true }),
      contentVisibilityHidden: computedStyle.contentVisibility === 'hidden',
      element: el as HTMLElement,
      noBox: computedStyle.display === 'none' || computedStyle.display === 'contents',
      opacityZero: computedStyle.opacity === '0',
      parentHidden:
        (parentComputedStyle.display === 'none' || parentComputedStyle.visibility === 'hidden') &&
        computedStyle.visibility === 'inherit',
      visibilityHidden: computedStyle.visibility === 'hidden',
    };
    if (Object.entries(report).some(([_, value]) => value)) {
      report.reason = Object.entries(report)
        .map(([key, value]) => {
          if (value === true || value === 'true') {
            return key;
          }
          return undefined;
        })
        .filter(Boolean) as Array<keyof NotVisibleReport>;
    }
    return report;
  });
}
