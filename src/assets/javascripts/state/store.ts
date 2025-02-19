/**
 * @module store
 * @description Centralized state management for hero section with reactive state updates
 *
 * Implements a singleton reactive store for managing complex UI state using RxJS,
 * with advanced state tracking, predicate-based logic, and performance optimizations.
 *
 * Frankly, it's overkill, but it was designed for a complex UI with many moving parts... and then I changed the design to be simpler... so now it's overkill.
 * But it works, so I'm leaving it in place.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import {
  BehaviorSubject,
  Observable,
  Observer,
  Subscription,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from "rxjs"
import { getViewportOffset, getViewportSize } from "~/browser"
import { Header, getComponentElement } from "~/components"
import { SectionIndex } from "~/hero"
import {
  isDev,
  isHome,
  isPageVisible$,
  isPartiallyInViewport,
  logger,
  navigationEvents$,
  prefersReducedMotion$,
  setCssVariable,
  stringify,
  watchHeader,
  watchMediaQuery,
} from "~/utils"
import {
  AnimationComponent,
  ComponentStateUpdateFunction,
  HeroState,
  StatePredicate,
  StateValue,
  TransitionState,
  VideoState,
} from "./types"

let customWindow: CustomWindow = window as unknown as CustomWindow
const weAreDev = isDev(new URL(customWindow.location.href))
const { viewport$ } = customWindow
const initialUrl = new URL(customWindow.location.href)

/** ======================
 **   COMPONENT PREDICATES
 *========================**/
// there used to be a lot more, but, we simplified it by moving to the video.

export const isFullyVisible = (state: HeroState): boolean =>
  state.atHome && state.landingVisible && state.pageVisible

const isTransitioning = (state: HeroState): boolean => state.isTransitioning

export const noVideo = (state: HeroState): boolean => state.prefersReducedMotion

/**
 * @param {HeroState} state - Hero state
 * @returns {VideoState} video state predicate
 * @description Predicates for the video component
 */
export const videoPredicate = (state: HeroState): VideoState => ({
  canPlay: isFullyVisible(state) && !noVideo(state) && !isTransitioning(state),
})

const predicates = {
  isFullyVisible,
  noVideo,
  videoPredicate,
}

/**
 * @class HeroStore
 *
 * @description Centralized state management for hero section with reactive state updates
 *
 * @property {BehaviorSubject<HeroState>} state$ - BehaviorSubject that holds the current state of the hero section
 * @property {BehaviorSubject<VideoState>} videoState$ - BehaviorSubject that holds the current state of the video component
 * @property {BehaviorSubject<number>} parallaxHeight$ - BehaviorSubject that holds the current state of the parallax height
 * @property {Subscription} subscriptions - Subscription for managing observables
 *
 * @method getInstance - Static singleton instance getter
 * @method updateHeroState - Updates the hero state with a partial state object
 * @method getState - Gets the current state of the hero section
 * @method getStateValue - Gets the value of a specific state subject
 * @method getComponentValue - Gets the value of a specific component
 * @method debugStateChange - Logs and updates state changes for debugging
 * @method destroy - Unsubscribes from all observables and resets the singleton instance
 */
export class HeroStore {
  private static instance: HeroStore | undefined

  // state$ is a BehaviorSubject that holds the current state of the hero section
  public state$ = new BehaviorSubject<HeroState>({
    atHome: isHome(initialUrl),
    canPlay: false,
    landingVisible: isHome(initialUrl) && (initialUrl.hash === "" || initialUrl.hash === "#"),
    pageVisible: !document.hidden || document.visibilityState === "visible",
    prefersReducedMotion: customWindow.matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewport: {
      offset: getViewportOffset(),
      size: getViewportSize(),
    },
    header: { height: 0, hidden: true },
    parallaxHeight: getViewportOffset().y * 1.4,
    location: initialUrl,
    isTransitioning: false,
    tearDown: false,
    currentSection: SectionIndex.NotInitialized,
  })

  public videoState$ = new BehaviorSubject<VideoState>({ canPlay: false })

  public parallaxHeight$ = new BehaviorSubject<number>(getViewportOffset().y * 1.4)

  // defaulting to true keeps the video from playing on page load
  public transitionState$ = new BehaviorSubject<TransitionState>({ isTransitioning: true })

  public section$ = new BehaviorSubject<SectionIndex>(SectionIndex.NotInitialized)

  private subscriptions = new Subscription()

  /**
   * @returns {HeroStore} Singleton instance of the HeroStore
   * @description Static singleton instance getter
   */
  static getInstance(): HeroStore {
    return (HeroStore.instance ??= new HeroStore())
  }

  /**
   * @description Initializes the HeroStore singleton instance
   */
  private constructor() {
    this.initSubscriptions()
  }

