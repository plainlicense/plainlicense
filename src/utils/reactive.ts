import { BehaviorSubject, fromEvent } from 'rxjs'

/**
 * Shared GSAP defaults for consistent animation quality.
 */
export const animationDefaults = {
  duration: 0.3,
  ease: 'power2.out',
};

/**
 * Reactive state for comparison mode.
 */
export const comparisonModeState = new BehaviorSubject<boolean>(false);

/**
 * Initialize global event listeners for reactive components.
 */
export function initReactive() {
  // Example: toggle comparison mode with a keyboard shortcut (e.g., 'c')
  fromEvent<KeyboardEvent>(document, 'keydown').subscribe(event => {
    if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
      comparisonModeState.next(!comparisonModeState.value);
    }
  });
}
