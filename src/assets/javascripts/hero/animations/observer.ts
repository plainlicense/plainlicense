/**
 * @module observer
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @see {@link https://codepen.io/GreenSock/pen/XWzRraJ} GSAP Hero Observers Example
 * @see {@link https://gsap.com/docs/v3/Plugins/Observer/} GSAP Observer Documentation
 */

import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import {
  BehaviorSubject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  skipUntil,
} from 'rxjs';
import { OBSERVER_CONFIG, type ObserverConfig } from '~/config';
import { type HeroState, HeroStore } from '~/state';
import { Direction, type Section, SectionIndex } from './types';
import { getContentElements } from './utils';
// Make sure we have the effects registered
import { isHome, isValidElement, logger, navigationEvents$, range } from '~/utils';
import './effects';

gsap.registerPlugin(Observer);

/**
 * @exports @class HeroObservation
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations. This is heavily
 * inspired by a fine example from the GreenSock team (based on another by Brian Cross), here: https://codepen.io/GreenSock/pen/XWzRraJ
 */
export class HeroObservation {
  private store = HeroStore.getInstance();

  private currentIndex: SectionIndex = SectionIndex.NotInitialized;

  private config: ObserverConfig = OBSERVER_CONFIG;

  private hasTransitioned = false;

  public sections: Section[] = [];

  private static instance: HeroObservation;

  private subscriptions = new Subscription();

  // The observers are created only when the user is at home
  private transitionObserver: Observer | undefined;

  private clickObserver: Observer | undefined;

  private footerObserver: Observer | undefined;

  public animating = false;

  private transitionTl: gsap.core.Timeline;

  private sectionCount = 0;

  private sectionIndexLength = 0;

  private defaultTimelineVars: gsap.TimelineVars = {};

  private initialized = false;

  private indexSubject = new BehaviorSubject<SectionIndex>(SectionIndex.NotInitialized);

  private footer: Element | null = document.querySelector(this.config.footer);

  private header: Element[] | null = gsap.utils.toArray(this.config.header);

  private wrapper = gsap.utils.wrap(range(this.sectionCount) as number[]);

  private constructor() {
    this.defaultTimelineVars = {
      defaults: {
        callbackScope: this,
      },
      repeat: 0,
      duration: this.config.slides.slideDuration,
      ease: 'power2.inOut',
      callbackScope: this,
    };
    this.transitionTl = gsap.timeline(this.defaultTimelineVars);
    this.setupSubscriptions();
    logger.info('HeroObservation initialized');
  }

  /**
   * @description Get the singleton instance of the HeroObservation class.
   * @returns {HeroObservation}
   */
  public static getInstance(): HeroObservation {
    return (HeroObservation.instance ??= new HeroObservation());
  }
  // Sets up RxJs subscriptions to monitor the atHome state
  private setupSubscriptions() {
    // We're only interested in the atHome state
    const atHome$ = this.store.state$.pipe(
      filter((state: HeroState) => state.atHome),
      distinctUntilKeyChanged('atHome'),
      map((state) => {
        return state.atHome;
      }),
      filter((atHome: boolean) => atHome),
    );

    const index$ = this.indexSubject.asObservable().pipe(
      distinctUntilChanged((a, b) => a === b),
      skipUntil(atHome$),
      distinctUntilChanged((a, b) => a === b),
    );

    const tearDown$ = this.store.state$.pipe(
      map((state: HeroState) => state.atHome),
      distinctUntilChanged((a, b) => a === b),
      filter((atHome: boolean) => !atHome),
      debounceTime(5000),
    );

    this.subscriptions.add(
      atHome$.subscribe(() => {
        this.onLoad();
        this.subscriptions.add(tearDown$.subscribe(() => this.destroy()));
      }),
    );
    this.subscriptions.add(index$.subscribe((index) => this.store.section$.next(index)));
  }

  private updateIndex(index: SectionIndex) {
    this.currentIndex = index;
    this.indexSubject.next(index);
  }

