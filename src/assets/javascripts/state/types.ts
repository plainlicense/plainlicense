/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 */

import type { Header } from '~/components';
import type { SectionIndex } from '../hero/animations/types';

/**
 * @exports @enum {AnimationState}
 * @description Animation states for the Hero feature.
 * @enum {string} AnimationState
 */
export enum AnimationState {
  Playing = 'playing',
  Error = 'error',
  Idle = 'idle',
  Paused = 'paused',
  Disabled = 'disabled',
}

/**
 * @exports @interface TimelineData
 * @description Timeline data for the Hero feature.
 * @interface TimelineData
 */
export interface TimelineData extends gsap.TimelineVars {
  canPlay: boolean;
  video: HTMLVideoElement;
}

export interface HeroState {
  atHome: boolean;
  canPlay: boolean;
  landingVisible: boolean;
  pageVisible: boolean;
  prefersReducedMotion: boolean;
  viewport: Viewport;
  header: Header;
  parallaxHeight: number;
  isTransitioning: boolean;
  location: URL;
  tearDown: boolean;
  currentSection: SectionIndex;
}

export enum AnimationComponent {
  Video = 'video',
}

/**
 * @exports StatePredicate
 * @type {StatePredicate}
 * @description State predicate type
 */
export type StatePredicate = (_state: HeroState) => boolean;

/**
 * @exports VideoState
 * @type {VideoState}
 */
export type VideoState = { canPlay: boolean };

export type TransitionState = { isTransitioning: boolean };

export type StateValue = VideoState | TransitionState;

/**
 * @exports ComponentUpdateFunction
 * @type {ComponentUpdateFunction}
 * @description Component update function
 */
export type ComponentStateUpdateFunction = (_state: StateValue) => void; // updates the component state but there's no return value