  /**
   * @param {Partial<HeroState>} update - Partial state object to update the hero state
   * @param {AnimationComponent} component Optional component to update
   * @description Updates the hero state with a partial state
   */
  private updateState(update: T, component?: AnimationComponent): void {
    if (weAreDev) {
      this.debugStateChange(update)
    }
    if (update === null || update === undefined) {
      return
    }
    const changes = Object.entries(update).filter(
      ([key, value]) =>
        value !== null &&
        key in this.state$.value &&
        this.state$.value[key as keyof HeroState] !== value,
    )
    if (changes.length === 0) {
      return
    }
    this.state$.next({ ...this.state$.value, ...update })
    if (component) {
      switch (component) {
        case AnimationComponent.Video:
          this.videoState$.next({ ...this.videoState$.value, ...update })
          break
        default:
          break
      }
    }
  }

  /**
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @param {AnimationComponent} component Optional component to update state
   * @description Updates the hero state with a partial state
   */
  public updateHeroState(updates: Partial<HeroState>, component?: AnimationComponent): void {
    logger.debug("external component updating state; updates:")
    logger.table(updates)
    this.updateState(updates, component)
  }

  /**
   * @param {string} name - Name of the observable
   * @param {(T) => Partial<HeroState>} updateFn - Function to update state based on observable value
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates an observer for an observable
   */
  private createObserver<T>(
    name: string,
    updateFn: (_value: T) => Partial<HeroState>,
    component?: AnimationComponent,
  ): Observer<T> {
    return {
      next: (value: T) => {
        logger.debug(`Observer ${name} received:`)
        logger.table(value)
        this.updateState(updateFn(value), component)
      },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`),
    }
  }

  /**
   * @description Initializes all observables and subscriptions
   */
  private initSubscriptions(): void {
    const atHome$ = navigationEvents$.pipe(
      map(isHome),
      distinctUntilChanged(),
      startWith(isHome(initialUrl)),
      shareReplay(1),
      tap(this.createObserver("atHome$", (atHome) => ({ atHome }))),
    )

    const landing$ = combineLatest([
      isPartiallyInViewport(document.getElementById("parallax-hero-image-layer") as HTMLElement),
      this.section$.pipe(filter((section) => section < SectionIndex.Impact)),
    ]).pipe(
      map(([landingVisible, _currentSection]) => {
        return landingVisible
      }),
      distinctUntilChanged(),
      shareReplay(1),
    )

    const landingVisible$ = atHome$.pipe(
      filter((atHome) => atHome),
      switchMap(() => landing$),
      filter((landingVisible) => !!landingVisible),
      tap(this.createObserver("landingVisible$", (landingVisible) => ({ landingVisible }))),
    )

    const pageVisible$ = isPageVisible$.pipe(
      tap(this.createObserver("pageVisible$", (pageVisible) => ({ pageVisible }))),
    )

    const motion$ = prefersReducedMotion$.pipe(
      tap(
        this.createObserver("prefersReducedMotion$", (prefersReducedMotion) => ({
          prefersReducedMotion,
        })),
      ),
    )

    const view$ = viewport$.pipe(
      distinctUntilChanged(),
      debounceTime(100),
      shareReplay(1),
      tap((viewport) => {
        setCssVariable("--viewport-offset-height", `${viewport.offset.y}px`)
        setCssVariable("--viewport-offset-width", `${viewport.offset.x}px`)
      }),
      tap(this.createObserver("view$", (viewport) => ({ viewport }))),
    )

    const header$ = watchHeader(getComponentElement("header"), { viewport$ }).pipe(
      tap((header: Header) => {
        setCssVariable("--header-height", header.hidden ? "0" : `${header.height}px`)
      }),
      tap(this.createObserver("header$", (header) => ({ header }))),
    )

    const parallax$ = combineLatest([
      viewport$,
      watchHeader(getComponentElement("header"), { viewport$ }),
      watchMediaQuery("(orientation: portrait)"),
    ]).pipe(
      map(([viewport, header, portrait]) => {
        return {
          viewHeight: viewport.offset.y,
          headerHeight: header.height,
          portrait,
        }
      }),
      map(({ viewHeight, headerHeight, portrait }) => {
        const adjustedHeight = Math.abs(viewHeight - headerHeight)
        return portrait ? adjustedHeight * 1.4 : adjustedHeight * 1.6
      }),
      distinctUntilChanged(),
      shareReplay(1),
      tap((parallaxHeight) => {
        setCssVariable("--parallax-height", `${parallaxHeight}px`)
      }),
      tap(this.createObserver("parallaxHeight$", (parallaxHeight) => ({ parallaxHeight }))),
    )

    const video$ = this.getVideoState$((canPlay) => {
      this.videoState$.next({ canPlay } as unknown as VideoState)
    })

    const transition$ = this.getTransitionState$((t) => {
      this.transitionState$.next(t as TransitionState)
    })

    const loc$ = navigationEvents$.pipe(
      tap(
        this.createObserver("location$", (location) => ({
          location,
        })),
      ),
    )

    const section$ = this.section$.pipe(
      tap(
        this.createObserver("section$", (currentSection) => ({
          currentSection,
        })),
      ),
      distinctUntilChanged(),
      shareReplay(1),
    )

    this.subscriptions.add(atHome$.subscribe())
    this.subscriptions.add(landingVisible$.subscribe())
    this.subscriptions.add(pageVisible$.subscribe())
    this.subscriptions.add(motion$.subscribe())
    this.subscriptions.add(view$.subscribe())
    this.subscriptions.add(header$.subscribe())
    this.subscriptions.add(loc$.subscribe())
    this.subscriptions.add(parallax$.subscribe())
    this.subscriptions.add(video$.subscribe())
    this.subscriptions.add(transition$.subscribe())
    this.subscriptions.add(section$.subscribe())
  }

  /**
   * @returns {HeroState} Current state of the hero section
   * @description Gets the current state of the hero section
   */
  public getState(): HeroState {
    return this.state$.getValue()
  }

  /**
   * @param {string} subject - Name of the state subject
   * @returns {any} - Current value of the state subject
   * @description Gets the current value of a specific state subject
   */
  public getStateValue(subject: string): any {
    return this.state$.value[subject as keyof HeroState]
  }

  /**
   * @param {string} component - Name of the component
   * @returns {ComponentState} - Current state of the component
   * @description Gets the current state of a specific
   * component or landing permissions
   */
  public getComponentValue(): VideoState {
    return this.videoState$.value
  }

  /** ============================================
   *          Component Specific Observables
   *=============================================**/

  /**
   * @param {string} name - Name of the observable
   * @param {ComponentStateUpdateFunction} func - Function to update the component state
   * @returns {Observer<T>} - Observer for the observable
   * @description Creates a standard observer for a component observable
   */
  private getComponentObserver<T>(name: string, func?: ComponentStateUpdateFunction): Observer<T> {
    return {
      next: (value: T) => {
        logger.debug(`Observer ${name} received:`)
        logger.table(value)
        if (func) {
          func(value as StateValue)
        }
      },
      error: (error: Error) => logger.error(`Error in ${name}:`, error),
      complete: () => logger.info(`${name} completed`),
    }
  }

  /**
   * @param {ComponentStateUpdateFunction} observerFunc Function to update the component state
   * @returns {Observable<VideoState>} Observable for carousel state indicating play and pause conditions
   * @description Creates an observable for the carousel state indicating play and pause conditions
   */
  private getStateObservable(
    observerFunc: ComponentStateUpdateFunction,
    key: keyof HeroState,
    observableName: string,
    predicate?: (state: HeroState) => any,
  ): Observable<T> {
    return this.state$.pipe(
      map(
        (state) =>
          ({
            [key]: predicate ? predicate(state) : state[key],
          }) as unknown as T,
      ),
      distinctUntilKeyChanged(key as keyof StateValue),
      shareReplay(1),
      tap(this.getComponentObserver(observableName, observerFunc)),
    )
  }
  private getVideoState$(observerFunc: ComponentStateUpdateFunction): Observable<boolean> {
    return this.state$.pipe(
      map((state) => predicates.videoPredicate(state).canPlay), // Return boolean directly
      distinctUntilChanged(),
      shareReplay(1),
      tap(this.getComponentObserver("videoState$", observerFunc)),
    )
  }

  private getTransitionState$(
    observerFunc: ComponentStateUpdateFunction,
  ): Observable<TransitionState> {
    return this.getStateObservable(observerFunc, "isTransitioning", "transitionState$")
  }

  /**
   * @param {Partial<HeroState>} updates - Partial state object to update the hero state
   * @description Logs and updates state changes for debugging
   */
  public debugStateChange(updates: Partial<HeroState>): void {
    if (weAreDev) {
      const oldState = this.state$.value
      const changes = Object.entries(updates).filter(
        ([key, value]) => oldState[key as keyof HeroState] !== value,
      )
      if (changes.length === 0) {
        return
      }
      logger.debug("State received changes:")
      logger.table(changes)
      logger.debug("New state:", stringify({ ...oldState, ...updates }))
      Object.entries(predicates)
        .filter(([_, value]) => typeof value === "function")
        .forEach(([name, predicate]) => {
          logger.debug(`${name}:`, (predicate as StatePredicate)({ ...oldState, ...updates }))
        })
    }
  }

  /**
   * @method destroy
   * @public
   * @description Unsubscribes from all observables and resets the singleton instance
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    HeroStore.instance = undefined
  }
}
