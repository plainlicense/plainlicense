import { BehaviorSubject, distinctUntilChanged, filter, map, shareReplay, Subscription } from "rxjs"
import { HeroState, HeroStore } from "~/state"
import { isDev, logger, generateNonVisibleElementReport } from "~/utils"
import { NotVisibleReport } from "~/utils/types"

export class AnimationDebugger {
  private static isDebugging: boolean = isDev(new URL(window.location.href))

  private store: HeroStore = HeroStore.getInstance()

  public animationState$ = new BehaviorSubject<Partial<HeroState>>({
    landingVisible: false,
    canPlay: false,
    isTransitioning: false,
  })

  private subscriptions: Subscription = new Subscription()

  constructor() {
    if (AnimationDebugger.isDebugging) {
      logger.info("AnimationDebugger is enabled")
      this.initSubscriptions()
    } else {
      logger.info("AnimationDebugger is disabled")
    }
  }

  private checkForNonVisibleElements(section?: number) {
    if (typeof section === "number" && section > -1) {
      return generateNonVisibleElementReport(
        Array.from(document.querySelectorAll("section"))[section],
      )
    } else {
      return
    }
  }

  private parseNonVisibleElementReport(reports: NotVisibleReport[]) {
    reports.forEach((report) => {
      const { element } = report
      const { id, classList } = element
      const identifier = id || classList[0]
      const { reason } = report
      if (reason && reason.length) {
        reason?.forEach((r) => {
          this.handleReason(r, identifier, element)
        })
      }
    })
  }

  private checkFixWithUser(element: HTMLElement, fix: string) {
    const response = window.prompt(
      `Tried fixing element ${element} by setting ${fix}. Can you see it now? (yes/no)`,
    )
    if (response === "yes") {
      return true
    } else {
      return false
    }
  }

  private testFixesForVisibility(element: HTMLElement, reason: keyof NotVisibleReport) {
    logger.info(`Attempting to fix visibility for element: ${element}`)
    let userResponse
    switch (reason) {
      case "noBox":
        element.style.display = "block"
        userResponse = this.checkFixWithUser(element, "display to block")
        if (userResponse) {
          logger.info(`Element ${element} is now visible after applying display: block`)
        } else {
          logger.warn(`Element ${element} is still not visible after applying display: block`)
        }
        break
      case "parentHidden":
        if (element.parentElement) {
          element.parentElement.style.display = "block"
          userResponse = this.checkFixWithUser(element, "parent display to block")
          if (userResponse) {
            logger.info(`Element ${element} is now visible after applying parent display: block`)
          } else {
            logger.warn(
              `Element ${element} is still not visible after applying parent display: block`,
            )
            logger.info(`Attempting to set parent to visible`)
            element.parentElement.style.visibility = "visible"
            userResponse = this.checkFixWithUser(element, "parent visibility to visible")
            if (userResponse) {
              logger.info(
                `Element ${element} is now visible after applying parent visibility: visible`,
              )
            } else {
              logger.warn(
                `Element ${element} is still not visible after applying parent visibility: visible`,
              )
            }
          }
        } else {
          logger.warn(`Element ${element} has no parent`)
        }
        break
      case "contentVisibilityAuto":
      case "contentVisibilityHidden":
        element.style.contentVisibility = "visible"
        userResponse = this.checkFixWithUser(element, "contentVisibility to visible")
        if (userResponse) {
          logger.info(`Element ${element} is now visible after applying contentVisibility: visible`)
        } else {
          logger.warn(
            `Element ${element} is still not visible after applying contentVisibility: visible`,
          )
        }
        break
      case "opacityZero":
        element.style.opacity = "1"
        userResponse = this.checkFixWithUser(element, "opacity to 1")
        if (userResponse) {
          logger.info(`Element ${element} is now visible after applying opacity: 1`)
        } else {
          logger.warn(`Element ${element} is still not visible after applying opacity: 1`)
        }
        break
      case "visibilityHidden":
        element.style.visibility = "visible"
        userResponse = this.checkFixWithUser(element, "visibility to visible")
        if (userResponse) {
          logger.info(`Element ${element} is now visible after applying visibility: visible`)
        } else {
          logger.warn(`Element ${element} is still not visible after applying visibility: visible`)
        }
        break
      default:
        logger.warn(`Element ${element} is not visible for an unknown reason`)
        break
    }
  }

  private checkWithUserToProceed(
    reason: keyof NotVisibleReport,
    identifier: string,
    element: HTMLElement,
  ) {
    const response = window.prompt(
      `Element ${identifier} is not visible. Reason: ${reason}. Do you
      want to try to make it visible? (yes/no)

      full element info: ${element.toString()}`,
    )
    if (response === "yes") {
      return true
    } else {
      return false
    }
  }

  private handleReason(reason: keyof NotVisibleReport, identifier: string, element: HTMLElement) {
    const response = this.checkWithUserToProceed(reason, identifier, element)
    if (response) {
      this.testFixesForVisibility(element, reason)
    } else {
      logger.info(`User chose not to attempt to fix visibility for element ${element}`)
      return
    }
  }

  private initSubscriptions() {
    const state$ = this.store.state$.pipe(
      map((state) => {
        // sourcery skip: inline-immediately-returned-variable
        const { landingVisible, canPlay, isTransitioning, currentSection } = state
        return { landingVisible, canPlay, isTransitioning, currentSection }
      }),
      shareReplay(1),
    )
    distinctUntilChanged((prev: Partial<HeroState>, curr: Partial<HeroState>) => {
      return (
        prev.landingVisible === curr.landingVisible &&
        prev.canPlay === curr.canPlay &&
        prev.isTransitioning === curr.isTransitioning &&
        prev.currentSection === curr.currentSection
      )
    })
    this.subscriptions.add(
      state$.subscribe({
        next: (state) => {
          this.animationState$.next(state)
        },
        error: (error) => {
          logger.error("Error in AnimationDebugger observable: ", error)
        },
        complete: () => {
          logger.info("AnimationDebugger observable complete")
        },
      }),
    )

    const sectionWatch$ = this.animationState$.pipe(
      filter(
        (state) =>
          state.currentSection !== undefined &&
          state.currentSection > -1 &&
          state.isTransitioning === false,
      ),
      map((state) => state.currentSection),
      distinctUntilChanged(),
    )

    this.subscriptions.add(
      sectionWatch$.subscribe({
        next: (currentSection) => {
          const report = this.checkForNonVisibleElements(currentSection)
          logger.info("Received new section: ", currentSection)
          if (report) {
            this.parseNonVisibleElementReport(report)
          } else {
            logger.info("No non-visible elements found in section: ", currentSection)
          }
        },
        error: (error) => {
          logger.error("Error processing section updates: ", error)
        },
        complete: () => {
          logger.info("Section watch observable completed")
        },
      }),
    )
  }
}
