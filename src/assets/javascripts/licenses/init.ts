/**
 * @module licenses
 *
 * @description License feature initialization.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

import { map, type Observable, type Subscription, tap } from 'rxjs';
import { logger } from '../utils/log';
import { TabManager } from './tabManager';

const customWindow = window as unknown as CustomWindow;
const { document$ } = customWindow;

/**
 * @exports initLicenseFeature
 * @returns {Observable<Subscription | undefined>} - Observable of the license feature subscription
 * @description Initializes the license feature.
 */
export function initLicenseFeature(): Observable<Subscription | undefined> {
  let tabManager: TabManager | null = null;

  return document$.pipe(
    tap(() => {
      // Cleanup previous instance if it exists
      tabManager?.cleanup?.();

      // Initialize new tab manager
      tabManager = new TabManager();
      logger.info('License feature initialized');
    }),
    map(() => {
      return tabManager?.subscription;
    }),
  );
}
