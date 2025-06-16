/**
 * @module config
 * @description Main configuration file for the application; you should set up any changes to the application here.
 *
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 */
import gsap from 'gsap';
import type { EmphasisConfig } from '../hero/animations/types';
import type { FadeInConfig, ObserverConfig } from './types';

// tags to exclude from animation
export const EXCLUDED_TAGS = ['STYLE', 'SCRIPT', 'NOSCRIPT'] as const;
export const BACKUP_PICTURE = 'break_free' as const;

const FADE_IN_CONFIG: FadeInConfig = {
  defaults: {
    ease: 'power1.inOut',
    paused: false,
  },
  normal: {
    from: {
      yPercent: 75,
    },
    to: {
      duration: 0.5,
      yPercent: 0,
    },
  },
  prefersReducedMotion: {
    from: {
      duration: 0.75,
      y: 0,
    },
    to: {
      duration: 0.75,
      y: 0,
    },
  },
} as const;

/**
 * @type {ObserverConfig} OBSERVER_CONFIG
 * @description Configuration for the observer
 */
export const OBSERVER_CONFIG: ObserverConfig = {
  clickTargets: '.cta__container--target-selector',
  emphasisTargets: {
    strong: '#arrow-down',
    subtle: '#hero-button',
  },
  fades: {
    fadeInConfig: FADE_IN_CONFIG,
    fadeInDuration: 0.5,
    fadeInSections: gsap.utils.toArray('section'),
  },
  footer: '#hero-footer',
  header: '#hero-header, nav.md-tabs',
  ignoreTargets: 'a, button, header, navigation, nav.md-tabs',
  slides: {
    clickPause: 5,
    scrollPause: 10,
    sections: gsap.utils.toArray('section'),
    slideDuration: 1.25,
  },
} as const;

/**
 * @type {string} VIDEO_MANAGER_ELEMENTS
 * @description Elements for observer to ignore when VideoManager is active
 */
export const VIDEO_MANAGER_ELEMENTS: string =
  '.hero__video, .hero__poster, .hero__poster--image, .hero__backup, noscript, style, script' as const;

/**
 * Minimum widths for video source media queries
 * Keys are the width of the video
 * Values are the minimum width of the viewport
 */
export const MAX_WIDTHS = {
  426: '426',
  640: '640',
  854: '854',
  1280: '1280',
  1920: '1920',
  2560: '2560',
  3840: '3840',
} as const;

export const SUBTLE_EMPHASIS_CONFIG: EmphasisConfig = {
  blinkConfig: {
    autoAlpha: 0.4,
    duration: 1,
    ease: 'power1.inOut',
    filter: 'brightness(1.1)',
    repeat: -1,
    repeatDelay: 0.5,
    startAt: { filter: 'brightness(1.1)' },
    yoyo: true,
  },
  jumpConfig: {
    duration: 0.5,
    ease: 'elastic',
    repeat: -1,
    repeatDelay: 4,
    y: -2,
    yoyoEase: 'elastic',
  },
  scaleUpConfig: {
    duration: 1,
    ease: 'power1.inOut',
    repeat: -1,
    repeatDelay: 4,
    scale: 1.1,
  },
} as const;

export const STRONG_EMPHASIS_CONFIG: EmphasisConfig = {
  blinkConfig: {
    autoAlpha: 0.4,
    repeat: -1,
    repeatDelay: 0.5,
    yoyoEase: 'power1.in',
  },
  jumpConfig: {},
  scaleUpConfig: { duration: 1, scale: 1.1 },
} as const;

export const VIDEO_END_BUFFER = 5 as const;
