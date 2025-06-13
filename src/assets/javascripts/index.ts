/**
 * ========================================================================
 * *                          PLAIN LICENSE ENTRYPOINT
 *
 * Entrypoint for Plain License's added script bundle.
 * Supplements Material for MkDocs with site-specific scripts.
 * @module index
 * @license Plain Unlicense (Public Domain)
 *
 * Handles:
 * - Imports Material for MkDocs bundle and ensures global observables stay available
 * - Caching/preloading of static assets
 * - Subscriptions to page-specific observables
 *========================================================================*
 */
import './utils/fetchWorker';
// @ts-ignore - TODO: figure out how to fix this annoying error
import '@/bundle';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  catchError,
  EMPTY,
  filter,
  map,
  merge,
  type Observable,
  of,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { HeroStore } from '~/state/store';
import { isHelpingIndex, isHome, isLicense, isOnSite } from '~/utils/conditionChecks';
import { feedback } from './feedback/feedback';
import { HeroObservation } from './hero/animations/observer';
import { VideoManager } from './hero/video/videoManager';
import { initLicenseFeature } from './licenses/init';
import type { PageConfig } from './types';
import { navigationEvents$, watchLicenseHash, windowEvents } from './utils/eventHandlers';
import {
  createScript,
  fixSvgDimensions,
  removeHiddenAttr,
  setNavId,
  supportsHasSelector,
} from './utils/helpers';
import { logger } from './utils/log';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// we have js, so let's get some things out of the way here
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

const customWindow: CustomWindow = window as unknown as CustomWindow;
const { document$ } = customWindow;

// get the hero store registered
HeroStore.getInstance();

const insertAnalytics = () => {
  try {
    createScript(
      'https://app.tinyanalytics.io/pixel/ei74pg7dZSNOtFvI',
      false, // async must be false
      true, // defer can be true
      false, // ignore Do Not Track
    );
  } catch (e) {
    console.warn('Analytics failed to load:', e);
  }
};
const imgLogo = document.querySelector('img.simple_logo');
if (
  imgLogo &&
  imgLogo instanceof HTMLElement &&
  supportsHasSelector() &&
  imgLogo.hasAttribute('hidden')
) {
  removeHiddenAttr(imgLogo);
}

const insertButtonScript = () => createScript('https://buttons.github.io/buttons.js', true, true);

const onDom$ = (obs: Observable<T>) => {
  return document$.pipe(switchMap(() => obs));
};

const analytic$ = onDom$(of(insertAnalytics()));
const feedback$ = onDom$(of(feedback()));
const buttonScript$ = onDom$(of(insertButtonScript()));
const nav$ = of(setNavId());
const color$ = of(document.body.setAttribute('data-md-color-scheme', 'slate'));
const observer$ = of(HeroObservation.getInstance());
const videoManager$ = of(VideoManager.getInstance());
const licenseHashHandler$ = onDom$(watchLicenseHash());
const license$ = navigationEvents$.pipe(
  filter((url) => !!isLicense(url)),
  switchMap(() => initLicenseFeature()),
);
const fixSvg$ = onDom$(of(fixSvgDimensions()));
// windowEvents$ is now imported directly as an Observable
const windowEvents$ = onDom$(of(windowEvents()));

// Define page configurations
const pageConfigs: PageConfig[] = [
  {
    matcher: isHome,
    location: 'home',
    observables: [nav$, color$, observer$, videoManager$],
  },
  {
    matcher: (url) => !!isLicense(url),
    location: 'licenses',
    observables: [license$],
  },
  {
    matcher: isHelpingIndex,
    location: 'helpingIndex',
    observables: [buttonScript$],
  },
  {
    matcher: isOnSite,
    location: 'all',
    observables: [analytic$, feedback$, fixSvg$, licenseHashHandler$, windowEvents$],
  },
];

// Single parent observable to manage page subscriptions
const pageSubscription$ = navigationEvents$.pipe(
  map((url) => {
    // Find all matching page configs
    const matchingConfigs = pageConfigs.filter((config) => config.matcher(url));
    if (matchingConfigs.length === 0) {
      return null;
    }

    matchingConfigs.forEach((config) => logger.info(`Navigated to ${config.location}`));
    return matchingConfigs;
  }),
  filter((configs): configs is PageConfig[] => configs !== null),
  switchMap((configs) => {
    // Merge observables from all matching configs
    const allObservables = configs.flatMap((config) =>
      config.observables.map((obs) =>
        obs.pipe(
          tap(() => logger.info(`Running observables for ${config.location}`)),
          catchError((error) => {
            logger.error(`Error in ${config.location} observables:`, error);
            return EMPTY;
          }),
        ),
      ),
    );
    return merge(...allObservables);
  }),
  share(),
);

// Single subscription to handle all page changes
pageSubscription$.subscribe();