  // A delayed initialization function that sets up the observers
  // and the animations for the Hero feature -- when the user is at home
  private onLoad() {
    this.transitionTl.pause();
    gsap.set(this.footer, { autoAlpha: 0 });
    this.header?.forEach((header) => {
      if (header instanceof HTMLElement && header.style.opacity.length) {
        header.style.opacity = '1';
      }
    });
    logger.debug('Observer header:', this.header);
    if (this.footer && this.footer instanceof HTMLElement && this.footer.style.opacity.length) {
      this.footer.style.opacity = '1';
    }
    this.subscriptions.add(
      navigationEvents$.pipe(filter((url) => !isHome(url))).subscribe(() => {
        this.header?.forEach((header) => {
          if ('hidden' in header && header.hidden) {
            header.hidden = false;
          }
          if (header instanceof HTMLElement && header.style.background.length) {
            header.style.background = '';
          }
        });
        this.footer?.removeAttribute('hidden');
        gsap.set(this.footer, { autoAlpha: 1, opacity: 1 });
        gsap.set(this.header, { autoAlpha: 1, opacity: 1 });
      }),
    );
    const outerWrappers = gsap.utils.toArray('.outer');
    const innerWrappers = gsap.utils.toArray('.inner');
    requestAnimationFrame(() => {
      document.body.style.overflow = 'hidden';
      this.sections.forEach((section) => {
        gsap.set(section.element, { autoAlpha: 0 });
      });
      gsap.set(outerWrappers, { yPercent: 100 });
      gsap.set(innerWrappers, { yPercent: -100 });
    });
    const { hash } = window.location;
    const target = hash.length > 0 ? document.getElementById(hash.substring(1)) : null;
    if (!this.initialized) {
      this.setupSections();
      this.wrapper = gsap.utils.wrap(range(this.sectionCount) as number[]);
      this.setupObserver();
      this.setupFirstSection(!target);
      this.initialized = true;
    } else if (target) {
      this.hasTransitioned = true;
      const sectionTarget = this.sections.find((section) => section.content.includes(target));
      if (sectionTarget) {
        const index = this.sections.indexOf(sectionTarget);
        this.goToSection(index, index === this.sectionIndexLength ? Direction.Up : Direction.Down);
      } else {
        logger.warn(`Target section ${target.id} not found in sections`);
      }
    }
  }

  /**
   * @description Set up the first load of the Hero feature.
   * Emphasis animations are handled in videoManager.ts.
   */
  private setupFirstSection(startImmediately = false) {
    if (startImmediately) {
      this.goToSection(0, Direction.Down);
    }
  }

  /**
   * @param animation - The animation to register (gsap.core.Timeline)
   * @param key - The section element to register the animation with
   * @description Register an animation with a section element.
   */
  public registerAnimation(animation: gsap.core.Timeline, key: Element) {
    const section = this.sections.find((section) => section.element === key);
    if (section) {
      section.animation = section.animation ? section.animation.add(animation) : animation;
    }
  }

