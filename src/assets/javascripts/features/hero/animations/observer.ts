/**
 * @module observer
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @see {@link https://codepen.io/GreenSock/pen/XWzRraJ} GSAP Hero Observers Example
 * @see {@link https://gsap.com/docs/v3/Plugins/Observer/} GSAP Observer Documentation
 */

import { gsap } from "gsap"
import { Observer } from "gsap/Observer"
import { Subscription } from "rxjs"
import { distinctUntilChanged, filter, map } from "rxjs/operators"
import { OBSERVER_CONFIG, ObserverConfig } from "~/config"
import { HeroStore, HeroState } from "~/state"
import { Direction, Section } from "./types"
import { getContentElements } from "./utils"
// Make sure we have the effects registered
import { isHome, logger, isValidElement, navigationEvents$, stringify } from "~/utils"
import "./effects"
import { VideoManager } from "~/features"

gsap.registerPlugin(Observer)

/**
 * @exports @class HeroObservation
 * @description HeroObservation class for the Hero feature. Creates GSAP Observers that handle the slide-show style animations. This is heavily
 * inspired by a fine example from the GreenSock team (based on another by Brian Cross), here: https://codepen.io/GreenSock/pen/XWzRraJ
 */
export class HeroObservation {
  private store = HeroStore.getInstance()

  private currentIndex: number = -1

  private config: ObserverConfig = OBSERVER_CONFIG

  public sections: Section[] = []

  private static instance: HeroObservation

  private subscriptions = new Subscription()

  // The observers are created only when the user is at home
  private transitionObserver: Observer | undefined

  private clickObserver: Observer | undefined

  public animating: boolean = false

  private transitionTl: gsap.core.Timeline

  // @ts-ignore - initialized in onLoad
  private wrapper

  private sectionCount: number = 0

  private sectionIndexLength: number = 0

  private defaultTimelineVars: gsap.TimelineVars = {}

  private initialized: boolean = false

  private footer: Element | null = document.querySelector(".md-footer")

  private header: Element | null = document.querySelector("#header-target nav.md-tabs")

  private blockbusterManager: VideoManager = VideoManager.getInstance()

  private constructor() {
    this.defaultTimelineVars = {
      defaults: {
        callbackScope: this,
      },
      repeat: 0,
      duration: this.config.slides.slideDuration,
      ease: "power2.inOut",
      onComplete: () => {
        this.animating = false
      },
      onStart: () => {
        this.animating = true
      },
      callbackScope: this,
    }
    this.transitionTl = gsap.timeline(this.defaultTimelineVars)
    this.setupSubscriptions()
    logger.info("HeroObservation initialized")
  }

  /**
   * @description Get the singleton instance of the HeroObservation class.
   * @returns {HeroObservation}
   */
  public static getInstance(): HeroObservation {
    return (HeroObservation.instance ??= new HeroObservation())
  }

  // Sets up RxJs subscriptions to monitor the atHome state
  private setupSubscriptions() {
    // We're only interested in the atHome state
    const atHome$ = this.store.state$.pipe(
      map((state: HeroState) => state.atHome),
      filter((atHome: boolean) => atHome),
      distinctUntilChanged(),
    )

    this.subscriptions.add(
      atHome$.subscribe(() => {
        this.onLoad()
      }),
    )
  }

  // A delayed initialization function that sets up the observers
  // and the animations for the Hero feature -- when the user is at home
  private onLoad() {
    this.transitionTl.pause()
    gsap.set(this.footer, { autoAlpha: 0 })
    gsap.set(this.header, { autoAlpha: 0 })
    this.subscriptions.add(
      navigationEvents$.pipe(filter((url) => !isHome(url))).subscribe(() => {
        gsap.set(this.footer, { autoAlpha: 1 })
        gsap.set(this.header, { autoAlpha: 1 })
      }),
    )
    const outerWrappers = gsap.utils.toArray(".outer")
    const innerWrappers = gsap.utils.toArray(".inner")
    requestAnimationFrame(() => {
      document.body.style.overflow = "hidden"
      gsap.set(
        this.sections.map((section) => section.element),
        { autoAlpha: 0 },
      )
      gsap.set(outerWrappers, { yPercent: 100 })
      gsap.set(innerWrappers, { yPercent: -100 })
    })
    const { hash } = window.location
    const target = document.getElementById(hash.substring(1))
    if (!this.initialized) {
      this.setupSections()
      this.wrapper = gsap.utils.wrap([...Array(this.sectionCount).keys()])
      this.setupObserver()
      this.setupFirstSection(!target)
    } else {
      // if there's a hash we need to transition to the correct section
      if (target) {
        const sectionTarget = this.sections.find((section) => section.content.includes(target))
        if (sectionTarget) {
          const index = this.sections.indexOf(sectionTarget)
          this.goToSection(index, index === this.sectionIndexLength ? Direction.UP : Direction.DOWN)
        }
      }
      this.initialized = true
    }
  }

