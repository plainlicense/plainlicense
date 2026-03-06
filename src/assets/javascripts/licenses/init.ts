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
import { UserInfoManager } from './userInfo';

const customWindow = window as unknown as CustomWindow;
const { document$ } = customWindow;

/**
 * @exports initLicenseFeature
 * @returns {Observable<Subscription | undefined>} - Observable of the license feature subscription
 * @description Initializes the license feature.
 */
export function initLicenseFeature(): Observable<Subscription | undefined> {
  let tabManager: TabManager | null = null;
  let userInfoManager: UserInfoManager | null = null;

  return document$.pipe(
    tap(() => {
      // Cleanup previous instances if they exist
      tabManager?.cleanup?.();
      userInfoManager?.cleanup?.();

      // Initialize new tab manager
      tabManager = new TabManager();

      // Initialize user info manager (personalization feature)
      userInfoManager = new UserInfoManager();

      logger.info('License feature initialized');
    }),
    map(() => {
      return tabManager?.subscription;
    }),
  );
}