  /**
   * @description Set up the Section objects for the Hero feature.
   */
  private setupSections() {
    // Get all section elements
    const sectionEls = gsap.utils.toArray('section.hero');
    this.sections = (sectionEls as Element[]).map((el, index) => {
      // Find the main containers
      const outerWrapper = el.querySelector('.outer');
      const innerWrapper = el.querySelector('.inner');
      const bg = el.querySelector('.hero__bg');

      // Get content elements, excluding structural wrappers
      const initialContent = getContentElements(el)
        .filter((element) => element !== outerWrapper && element !== innerWrapper && element !== bg)
        .filter((e) =>
          isValidElement(
            e,
            e.parentElement || this.sections[index].bg || this.sections[index].element,
          ),
        );
      const content = Array.from(new Set(initialContent));

      logger.debug(`Setting up section ${index}`, { outerWrapper, innerWrapper, bg, content });

      const animation = gsap
        .timeline({
          ...this.defaultTimelineVars,
          defaults: {
            paused: true,
            callbackScope: this,
            ease: 'power2.inOut',
          },
          paused: true,
          duration:
            index === SectionIndex.Landing
              ? () =>
                  this.hasTransitioned
                    ? this.config.slides.slideDuration
                    : this.config.slides.slideDuration / 3
              : this.config.slides.slideDuration,
          callbackScope: this,
          onStart: this.onStartFunction(index),
          onComplete: this.onCompleteFunction(index),
        })
        .addLabel('start');

      return {
        index,
        element: el,
        outerWrapper,
        innerWrapper,
        bg,
        content,
        animation,
      } as Section;
    });

    // Filter out ignored elements from first section
    this.sections[0].content = this.sections[0].content.filter((content) =>
      this.isValidContentTarget(content),
    );

    this.sectionCount = this.sections.length;
    this.sectionIndexLength = this.sectionCount - 1;
  }
  /**
   * @description Transition to the next section based on the direction and whether the scenicRoute is enablgetNexted.
   * @param direction
   * @param scenicRoute
   * @returns
   */
  public async transition(direction: Direction, scenicRoute?: boolean) {
    if (this.animating) {
      return;
    }
    this.animating = true;
    let nextIndex = this.getNextIndex(direction);
    if (!scenicRoute) {
      this.goToSection(nextIndex, direction);
    } else if (scenicRoute && direction === Direction.Down) {
      this.goToSection(nextIndex, direction);
      let remainingSections = this.sectionIndexLength - nextIndex;

      while (remainingSections > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (this.currentIndex !== this.sectionIndexLength && this.currentIndex === nextIndex) {
          this.goToSection(nextIndex + Direction.Down, direction);
          nextIndex++;
          remainingSections--;
        } else {
          this.animating = false;
          break; // Exit loop if condition fails
        }
      }
    }
    this.animating = false;
    return;
  }

  // Get the next index based on the direction
  private getNextIndex(direction: Direction): number {
    if (this.hasTransitioned) {
      return this.wrapper(this.currentIndex + direction) as number;
    }
    const nextIndex = this.currentIndex + direction;
    if (nextIndex <= 0) {
      return 0;
    } else {
      this.hasTransitioned = true;
      return this.wrapper(nextIndex) as number;
    }
  }

  // Construct the transition timeline based on the direction and index
  // Uses registered effects from observerEffects.ts
  private constructTransitionTimeline(direction: Direction, index: number, tl: gsap.core.Timeline) {
    const section = this.sections[index];
    logger.debug(
      `Timeline state: currentIndex=${this.currentIndex}, targetIndex=${index}, direction=${direction}, sectionsCount=${this.sectionCount}`,
    );
    // the first time this runs, currentIndex will be -1
    logger.info(`Setting section ${this.currentIndex} to section ${index}`);
    tl['setSection'](section.element, { direction, section });
    logger.info(`Animating section ${index} in direction ${direction}`);
    tl['transitionSection'](section.element, { direction, section });
    if (section.animation && section.animation.totalDuration() > 0) {
      tl.add(section.animation, '>');
    }
    tl.add(() => {
      this.animating = false;
    }, '>');
    logger.info(`Transition for section ${index} is set and will trigger now`);
    return tl;
  }

  // Go to the next section based on the index and direction
  private goToSection(index: number, direction: Direction): void {
    logger.info('Entering go to section with index and direction:', index, direction);
    // an insurance policy for edge cases: ensure the index is within bounds
    const clampedIndex = gsap.utils.clamp(0, this.sections.length - 1, index);
    if (this.animating || clampedIndex === this.currentIndex) {
      logger.info('Exiting goToSection: already animating or index is the same.');
      logger.debug('Clamped index:', clampedIndex);
      return;
    }
    this.updateIndex(clampedIndex);

    // Update currentIndex before creating timeline
    if (!this.sections[clampedIndex].animation) {
      throw new Error(
        `No animation found for section ${clampedIndex} -- failed to setup transition`,
      );
    }
    logger.debug(`Transitioning to section ${clampedIndex} in direction ${direction}`);

    this.transitionTl = this.constructTransitionTimeline(
      direction,
      clampedIndex,
      this.sections[clampedIndex].animation,
    );

    // Ensure timeline completes and calls onComplete
    this.transitionTl.eventCallback('onComplete', () => {
      logger.info('Timeline manually completed for section', clampedIndex);
      this.store.updateHeroState({ isTransitioning: false });
      this.animating = false;
    });

    this.transitionTl.play();

    // Fallback to ensure isTransitioning gets set to false
    setTimeout(() => {
      if (this.store.getState().isTransitioning) {
        logger.info('Fallback: Setting isTransitioning to false after timeout');
        this.store.updateHeroState({ isTransitioning: false });
        this.animating = false;
      }
    }, 2000);
  }