  /**
   * @description Set up the first load of the Hero feature.
   * Filters out the emphasis targets and fades in the content.
   * Emphasis animations are handled in videoManager.ts.
   */
  private setupFirstSection(startImmediately: boolean = false) {
    const firstSection = this.sections[0]
    this.registerAnimation(this.blockbusterManager.timeline, firstSection.element)
    if (startImmediately) {
      this.currentIndex = 0
      this.goToSection(0, Direction.DOWN)
    }
  }

  /**
   * @param animation - The animation to register (gsap.core.Timeline)
   * @param key - The section element to register the animation with
   * @description Register an animation with a section element.
   */
  public registerAnimation(animation: gsap.core.Timeline, key: Element) {
    const section = this.sections.find((section) => section.element === key)
    if (section) {
      section.animation = section.animation ? section.animation.add(animation) : animation
    }
  }

  /**
   * @description Set up the Section objects for the Hero feature.
   */
  private setupSections() {
    // Get all section elements
    const sectionEls = gsap.utils.toArray("section.hero")
    this.sections = (sectionEls as Element[]).map((el, index) => {
      // Find the main containers
      const outerWrapper = el.querySelector(".outer")
      const innerWrapper = el.querySelector(".inner")
      const bg = el.querySelector(".hero__bg")

      // Get content elements, excluding structural wrappers
      const initialContent = getContentElements(el).filter(
        (element) => element !== outerWrapper && element !== innerWrapper && element !== bg,
      )
      const content = Array.from(new Set(initialContent))

      logger.info(`Setting up section ${index}`, { outerWrapper, innerWrapper, bg, content })

      return {
        index,
        element: el,
        outerWrapper,
        innerWrapper,
        bg,
        content,
        animation: gsap
          .timeline({
            paused: index !== 0, // Only play first section
            callbackScope: this,
          })
          .addLabel("start"),
      }
    }) as Section[]

    // Debug log the sections
    logger.info("Sections set up:", {
      count: this.sections.length,
      sections: this.sections.map((section) => ({
        index: section.index,
        elementId: section.element.id,
        contentCount: section.content.length,
        contentElements: section.content.map((el) => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
        })),
      })),
    })

    // Filter out ignored elements from first section
    const ignores = gsap.utils.toArray(this.config.fades.fadeInIgnore)
    this.sections[0].content = this.sections[0].content.filter(
      (content) => !ignores.includes(content) && this.isValidContentTarget(content),
    )

    this.sectionCount = this.sections.length
    this.sectionIndexLength = this.sectionCount - 1
  }
  /**
   * @description Transition to the next section based on the direction and whether the scenicRoute is enabled.
   * @param direction
   * @param scenicRoute
   * @returns
   */
  public async transition(direction: Direction, scenicRoute?: boolean) {
    let index = this.getNextIndex(direction)
    if (
      (direction === Direction.UP && this.currentIndex === 0) ||
      (direction === Direction.DOWN && this.currentIndex === this.sectionIndexLength)
    ) {
      return
    }
    if (!this.animating && !scenicRoute) {
      this.goToSection(index, direction)
    } else if (!this.animating && scenicRoute && direction === Direction.DOWN) {
      this.goToSection(index, direction)
      let remainingSections = this.sectionIndexLength - index

      while (remainingSections > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000))

        if (this.currentIndex !== this.sectionIndexLength && this.currentIndex === index) {
          this.goToSection(index + Direction.DOWN, direction)
          index++
          remainingSections--
        } else {
          break // Exit loop if condition fails
        }
      }
    }
    return
  }

  // Get the next index based on the direction
  private getNextIndex(direction: Direction): number {
    const nextIndex = this.wrapper(this.currentIndex + direction)

    // Add bounds checking
    if (nextIndex < 0) {
      return 0
    }
    if (nextIndex >= this.sectionCount) {
      return this.sectionCount - 1
    }

    return nextIndex
  }

  // Construct the transition timeline based on the direction and index
  // Uses registered effects from observerEffects.ts
  private constructTransitionTimeline(direction: Direction, index: number, tl: gsap.core.Timeline) {
    const section = this.sections[index]
    logger.info(
      `Timeline state: currentIndex=${this.currentIndex}, targetIndex=${index}, direction=${direction}, sectionsCount=${this.sectionCount}`,
    )

    if (this.currentIndex >= 0) {
      // the first time this runs, currentIndex will be -1
      logger.info(`Setting section ${this.currentIndex} to section ${index}`)
      tl.setSection({ direction, section })
    }
    logger.info(`Animating section ${index} in direction ${direction}`)
    tl.transitionSection({ direction, section })
    if (section.animation && section.animation.totalDuration() > 0) {
      tl.add(section.animation, ">")
    }

    logger.info(`Transition for section ${index} is set and will trigger now`)

    return tl
  }

  // Go to the next section based on the index and direction
  private goToSection(index: number, direction: Direction) {
    if (this.animating || index === this.currentIndex) {
      return
    }

    // Add bounds validation
    if (index < 0 || index >= this.sectionCount) {
      logger.warn(`Invalid section index: ${index}`)
      return
    }

    logger.info(`Going to section ${index} in direction ${direction}`)

    // Update currentIndex before creating timeline
    this.currentIndex = index

    let tl = gsap.timeline({
      defaults: {
        duration: this.config.slides.slideDuration,
        ease: "power2.inOut",
        onComplete: () => {
          this.animating = false
          logger.info(`Completed transition to section ${this.currentIndex}`)
        },
        onStart: () => {
          this.animating = true
        },
        callbackScope: this,
      },
    })

    tl = this.constructTransitionTimeline(direction, index, tl)
    this.transitionTl = tl

    if (!this.transitionTl.isActive()) {
      this.transitionTl.play()
    }
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
      return false
    }
    const section = this.sections.find((section) => section.content.includes(el))
    if (!section) {
      return false
    }
    return (
      el !== section.bg &&
      el !== section.outerWrapper &&
      el !== section.innerWrapper &&
      el !== section.element &&
      isValidElement(el, section.element)
    )
  }

  /**
   * @description Set up the Observers for the Hero feature. The Observers are created only when the user is at home. There are two Observers:
   * 1. The transitionObserver is the main Observer that handles all
   * perceived up/down interactions to trigger transitions between sections.
   * 2. The clickObserver handles the click-driven "guided tour" of the sections.
   */
  private setupObserver() {
    const clickTargets = gsap.utils.toArray(document.querySelectorAll(this.config.clickTargets))
    const ignoreTargets = gsap.utils.toArray(document.querySelectorAll(this.config.ignoreTargets))
    this.transitionObserver = Observer.create({
      type: "wheel,touch,pointer,scroll",
      wheelSpeed: -1,
      onDown: () => {
        this.transition(Direction.DOWN, false)
      },
      onUp: () => {
        this.transition(Direction.UP, false)
      },
      preventDefault: true,
      tolerance: 15,
      ignore: clickTargets as Element[],
    })
    this.transitionObserver.enable()
    this.clickObserver = Observer.create({
      type: "click",
      target: clickTargets as Element[],
      ignore: ignoreTargets as Element[],
      onClick: () => {
        this.transition(Direction.DOWN, true)
      },
      onRelease: () => {
        this.transition(Direction.DOWN, true)
      },
      preventDefault: true,
    })
    this.clickObserver.enable()
  }

  // Destroy the Observers and subscriptions
  public destroy() {
    if (this.transitionObserver) {
      this.transitionObserver.disable()
    }
    if (this.clickObserver) {
      this.clickObserver.disable()
    }
    this.subscriptions.unsubscribe()
  }
}
