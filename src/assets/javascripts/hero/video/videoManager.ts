import gsap from "gsap"
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  combineLatest,
  debounceTime,
  defer,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  exhaustMap,
  filter,
  from,
  fromEvent,
  map,
  merge,
  mergeAll,
  of,
  skipUntil,
  skipWhile,
  switchMap,
  take,
  tap,
} from "rxjs"
import { OBSERVER_CONFIG, STRONG_EMPHASIS_CONFIG, SUBTLE_EMPHASIS_CONFIG } from "~/config"
import { HeroStore, VideoState } from "~/state"
import { elementInDom, logger, parsePath, prefersReducedMotion$, setCssVariable } from "~/utils"
import { AnimateMessageConfig } from "../animations"
import { hide, show } from "../animations/utils"
import { plainLogo } from "./data"
import { TimelineManager } from "./timelineManager"
import { HeroVideo } from "./types"
import { getHeroVideos, toggleActiveClass } from "./utils"
import { VideoElement } from "./videoElement"

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$ } = customWindow

/**
 * @class VideoManager
 * @description A class to manage video elements and their sources.
 * NOTE: Use the class's pause(), play(), resume(), and stop() methods to control the
 * video, not the video element's or timeline's methods.
 */
export class VideoManager {
  private static instance: VideoManager | undefined

  private store = HeroStore.getInstance()

  private videoStore: HeroVideo[]

  // @ts-ignore - we delay initialization for home arrival
  private video: VideoElement

  // @ts-ignore - we delay initialization for home arrival
  public element: HTMLVideoElement

  // @ts-ignore - we delay initialization for home arrival
  public poster: HTMLPictureElement