  /**
   * @description Checks if an element is a valid content target for animations.
   * Ensures the element exists, is a valid element, has a parent, belongs to a section,
   * and is not one of the excluded section elements (bg, wrappers, etc.).
   * @param el - The element to check.
   * @returns True if the element is a valid content target, false otherwise.
   */
  private isValidContentTarget(el: unknown): el is Element {
    if (!el || !(el instanceof Element) || !el.parentElement) {
      return false;
    }
    const section = this.sections.find((section) => section.content.includes(el));
    if (!section) {
      return false;
    }
    return (
      el !== section.bg &&
      el !== section.outerWrapper &&
      el !== section.innerWrapper &&
      el !== section.element &&
      isValidElement(el, section.element)
    );
  }

  private onStartFunction(index: SectionIndex) {
    return () => {
      this.store.updateHeroState({ isTransitioning: true });
      this.animating = true;
      this.updateIndex(index);
      logger.info(`Transitioning to section ${index}`);
    };
  }

  private onCompleteFunction(index: SectionIndex) {
    return () => {
      this.store.updateHeroState({ isTransitioning: false });
      this.animating = false;
      logger.info(`Transition to section ${index} complete`);
      this.updateIndex(index);
    };
  }

  private onActionFunction(direction: Direction, scenicRoute = false) {
    return () => {
      if (this.animating) {
        logger.warn('Transition is already in progress');
      } else {
        this.transition(direction, scenicRoute);

        logger.info(
          `Action function triggered - direction: ${direction}, scenicRoute: ${scenicRoute}`,
        );
      }
    };
  }

  private onHoverFunction(element: Element | Element[]) {
    return () => !this.animating && gsap.to(element, { autoAlpha: 1, duration: 0.3 });
  }

  private onHoverEndFunction(element: Element | Element[]) {
    return () => !this.animating && gsap.to(element, { autoAlpha: 0, duration: 0.3 });
  }

  private createHoverObserver(element: Element | Element[]): Observer {
    return Observer.create({
      type: 'hover',
      target: element,
      onHover: this.onHoverFunction(element),
      onHoverEnd: this.onHoverEndFunction(element),
    });
  }

  /**
   * @description Set up the Observers for the Hero feature. The Observers are created only when the user is at home. There are two Observers:
   * 1. The transitionObserver is the main Observer that handles all
   * perceived up/down interactions to trigger transitions between sections.
   * 2. The clickObserver handles the click-driven "guided tour" of the sections.
   */
  private setupObserver() {
    const clickTargets = gsap.utils.toArray(this.config.clickTargets);
    const ignoreTargets = gsap.utils.toArray(this.config.ignoreTargets);
    this.transitionObserver = Observer.create({
      type: 'wheel,touch,pointer',
      wheelSpeed: 1,
      onDown: this.onActionFunction(Direction.Down),
      onUp: this.onActionFunction(Direction.Up),
      preventDefault: true,
      tolerance: 25,
      ignore: clickTargets as Element[],
    });
    this.transitionObserver.enable();
    this.clickObserver = Observer.create({
      type: 'click',
      target: clickTargets as Element[],
      ignore: ignoreTargets as Element[],
      onClick: this.onActionFunction(Direction.Down, true),
      onRelease: this.onActionFunction(Direction.Down, true),
      preventDefault: true,
    });
    this.clickObserver.enable();
    if (this.footer) {
      this.footerObserver = this.createHoverObserver(this.footer);
      this.footerObserver.disable(); // Disable by default; we enable when at the last section
    }
  }

  // Destroy the Observers and subscriptions
  public destroy() {
    logger.debug('Destroying observers and subscriptions');
    const observers = [this.transitionObserver, this.clickObserver, this.footerObserver];

    observers.forEach((observer) => {
      if (observer) {
        observer.disable();
        observer.kill();
      }
    });

    this.subscriptions.unsubscribe();
    this.initialized = false;
    this.currentIndex = SectionIndex.NotInitialized;
  }
}