  private parentContainer: HTMLDivElement =
    document.querySelector(".hero.first .hero__container") ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("hero__container")
      const parent =
        document.querySelector(".hero.first .hero__bg") ||
        (() => {
          const div = document.createElement("div")
          requestAnimationFrame(() => {
            document.getElementsByTagName("section")[0]?.getElementsByTagName("div")[2]?.append(div)
          })
          return div
        })()
      parent.append(div)
      return div
    })()

  private container: HTMLDivElement =
    (document.querySelector(".hero.first .media__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("media__container")
      requestAnimationFrame(() => {
        this.parentContainer.append(div)
      })
      return div
    })()

  private ctaContainer: HTMLDivElement =
    (document.querySelector(".cta__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("cta__container")
      requestAnimationFrame(() => {
        this.container.append(div)
      })
      return div
    })()

  public logo: HTMLImageElement = (() => {
    const logoContainer =
      document.querySelector(".hero.first .logo__container") ||
      (() => {
        const div = document.createElement("div")
        div.classList.add("logo__container")
        requestAnimationFrame(() => {
          this.container.append(div)
        })
        return div
      })()
    const img = document.createElement("img")
    const { innerWidth, innerHeight } = window
    img.src = plainLogo.href
    img.alt = "Plain License Logo"
    img.width = gsap.utils.clamp(48, innerWidth * 0.1, innerHeight * 0.05)
    img.height = img.width
    requestAnimationFrame(() => {
      logoContainer.appendChild(img)
      logger.debug("Logo created and appended:", img)
    })
    gsap.set(logoContainer, hide({ scale: 0, yPercent: 5 }))
    return img
  })()

  public initialized: boolean = false

  public hasPlayed: boolean = false

  public onFallback: boolean = false

  public canPlay: boolean = false

  // @ts-ignore - it is used in a callback
  private emphasisSet: boolean = false

  private videoDuration = () => {
    return this.element?.duration
  }

  private timeScale = () => {
    return 1 / this.videoDuration() || 1
  }

  public timelineManager: TimelineManager = new TimelineManager()

  private failCount: number = 0

  private vidDefaults: gsap.TimelineVars = {
    callbackScope: this,
    repeat: 0,
    duration: 1,
    paused: true,
  }

  private subscriptions: Subscription = new Subscription()

  // @ts-ignore - we delay initialization for home arrival
  private backupPicture: HTMLPictureElement

  public message: string = ""

  public textDuration: number = 10

  private textDefaults: AnimateMessageConfig = {
    sharedVars: {
      callbackScope: this,
      paused: true,
    },
    duration: this.textDuration,
    toVars: {},
    fromVars: {},
  }

  /**
   * @method initSubscriptions
   * @private
   * @description Initializes the subscriptions for the VideoManager
   */
  private initSubscriptions(): void {
    const { videoState$, state$ } = this.store

    const video$ = videoState$.pipe(
      distinctUntilKeyChanged("canPlay"),
      tap((state) => {
        logger.info("Received new video state", state)
        this.canPlay = state.canPlay
      }),
      filter((state) => state.canPlay),
      debounceTime(300),
    )

    const canplaythrough$ = defer(() =>
      fromEvent(this.element, "canplaythrough").pipe(
        filter((ev) => {
          return ev.target instanceof HTMLMediaElement
        }),
        map(({ target }) => {
          return target as HTMLMediaElement
        }),
        distinctUntilChanged(
          (prev, cur) => prev.currentSrc === cur.currentSrc && prev.duration === cur.duration,
        ),
      ),
    )

    const motionSub$ = defer(() =>
      prefersReducedMotion$.pipe(
        distinctUntilChanged((prev, cur) => prev === cur),
        skipUntil(videoState$),
        skipUntil(
          prefersReducedMotion$.pipe(filter((prefersReducedMotion) => prefersReducedMotion)),
        ),
        skipWhile((prefersReducedMotion) => prefersReducedMotion),
        distinctUntilChanged((prev, cur) => prev === cur),
        tap(() => {
          this.reinit()
        }),
      ),
    )

    const stallHandler$ = defer(() =>
      combineLatest([
        videoState$.pipe(filter((state) => state.canPlay === true)),
        fromEvent(this.element, "stalled"),
      ]).pipe(
        switchMap(() => {
          return canplaythrough$.pipe(
            filter(
              () => this.canPlay === true && this.element.readyState === 4 && !this.isPlaying(),
            ),
            exhaustMap(() => {
              logger.debug("Video can play through")
              if (!elementInDom(this.element)) {
                this.container.append(this.element)
              }
              if (!this.timelineManager.isActive() && !this.isPlaying()) {
                return of(this.play()).pipe(
                  tap(() => {
                    logger.info("Playing the video after stalled event")
                  }),
                )
              } else {
                return EMPTY
              }
            }),
            catchError((e) => {
              logger.error("Failed to play video", e)
              this.handleMediaError(e)
              return EMPTY
            }),
          )
        }),
      ),
    )

    const varSet$ = defer(() =>
      fromEvent(this.element, "loadedmetadata").pipe(
        filter((ev) => ev && ev.target instanceof HTMLMediaElement && elementInDom(ev.target)),
        map(({ target }) => target as HTMLMediaElement),
        take(1),
        tap((target) => {
          logger.info("Received loadedmetadata event")
          logger.debug("Video metadata:", target)
          logger.debug("Video rect:", target.getBoundingClientRect())
          if (this.onFallback) {
            return
          } else if (!target.getBoundingClientRect().height) {
            return
          }
          logger.debug(
            "Setting video dimensions from loadedmetadata event, " + this.videoDuration(),
          )
          this.setVideoDimensionVars()
        }),
      ),
    )

    const resize$ = defer(() =>
      this.store.state$.pipe(
        skipUntil(varSet$),
        map(({ viewport: { offset } }) => offset),
        distinctUntilKeyChanged("y"),
        debounceTime(500),
        distinctUntilChanged((previous, current) => {
          return Math.abs(previous.y - current.y) < 15
        }),
        switchMap(() => {
          return of(this.setVideoDimensionVars())
        }),
      ),
    )

    const errorHandler$ = defer(() => of(gsap.utils.toArray(this.element.children))).pipe(
      map((elementChildren) => elementChildren as HTMLElement[]),
      switchMap((elementChildren) => {
        return merge([
          fromEvent(this.element, "error", (event: Event) => event),
          fromEvent(elementChildren as HTMLElement[], "error", (event: Event) => event),
        ])
      }),
      mergeAll(),
      filter((ev: Event) => {
        return (
          ev.target instanceof HTMLMediaElement && (ev.target as HTMLMediaElement).error !== null
        )
      }),
      exhaustMap((ev: Event) => {
        const { error } = ev.target as HTMLMediaElement
        if (error) {
          return from(of(this.handleMediaError(error)))
        }
        return EMPTY
      }),
    )

    const secondaryObservables = [
      varSet$,
      stallHandler$,
      errorHandler$,
      resize$,
      motionSub$, // motionSub$ needs to be last
    ]

    const videoObserver = {
      next: (videoState: VideoState) => {
        logger.info("Received new video signal for canPlay: ", videoState.canPlay)
        logger.info("Manager Can play: ", this.canPlay)
        logger.info("Received can play signal")
        secondaryObservables.forEach((obs: Observable<any>, i: number) => {
          if (i !== secondaryObservables.length - 1) {
            // motionSub$ stays alive when others unsubscribe
            this.subscriptions.add(obs.subscribe())
          } else {
            obs.subscribe()
          }
        })
        !this.initialized && this.initVideo()
        this.handleCanPlay()
      },
      error: (err: any) => {
        logger.error("Video observer encountered an error:", err)
        this.reinit()
      },
      complete: () => {
        logger.info("Video observer completed")
        this.subscriptions.unsubscribe()
        this.subscriptions.add(video$.subscribe(videoObserver))
      },
    }

    const atHome$ = state$.pipe(
      map(({ atHome }) => atHome),
      filter((atHome) => !!atHome),
      exhaustMap(() => {
        if (!this.initialized) {
          logger.debug("At home signal received. Initializing video")
          gsap.set([this.container, this.poster], show())
          requestAnimationFrame(() => {
            if (!elementInDom(this.poster)) {
              this.container.append(this.poster)
            } else if (!elementInDom(this.backupPicture)) {
              this.container.append(this.backupPicture)
            }
          })
          return of(this.subscriptions.add(video$.subscribe(videoObserver)))
        }
        return EMPTY
      }),
    )

    this.subscriptions.add(atHome$.subscribe())
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    this.videoStore ??= getHeroVideos()
    this.video = new VideoElement(gsap.utils.random(this.videoStore))
    this.element = this.video.video
    gsap.set(this.element, hide())
    this.poster = this.video.picture
    const img = this.poster.querySelector("img")
    img && img.setAttribute("loading", "eager")
    this.backupPicture = this.video.backupPicture
    this.message = this.video.message || ""
    this.textDefaults["message"] = this.message
    if (!VideoManager.instance || !this.initialized) {
      logger.info("Initializing VideoManager")
      this.initSubscriptions()
    }
  }

  private initVideo(): void {
    if (this.videoStore.length === 0) {
      this.initiateFallback()
      throw new Error("No videos found")
    }
    gsap.set([this.container, this.parentContainer], show())
    requestAnimationFrame(() => {
      if (!this.container.getElementsByTagName("video").length) {
        this.container.append(this.element)
      }
      if (!this.container.getElementsByTagName("picture").length) {
        this.container.append(this.poster)
        this.container.append(this.backupPicture)
      }
    })
    gsap.to(this.poster, { ...show(), duration: 0.5 })

    const promises = []
    promises.push(
      new Promise(() => this.loadVideo())
        .then(() => {
          logger.info("Video loaded")
        })
        .catch((err) => {
          logger.error("Error loading video:", err)
          this.handleMediaError(err)
        }),
    )
    promises.push(new Promise(() => this.mediaTimeline()))
    promises.push(new Promise(() => this.buildTextTimeline()))
    Promise.all(promises)
      .then(() => {
        logger.info("VideoManager initialized")
      })
      .catch((err) => {
        logger.error("Error initializing VideoManager:", err)
      })
    this.initialized = true
    this.debugDump()
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private okToPlay(): boolean {
    return this.canPlay && !this.onFallback && !this.isPlaying() && !this.otherTimelineActive()
  }

  private loadVideo(): void {
    this.subscriptions.add(
      document$.subscribe(() => {
        this.subscriptions.add(
          from(new Promise(() => this.element.load()))
            .pipe(
              filter(() => this.element.readyState === 4 && this.okToPlay()),
              catchError((err) => {
                this.handleMediaError(err)
                return EMPTY
              }),
            )
            .subscribe(() => {
              logger.info("Video loaded successfully")
              this.handleCanPlay()
            }),
        )
      }),
    )
  }

  private exchangePosters(activeEl: HTMLPictureElement, inactiveElement: HTMLPictureElement): void {
    if (activeEl === inactiveElement) {
      toggleActiveClass(activeEl, "hero__poster", true)
      return
    } else if (activeEl === this.poster) {
      toggleActiveClass(activeEl, "hero__poster", true)
      toggleActiveClass(inactiveElement, "hero__backup", false)
      return
    } else {
      activeEl.classList.replace("hero__backup", "hero__poster")
      activeEl.classList.replace("hero__backup--inactive", "hero__poster--active")
      inactiveElement.classList.replace("hero__poster", "hero__backup")
      inactiveElement.classList.replace("hero__poster--active", "hero__backup--inactive")
    }
  }

  private handleCanPlay(): void {
    this.canPlay = true
    logger.info("Handling can play event")
    if (!this.okToPlay()) {
      return
    }
    if (
      !elementInDom(this.element) ||
      !elementInDom(this.poster) ||
      this.element.readyState === 0
    ) {
      this.initVideo()
    } else if (this.element.readyState === 4) {
      this.foulPlay()
    }
  }

  /*================== Animations =================*/

  private animateText(overrideVars: AnimateMessageConfig = {}): GSAPTimeline {
    const tl = gsap.timeline(this.textDefaults.sharedVars as gsap.TimelineVars)
    return tl
      .set(".text-animation__container", show())
      ["animateMessage"](".text-animation__container", {
        message: this.message,
        ...overrideVars,
      })
  }

  private buildTextTimeline() {
    const textTimeline = gsap
      .timeline([
        "textTimeline",
        {
          ...this.textDefaults.sharedVars,
          onStart: () => {
            logger.debug("Text animation timeline started")
            this.hasPlayed = true
          },
          onComplete: () => {
            logger.debug("Text animation timeline completed")
            // Prepare the video for the next cycle
          },
        },
      ])
      .timeScale(1)
      .add(this.animateText(this.textDefaults), 0)
      .add(() => {
        logger.info("Text timeline completed")
        logger.debug("Setting up for next cycle")
        if (!this.emphasisSet) {
          this.setEmphasisAnimations()
        }
      })
    this.timelineManager.add(textTimeline)
  }

  private setEmphasisAnimations(): GSAPTimeline {
    const { subtle, strong } = OBSERVER_CONFIG.emphasisTargets
    const subtleTargets = gsap.utils.toArray(subtle)
    const strongTargets = gsap.utils.toArray(strong)
    const tl = gsap.timeline([
      "emphasisTimeline",
      {
        repeat: -1,
        paused: false,
        delay: 2,
        repeatDelay: 2,
        defaults: { repeat: -1, paused: false },
        callbackScope: this,
        onStart: () => {
          this.emphasisSet = true
        },
      },
    ])
    if (subtleTargets.length) {
      tl.add(["subtleEmphasis", tl["emphasize"](subtleTargets, SUBTLE_EMPHASIS_CONFIG), ">"], ">")
    }
    if (strongTargets.length) {
      tl.add(
        ["strongEmphasis", tl["emphasize"](strongTargets, STRONG_EMPHASIS_CONFIG), ">"],
        ">=0.5",
      )
    }
    return tl
  }

  private alreadyTransitioned(revert: boolean = false): boolean {
    return (
      (revert && this.poster.classList.contains("hero__poster--active")) ||
      (!revert && this.element.classList.contains("hero__video--active"))
    )
  }

  private transitionToVideo(revert: boolean = false): void {
    if (this.alreadyTransitioned(revert)) {
      return
    }
    if (this.onFallback) {
      return
    }
    gsap.to(revert ? this.element : this.poster, { ...hide(), duration: 0.5 })
    gsap.to(revert ? this.poster : this.element, { ...show(), duration: 0.5 })
    gsap.set(this.container, { contentVisibility: "visible" })
    gsap.set(revert ? this.element : this.poster, hide())
    gsap.set(revert ? this.poster : this.element, show())
    toggleActiveClass(this.element, "hero__video", !revert)
    toggleActiveClass(this.poster, "hero__poster", revert)
  }

  /**
   * Creates a GSAP timeline that synchronizes with a media element.
   * This allows for animations to be timed with the media playback.
   * *slightly modified from https://gsap.com/community/forums/topic/22234-control-video-html-tag/#comment-187059 thanks Jack!*
   */
  private mediaTimeline() {
    const config = this.vidDefaults
    const existingOnStart = config.onStart
    const existingOnComplete = config.onComplete
    const toggleHeadings = (vis: boolean) => {
      gsap.set(".cta__container h2", vis ? { ...show(), duration: 0.5 } : { ...hide() })
      gsap.set(".cta__container h1", vis ? { ...show(), duration: 0.5 } : { ...hide() })
    }
    const existingOnUpdate = config && config.onUpdate

    const tl = gsap.timeline([
      "videoTimeline",
      {
        ...config,
        duration: 1,
        onStart: () => {
          existingOnStart && existingOnStart()
          updateDuration()

          this.transitionToVideo()
          gsap.set([this.element, this.container, this.ctaContainer], {
            ...show(),
            duration: 0.3,
          })
          toggleHeadings(true)
          if (!this.isPlaying()) {
            this.foulPlay()
          }
        },
        onComplete: () => {
          existingOnComplete && existingOnComplete()
          gsap.set([this.element, this.ctaContainer], { ...hide(), duration: 0.5 })
          toggleHeadings(false)
          toggleActiveClass(this.element, "hero__video", false)
          this.hasPlayed = true
        },
        callbackScope: this,
        paused: true,
        onUpdate: () => {
          if (
            tl.paused() ||
            Math.abs(tl.time() * this.videoDuration() - this.element.currentTime) > 0.5
          ) {
            this.element.currentTime = tl.time() * this.videoDuration()
          }
          existingOnUpdate && existingOnUpdate()
        },
      },
    ])
    const updateDuration = () => {
      tl.timeScale(this.timeScale())
    }
    // Store original timeline methods for wrapping
    const originalPause = tl.pause.bind(tl)
    const originalPlay = tl.play.bind(tl)
    const originalRestart = tl.restart.bind(tl)
    const originalSeek = tl.seek.bind(tl)

    tl.set({}, {}, 0)
    tl["media"] = this.element || document.querySelector(".hero__video")
    tl["foulPlay"] = this.foulPlay.bind(this)

    // Setup element event listeners
    this.element.addEventListener("durationchange", updateDuration)
    updateDuration()
    this.element.onplay = () => {
      if (!tl.isActive()) {
        tl.play()
      }
    }
    this.element.onpause = () => {
      if (tl.isActive()) {
        tl.pause()
      }
    }
    this.element.ontimeupdate = () => {
      tl.time(this.relativeToDuration(), true)
    }
    this.element.oncanplaythrough = () => {
      if (this.okToPlay()) {
        tl.play()
      }
    }
    this.element.onended = () => {
      logger.info("Video ended event triggered")
      logger.debug(
        `Video ended at ${tl["media"].currentTime} \n Video duration: ${this.videoDuration()} \n Timeline time: ${tl.time()} \n Timeline duration: ${tl.duration()} \n Timeline progress: ${tl.progress()} \n Timeline paused: ${tl.paused()} \n Timeline isActive: ${tl.isActive()}`,
      )
      if (tl && tl.progress() !== 1 && !this.timelineManager.isTransitioning) {
        tl.progress(1, true).eventCallback("onComplete")()
      }
    }
    this.element.onloadedmetadata = () => {
      updateDuration()
    }
    this.element.onwaiting = () => {
      updateDuration()
      if (tl.isActive()) {
        tl.pause()
      }
    }
    tl.pause = (...args: any[]) => {
      tl["media"].pause()
      originalPause(...args)
      return tl
    }
    tl.play = (...args: any[]) => {
      tl["foulPlay"]()
      originalPlay(...args)
      if (args.length) {
        tl["media"].currentTime = args[0] as number
      }
      return tl
    }
    tl.restart = (...args: any[]) => {
      originalRestart(...args)
      if (args.length) {
        setTimeout(() => tl["media"].play(), args[0] as number)
      }
      return tl
    }
    tl.seek = (position: any, suppressEvents?: boolean) => {
      originalSeek(position, suppressEvents)
      if (position !== undefined) {
        tl["media"].currentTime = position * tl["media"].duration
      }
      tl.time(position / tl["media"].duration || 0, suppressEvents ?? true)
      return tl
    }
    tl.timeScale(this.timeScale())
    this.timelineManager.add(tl)
  }
  // Updated portion starting with handleMediaError

  /*=============================================*/
  /* Error handling and tear down */

  private handleMediaError(error: MediaError): void {
    if (!this.okToPlay()) {
      return
    }
    const errorActions: Record<number, () => void> = {
      1: () => setTimeout(() => this.play(), 2000),
      2: () => {
        logger.error("Video element encountered an error. Network error.")
        try {
          this.element.load()
        } catch (err) {
          logger.error("Failed to reload video element.", err)
        }
        this.tryNewSource()
      },
      3: () => {
        logger.error("Video element encountered an error. Decoder error.")
        this.tryNewSource()
      },
      4: () => {
        logger.error("Video element encountered an error. Source error.")
        this.tryNewSource()
      },
    }
    if (errorActions[error.code]) {
      errorActions[error.code]()
    } else {
      logger.error("Video element encountered an error.", error)
      Promise.resolve(this.tryNewSource()).catch(() => this.initiateFallback())
    }
  }

  // Simplified foulPlay: triggers video transition and plays the video
  private foulPlay = (): void => {
    if (!this.okToPlay()) {
      return
    }
    this.transitionToVideo()
    this.element
      .play()
      .then(() => this.beginPlay())
      .catch((error) => {
        logger.error("Error occurred during playback:", error)
        if (!this.timelineManager.isTransitioning && !this.onFallback) {
          this.timelineManager.restart().pause()
          this.addPlayOnInteraction()
        }
      })
  }

  private otherTimelineActive(): boolean {
    return this.timelineManager.timelines.some(
      (tl) => tl.isActive() && tl !== this.timelineManager.video() && tl.duration() !== tl.time(),
    )
  }

  private beginPlay(): void {
    if (this.timelineManager.timelines.length && !this.timelineManager.isActive()) {
      if (this.isPlaying() && !this.timelineManager.isActive()) {
        this.timelineManager.play()
      } else if (
        !this.isPlaying() &&
        this.timelineManager.isActive() &&
        !this.otherTimelineActive()
      ) {
        this.element.play()
        logger.debug("Playing video and timeline")
        this.debugDump()
      }
      if (
        this.timelineManager.currentTimeline?.["media"] &&
        !this.timelineManager.currentTimeline?.duration()
      ) {
        this.timelineManager.currentTimeline.duration(1)
        this.timelineManager.currentTimeline.time(this.timeScale() * this.element.currentTime)
        this.timelineManager.currentTimeline.timeScale(this.timeScale())
      }
    }
    this.setVideoDimensionVars()
    document.removeEventListener("click", this.addPlayOnInteraction)
    document.removeEventListener("touchstart", this.addPlayOnInteraction)
  }

  private addPlayOnInteraction = (): void => {
    const playOnInteraction = () => {
      this.element
        .play()
        .then(() => this.beginPlay())
        .catch((e) => {
          if (this.hasPlayed || this.onFallback || this.otherTimelineActive()) {
            return
          }
          this.failCount++
          logger.error("Failed to play on interaction", e)
          document.removeEventListener("click", playOnInteraction)
          document.removeEventListener("touchstart", playOnInteraction)
          if (this.failCount > 10 && !this.hasPlayed) {
            this.initiateFallback()
          }
        })
    }
    try {
      const evt = new Event("click", { bubbles: true, cancelable: true })
      this.element.dispatchEvent(evt)
    } catch (error) {
      logger.error("Error creating event:", error)
    }
    this.element
      .play()
      .then(() => this.beginPlay())
      .catch(() => {
        this.transitionToVideo(true)
        document.addEventListener("click", playOnInteraction)
        document.addEventListener("touchstart", playOnInteraction)
        logger.info("Added play on interaction listeners")
      })
  }

  private setVideoDimensionVars(): void {
    if (!this.onFallback && this.canPlay && this.element.readyState >= 3) {
      const { height, width, left } = this.element.getBoundingClientRect()
      if (height && width) {
        const absoluteLeft = left + window.scrollX
        setCssVariable("--video-height", `${height}px`)
        setCssVariable("--video-width", `${width}px`)
        setCssVariable("--video-left", `${absoluteLeft}px`)
        logger.debug(`Set video dimensions: ${width}x${height}, ${absoluteLeft}`)
      }
    }
  }

  private tryNewSource(): void {
    logger.info("Switching codec...")
    const { currentSrc } = this.element
    const parsedSrc = parsePath(currentSrc)
    const { name } = parsedSrc
    if (name.includes("av1")) {
      logger.info("Switching to vp9 codec")
      this.element.src = currentSrc.replace("av1", "vp9")
    } else if (name.includes("vp9")) {
      logger.info("Switching to h264 codec")
      this.element.src = currentSrc.replace("vp9", "h264")
    } else {
      logger.error("No more codecs to switch to. Initiating fallback.")
      this.initiateFallback()
      return
    }
    this.transitionToVideo(true)
    this.element.load()
    fromEvent(this.element, "canplaythrough").subscribe(() => {
      this.element
        .play()
        .then(() => this.beginPlay())
        .catch(() => {
          this.timelineManager.restart().pause()
          this.addPlayOnInteraction()
        })
    })
  }

  private loadBackup(): void {
    requestAnimationFrame(() => {
      if (!elementInDom(this.backupPicture)) {
        this.container.append(this.backupPicture)
      }
    })
    this.exchangePosters(this.backupPicture, this.poster)
    gsap.to(this.backupPicture, { ...show(), duration: 1 })
    logger.info("Backup loaded and set to visible:", this.backupPicture)
  }

  private initiateFallback(): void {
    if (this.onFallback) {
      return
    }
    this.loadBackup()
    const newTl = gsap.timeline({ paused: false, defaults: { repeat: 0 } })
    newTl
      .add(["fallback", gsap.set(this.element, { ...hide(), duration: 0.5 })], 0)
      .call(() => {
        requestAnimationFrame(() => {
          toggleActiveClass(this.element, "hero__video", false)
          if (elementInDom(this.element)) {
            this.container.removeChild(this.element)
          }
        })
      })
      .set(this.container, show())
      .set(gsap.utils.toArray("*", this.ctaContainer), show())
      .to(this.backupPicture, { ...show(), duration: 1 })
    newTl.add(this.setEmphasisAnimations(), 5)
    this.timelineManager.kill()
    newTl.play()
    this.subscriptions.unsubscribe()
    logger.info("Initiated fallback")
  }

  private reinit(): void {
    this.timelineManager.kill()
    VideoManager.instance = undefined
    VideoManager.getInstance()
  }

  private debugDump(): void {
    const videoTl = this.timelineManager.video()
    const textTl = this.timelineManager.text()
    logger.debug("Debugging VideoManager State", {
      currentTime: this.element.currentTime,
      isPlaying: this.isPlaying(),
      okToPlay: this.okToPlay(),
      canPlay: this.canPlay,
      hasPlayed: this.hasPlayed,
      onFallback: this.onFallback,
      otherTimelineActive: this.otherTimelineActive(),
    })
    logger.debug("Debugging VideoManager timelines:", {
      timelineManager: this.timelineManager,
      textTimeline: textTl || null,
      videoTimeline: videoTl || null,
      managerDuration: this.timelineManager.timelinesDuration,
      currentTimescale: this.timelineManager.currentTimeline?.timeScale(),
      vidDuration: videoTl?.duration(),
      vidTimeScale: videoTl?.timeScale(),
      textDuration: textTl?.duration(),
      textTimeScale: textTl?.timeScale(),
      videoElCurrentTime: this.element.currentTime,
      videoElDuration: this.element.duration,
    })
  }

  /*=============================================*/
  /* Public convenience methods */

  public isPlaying(): boolean {
    return (
      this.element &&
      elementInDom(this.element) &&
      this.element.duration > 0 &&
      this.element.currentTime > 0 &&
      !this.element.paused &&
      !this.element.ended
    )
  }

  public relativeToDuration(realTime: number = this.element.currentTime): number {
    return realTime / this.videoDuration()
  }

  public timeLeft(): number {
    return this.videoDuration() - this.element.currentTime
  }

  public play(): void {
    if (!this.timelineManager.isActive()) {
      this.timelineManager.play()
    }
  }

  public pause(): void {
    if (this.onFallback) {
      return
    }
    this.timelineManager.pause()
  }

  public resume(): void {
    if (this.onFallback || !this.canPlay) {
      return
    }
    if (!this.timelineManager.isActive()) {
      this.timelineManager.resume()
    }
  }

  public restart(): void {
    this.timelineManager.restart().play()
  }

  public seek(time: number): void {
    this.timelineManager.seek(time)
    this.updateVideoTime()
  }

  private updateVideoTime(): void {
    if (this.element && this.timelineManager.currentTimeline) {
      const currentTime = this.timelineManager.currentTimeline.time() ?? 0
      this.element.currentTime = currentTime
    }
  }
}
