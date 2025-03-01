import gsap from "gsap"
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  combineLatest,
  debounceTime,
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
import {
  BACKUP_PICTURE,
  OBSERVER_CONFIG,
  STRONG_EMPHASIS_CONFIG,
  SUBTLE_EMPHASIS_CONFIG,
  VIDEO_END_BUFFER,
} from "~/config"
import { HeroStore } from "~/state"
import { elementInDom, logger, parsePath, prefersReducedMotion$, setCssVariable } from "~/utils"
import { HeroVideo, VideoStatus } from "./types"
import { getHeroVideos, toggleActiveClass } from "./utils"
import { VideoElement } from "./videoElement"
import { plainLogo } from "./data"
import { SectionIndex } from "../animations"

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$ } = customWindow

/**
 * @class VideoManager
 * @description A class to manage video elements and their sources.
 ** NOTE: Use the class's pause(), play(), resume(), and stop() methods to control the
 ** video, not the video element's or timeline's methods.
 * @method @static getInstance - Returns the singleton instance of the VideoManager
 * @method play - Plays the video and timeline
 * @method pause - Pauses the video and timeline
 * @method resume - Resumes the video and timeline
 * @method stop - Stops the video and timeline (resets to the beginning)
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

  private container: HTMLDivElement =
    (document.querySelector(".hero.first .media__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("media__container")
      const parent = document.querySelector(".hero.first .hero__bg")
      parent?.append(div)
      return div
    })()

  private ctaContainer: HTMLDivElement =
    (document.querySelector(".cta__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("cta__container")
      this.container.append(div)
      return div
    })()

  public logo: HTMLDivElement = (() => {
    const div = document.createElement("div") as HTMLDivElement
    div.classList.add("hero__logo")
    const parent = document.querySelector(".hero.first .logo__container") || this.container
    logger.debug("logo parent:", parent)
    parent.appendChild(div)
    const img = document.createElement("img")
    const { innerWidth, innerHeight } = window
    img.src = plainLogo.href
    img.alt = "Plain License Logo"
    img.width = gsap.utils.clamp(48, innerWidth * 0.1, innerHeight * 0.05)
    img.height = img.width
    div.appendChild(img)
    gsap.set(div, { autoAlpha: 0, scale: 0, yPercent: 5 })
    logger.debug("Logo created and appended:", img)
    return div
  })()

  public hasPlayed: boolean = false

  public status: VideoStatus = "not_initialized"

  public canPlay: boolean = false

  private get videoDuration(): number {
    return this.element?.duration ?? VIDEO_END_BUFFER
  }

  private get titleStart(): number {
    return Math.max(this.videoDuration - VIDEO_END_BUFFER + 0.5, VIDEO_END_BUFFER + 0.5)
  }

  public videoTimeline: GSAPTimeline = gsap.timeline({
    defaults: { paused: true, callbackScope: this },
    paused: true,
    callbackScope: this,
    duration: () => {
      return this.titleStart
    },
    onStart: () => {
      this.transitionToVideo()
      this.element.currentTime = 0
      this.element.play()
      this.status = "playing"
    },
    onPaused: () => {
      this.status = "paused"
      this.element.pause()
    },
    onComplete: () => {
      this.status = "on_textAnimation"
      this.element.pause()
    },
    repeat: 0,
    ease: "none",
  })

  public textAnimationTimeline: GSAPTimeline = gsap.timeline({
    defaults: { paused: true, repeat: 0, callbackScope: this },
    paused: true,
    callbackScope: this,
    repeat: 0,
    onStart: () => {
      logger.debug("Text animation timeline started")
      this.hasPlayed = true
      this.status = "on_textAnimation"
      this.videoTimeline.restart().pause()
      this.element.pause()
      this.element.currentTime = 0
      gsap.set(this.element, { autoAlpha: 0 })
    },
    onComplete: () => {
      logger.debug("Text animation timeline completed")
      this.status = "playing"
    },
  })

  public masterTimeline: GSAPTimeline = gsap
    .timeline({
      callbackScope: this,
      repeat: -1,
      paused: true,
      label: "masterTimeline",
      onStart: () => {
        if (!this.isPlaying()) {
          this.foulPlay()
        }
      },
      onRepeat: () => {
        if (!this.isPlaying()) {
          this.foulPlay()
        }
      },
      onComplete: () => {
        toggleActiveClass(this.element, "hero__video", true)
        this.element.currentTime = 0
        this.foulPlay()
        this.masterTimeline.restart()
        this.setEmphasisAnimations().play()
      },
    })
    .addLabel("videoTimeline", 0)
    .addLabel("textTimeline", this.titleStart)

  private subscriptions: Subscription = new Subscription()

  // @ts-ignore - we delay initialization for home arrival
  private backupPicture: HTMLPictureElement

  public message: string = ""

  /**
   * @method initSubscriptions
   * @private
   * @description Initializes the subscriptions for the VideoManager
   */
  private initSubscriptions(): void {
    const { videoState$, state$ } = this.store

    const video$ = state$.pipe(
      // change from this.store.state$ to state$
      skipUntil(videoState$),
      distinctUntilKeyChanged("canPlay"),
      tap(({ canPlay }) => {
        logger.info("video manager video$ observable received new value", canPlay)
      }),
      map(({ canPlay }) => {
        return canPlay
      }),
    )

    const statusSetter$ = state$.pipe(
      map(({ canPlay, prefersReducedMotion, currentSection }) => ({
        canPlay,
        prefersReducedMotion,
        currentSection,
      })),
      tap(({ prefersReducedMotion }) =>
        this.handleReducedMotion.bind(this)({ prefersReducedMotion }),
      ),
      distinctUntilChanged(
        (prev, cur) => prev.canPlay === cur.canPlay && prev.currentSection === cur.currentSection,
      ),
      debounceTime(100),
      tap(({ prefersReducedMotion, currentSection, canPlay }) => {
        if (prefersReducedMotion || this.status === "on_fallback") {
          return
        }

        this.status = this.determineVideoStatus(canPlay, currentSection)
      }),
    )

    const canplaythrough$ = fromEvent(this.element, "canplaythrough").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      map(({ target }) => {
        return target as HTMLMediaElement
      }),
      distinctUntilChanged(
        (prev, cur) => prev.currentSrc === cur.currentSrc && prev.duration === cur.duration,
      ),
    )

    const play$ = canplaythrough$.pipe(
      filter(() => this.canPlay === true && this.element.readyState === 4 && !this.isPlaying()),
      exhaustMap(() => {
        logger.debug("Video can play through")
        this.transitionToVideo()
        return of(this.foulPlay())
      }),
      catchError((e) => {
        logger.error("Failed to play video", e)
        this.handleMediaError(e)
        return EMPTY
      }),
    )
    // we handle the very unlikely edge case of someone turning off prefersReducedMotion while on site; we handle the normal case in statusSetter$
    const motionSub$ = prefersReducedMotion$.pipe(
      distinctUntilChanged(),
      skipUntil(videoState$),
      skipUntil(prefersReducedMotion$.pipe(filter((prefersReducedMotion) => prefersReducedMotion))), // skip until we get a reduced signal
      skipWhile((prefersReducedMotion) => prefersReducedMotion), // then skip until we don't get one again
      distinctUntilChanged(),
      tap(() => {
        this.reinit()
      }),
    )

    const stallHandler$ = combineLatest([
      videoState$.pipe(filter((state) => state.canPlay === true)),
      fromEvent(this.element, "stalled"),
    ]).pipe(
      switchMap(() => {
        return canplaythrough$.pipe(
          filter(() => this.canPlay === true && this.element.readyState === 4 && !this.isPlaying()),
          exhaustMap(() => {
            logger.debug("Video can play through")
            if (!elementInDom(this.element)) {
              this.container.append(this.element)
            }
            this.transitionToVideo()
            return of(this.foulPlay())
          }),
          catchError((e) => {
            logger.error("Failed to play video", e)
            this.handleMediaError(e)
            return EMPTY
          }),
        )
      }),
    )

    const varSet$ = fromEvent(this.element, "loadedmetadata").pipe(
      filter((ev) => ev && ev.target instanceof HTMLMediaElement && elementInDom(ev.target)),
      map(({ target }) => target as HTMLMediaElement),
      take(1),
      tap((target) => {
        logger.info("Received loadedmetadata event")
        logger.debug("Video metadata:", target)
        logger.debug("Video rect:", target.getBoundingClientRect())
        if (this.status === "on_fallback") {
          return
        } else if (!target.getBoundingClientRect().height) {
          return
        }
        logger.debug("Setting video dimensions from loadedmetadata event, " + this.videoDuration)
        this.setVideoDimensionVars()
        this.videoDuration
        this.titleStart
        this.syncToVideo()
      }),
    )

    const resize$ = this.store.state$.pipe(
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
    )

    const elementChildren = gsap.utils.toArray(this.element.children)
    const errorHandler$ = merge([
      fromEvent(this.element, "error", (event: Event) => event),
      fromEvent(elementChildren as HTMLElement[], "error", (event: Event) => event),
    ]).pipe(
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

    const playing$ = fromEvent(this.element, "playing").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        logger.debug("Received playing event")
        if (!this.isPlaying()) {
          this.foulPlay()
        }
        if (!this.masterTimeline.isActive()) {
          this.masterTimeline.play()
          this.syncToVideo()
        }
        this.status = "playing"
        toggleActiveClass(this.poster, "hero__poster", false)
        toggleActiveClass(this.element, "hero__video", true)
        logger.info("Received playing event")
        this.setVideoDimensionVars()
      }),
    )

    const waiting$ = fromEvent(this.element, "waiting").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        logger.info("Received waiting event")
      }),
      filter(
        () =>
          this.canPlay === true &&
          this.status !== "playing" &&
          this.status !== "on_fallback" &&
          this.element.readyState === 4,
      ),
      switchMap(() => play$),
    )

    const secondaryObservables = [
      varSet$,
      motionSub$,
      stallHandler$,
      errorHandler$,
      play$,
      playing$,
      resize$,
      waiting$,
    ]

    const videoObserver = {
      next: (canPlay: boolean) => {
        logger.info("Received new video signal for canPlay: ", canPlay)
        if (typeof canPlay !== "boolean") {
          logger.error("Video observer received invalid signal:", canPlay)
          try {
            this.canPlay = canPlay.canPlay
          } catch (error) {
            logger.error("Error handling canPlay value:", error)
            this.canPlay = false
          }
        } else {
          this.canPlay = canPlay
        }
        logger.info("Manager Can play: ", this.canPlay)
        if (canPlay) {
          logger.info("Received can play signal")
          secondaryObservables.forEach((obs: Observable<any>) => {
            if (obs !== motionSub$) {
              // motionSub$ needs to stay alive when others are unsubscribed by prefersReducedMotion signal
              logger.debug(`Subscribing to secondary observable: ${obs}`)
              this.subscriptions.add(obs.subscribe())
            }
          })
          this.handleCanPlay()
        } else {
          this.handleStopPlay()
        }
      },
      error: (err: any) => {
        logger.error("Video observer encountered an error:", err)
        this.handleStopPlay()
      },
      complete: () => {
        logger.info("Video observer completed")
        this.handleStopPlay()
        this.subscriptions.unsubscribe()
        this.subscriptions.add(video$.subscribe(videoObserver))
      },
    }
    this.subscriptions.add(video$.subscribe(videoObserver))
    this.subscriptions.add(statusSetter$.subscribe())
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    logger.info("Initializing VideoManager")
    this.videoStore = getHeroVideos()
    this.initVideo()
    this.buildVideoTimeline()
    this.buildTextTimeline()
    this.masterTimeline.add(this.videoTimeline, "<").add(this.textAnimationTimeline, ">")
    this.initSubscriptions()
  }

  private initVideo(): void {
    gsap.set(this.container, { contentVisibility: "hidden" })
    if (this.videoStore.length === 0) {
      this.initiateFallback()
      throw new Error("No videos found")
    } else if (this.videoStore.length === 1) {
      this.video = new VideoElement(this.videoStore[0])
    } else {
      // get a random video
      const randomized = gsap.utils.shuffle(this.videoStore)
      this.video = new VideoElement(randomized[0])
      this.element = this.video.video
      this.poster = this.video.picture
      this.message = this.video.message
      if (this.videoStore.length > 1 && this.video?.heroVideo.baseName !== BACKUP_PICTURE) {
        this.backupPicture = new VideoElement(
          randomized.find((hero) => hero.baseName === BACKUP_PICTURE) || randomized[1],
        ).picture
      } else {
        this.backupPicture = this.video.picture.cloneNode(true) as HTMLPictureElement
      }
      toggleActiveClass(this.backupPicture, "hero__backup", false)
      this.container.append(this.backupPicture)
    }
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private loadVideo(): void {
    if (!elementInDom(this.poster)) {
      this.loadPoster()
    }
    if (elementInDom(this.element) && this.status === "loaded") {
      return
    }
    document$.subscribe(() => {
      gsap.set(this.element, { autoAlpha: 0 })
      this.container.append(this.element)
      this.element.load()
    })
  }

  private loadPoster(): void {
    if (!elementInDom(this.poster)) {
      this.container.append(this.poster)
    }
    gsap.set(this.poster, { autoAlpha: 0 })
    toggleActiveClass(this.poster, "hero__poster", true)
    const img = this.poster.querySelector("img")
    const transition = () => gsap.to(this.poster, { autoAlpha: 1, duration: 0.5 })
    if (img && img instanceof HTMLImageElement) {
      if (img.complete) {
        // Image already loaded
        transition()
      } else {
        // Wait for load
        fromEvent(this.poster, "load").subscribe(transition)
      }
    } else {
      // No image found
      this.loadBackup()
    }
  }

  private handleCanPlay(): void {
    this.canPlay = true
    logger.info("Handling can play event")
    switch (this.status) {
      case "loading":
        this.loadPoster()
        logger.info("Video loading. Preparing to play.")
        break
      case "playing":
        if (!this.isPlaying()) {
          this.foulPlay()
        }
        if (!this.masterTimeline.isActive()) {
          this.masterTimeline.play()
        }
        break
      case "paused":
        logger.info("Video paused. Resuming.")
        this.play()
        break
      case "on_textAnimation":
        if (!this.masterTimeline.isActive()) {
          this.masterTimeline.play()
        }
        break
      case "loaded":
        logger.info("Video loaded. Playing.")
        if (!this.isPlaying()) {
          this.foulPlay()
        }
        if (!this.masterTimeline.isActive()) {
          this.masterTimeline.play()
        }
        break
      case "not_initialized":
        logger.info("Video not initialized. Initializing.")
        this.status = "loading"
        toggleActiveClass(this.poster, "hero__poster", true)
        this.loadPoster()
        logger.info("Poster loaded. Initialized video")
        this.loadVideo()
        logger.info("Video loaded")
        this.play()
        break
      default:
        logger.error("Unhandled status:", this.status)
        logger.info("Initiating fallback")
        this.initiateFallback()
        break
    }
  }

  /*================== Animations =================*/

  private animateText(overrideVars: gsap.TweenVars = {}): GSAPTimeline {
    return gsap
      .timeline()
      .set(".text-animation__container", { autoAlpha: 1 })
      ["animateMessage"](".text-animation__container", {
        message: this.message,
        repeat: 0,
        log: true,
        duration: 5,
        callbackScope: this,
        extendTimeline: true,
        ...overrideVars,
      })
      .add(() => {
        logger.info("Text animation completed")
      })
  }

  private syncToVideo(): void {
    logger.debug(`Syncing video to ${this.timeLeft()} seconds`)
    this.videoTimeline.isActive() ?
      this.videoTimeline.duration(this.timeLeft() - (VIDEO_END_BUFFER - 0.5))
    : this.videoTimeline.duration(this.videoDuration)
  }

  // sets initial timeline properties
  private buildVideoTimeline(): void {
    logger.debug("Building the video timeline")
    this.videoTimeline
      .add(
        [
          "startVideo",
          () => {
            this.element.play().catch((e) => {
              logger.error("Failed to play video", e)
              this.addPlayOnInteraction()
            })
          },
        ],
        "<",
      )
      .set(this.container, { autoAlpha: 1 })
      .set(this.element, { autoAlpha: 1 })
      .set(this.ctaContainer, { autoAlpha: 1 })
      .add(
        // we make sure the timeline syncs with the video
        gsap.delayedCall(2, () => {
          if (
            this.isPlaying() &&
            this.videoTimeline.totalDuration() > this.timeLeft() - (VIDEO_END_BUFFER - 0.5)
          ) {
            this.syncToVideo()
          } else if (!this.isPlaying()) {
            this.videoTimeline.restart().pause()
            this.foulPlay()
          }
        }),
        "<",
      )
  }

  private buildTextTimeline(): void {
    const ctaHeaders = gsap.utils.toArray("h1, h2", this.ctaContainer)
    this.textAnimationTimeline
      .add(
        gsap.to(ctaHeaders, {
          autoAlpha: 0,
          duration: 0.5,
        }),
        "<",
      )
      .set(this.element, { autoAlpha: 0 })
      .add(this.animateText(), "<=+0.5")
      .add(
        gsap.to(ctaHeaders, {
          autoAlpha: 1,
          duration: 0.5,
        }),
        ">",
      )
      .add(() => {
        logger.info("Text timeline completed")
      })
  }

  private setEmphasisAnimations(): GSAPTimeline {
    const { subtle, strong } = OBSERVER_CONFIG.emphasisTargets
    const subtleTargets = gsap.utils.toArray(subtle)
    const strongTargets = gsap.utils.toArray(strong)
    return gsap
      .timeline({
        repeat: -1,
        paused: false,
        delay: Math.min(VIDEO_END_BUFFER, 2),
        repeatDelay: 2,
        defaults: { repeat: -1, paused: false },
      })
      .add(
        [
          "subtleEmphasis",
          gsap.timeline()["emphasize"](subtleTargets, SUBTLE_EMPHASIS_CONFIG),
          ">",
        ],
        ">",
      )
      .add(
        [
          "strongEmphasis",
          gsap.timeline()["emphasize"](strongTargets, STRONG_EMPHASIS_CONFIG),
          ">",
        ],
        ">=0.5",
      )
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
    if (this.isOnFallback()) {
      return
    }
    gsap.to(revert ? this.element : this.poster, { autoAlpha: 0, duration: 0.5 })
    gsap.to(revert ? this.poster : this.element, { autoAlpha: 1, duration: 0.5 })
    gsap.set(this.container, { autoAlpha: 1, contentVisibility: "visible" })
    gsap.set(revert ? this.element : this.poster, { autoAlpha: 0 })
    gsap.set(revert ? this.poster : this.element, { autoAlpha: 1 })
    this.status = revert ? "paused" : "playing"
    toggleActiveClass(this.element, "hero__video", !revert)
    toggleActiveClass(this.poster, "hero__poster", revert)
    if (revert) {
      this.element.pause()
      this.element.currentTime = 0
    } else {
      this.masterTimeline.play("videoTimeline")
    }
  }

  /*=============================================*/
  /* Status handling */

  // Add these methods to the VideoManager class
  private handleReducedMotion({ prefersReducedMotion }: { prefersReducedMotion: boolean }): void {
    if (prefersReducedMotion) {
      this.masterTimeline.pause()
      this.canPlay = false
      this.status = "on_fallback"
      this.initiateFallback()
    }
  }

  private determineVideoStatus(canPlay: boolean, currentSection: number): VideoStatus {
    const posterInDom = elementInDom(this.poster)
    const videoInDom = elementInDom(this.element)

    // Early returns for element not in DOM
    if (!videoInDom || !posterInDom) {
      return "not_initialized"
    }

    // sourcery skip: merge-else-if
    if (canPlay) {
      // Handle cases when canPlay is true
      if (!this.element.duration) {
        return "not_initialized"
      } else if (this.element.readyState <= 3) {
        return "loading"
      } else if (this.element.readyState === 4) {
        if (this.isPlaying()) {
          return "playing"
        } else if (currentSection >= SectionIndex.Impact || this.element.paused) {
          return this.element.currentTime > 0 || this.hasPlayed ? "paused" : "loaded"
        } else if (this.isOnTextAnimation()) {
          return "on_textAnimation"
        } else {
          return "loaded"
        }
      }
    } else {
      // Handle cases when canPlay is false
      if (
        (currentSection >= SectionIndex.Impact && this.status !== "not_initialized") ||
        this.hasPlayed ||
        this.element.paused
      ) {
        return this.element.currentTime > 0 || this.hasPlayed ? "paused" : "loaded"
      } else if (
        (!this.element.duration && this.element.readyState === 0) ||
        !elementInDom(this.element)
      ) {
        return "not_initialized"
      } else if (this.element.currentTime > 0) {
        return "paused"
      } else if (this.element.readyState === 4) {
        return "loaded"
      } else if (this.element.readyState <= 3) {
        return "loading"
      }
    }

    return "not_initialized"
  }

  private isOnTextAnimation(): boolean {
    return (
      this.element.readyState === 4 &&
      this.masterTimeline.totalDuration() > 0 &&
      this.masterTimeline.isActive() &&
      this.masterTimeline.currentLabel() === "textTimeline"
    )
  }

  /*=============================================*/
  /* Error handling and tear down */

  private handleMediaError(error: MediaError): void {
    switch (error.code) {
      case 1:
        setTimeout(() => this.play(), 2000)
        break
      case 2:
        logger.error("Video element encountered an error. Network error.")
        try {
          this.element.load()
        } catch (err) {
          logger.error("Failed to reload video element.", err)
        }
        this.tryNewSource()
        break
      case 3:
      case 4:
        const name = error.code === 3 ? "decoder error" : "source error"
        logger.error(`Video element encountered an error. ${name}.`)
        this.tryNewSource()
        break
      default:
        logger.error("Video element encountered an error.", error)
        Promise.resolve(this.tryNewSource()).catch(() => {
          this.initiateFallback()
        })
        break
    }
  }

  // I couldn't resist
  private foulPlay(): void {
    this.element
      .play()
      .then(() => {
        if (this.isPlaying()) {
          this.masterTimeline.play("videoTimeline")
          this.status = "playing"
        } else {
          throw new Error("Failed to play video")
        }
      })
      .catch(() => {
        this.addPlayOnInteraction()
      })
  }

  private addPlayOnInteraction(): void {
    const playOnInteraction = () => {
      this.element.play().catch((e) => {
        logger.error("Failed to play on interaction", e)
        document.removeEventListener("click", playOnInteraction)
        document.removeEventListener("touchstart", playOnInteraction)
        this.initiateFallback()
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
      .then(() => {
        if (this.isPlaying()) {
          this.masterTimeline.play()
        }
      })
      .catch(() => {
        this.transitionToVideo(true)
        document.addEventListener("click", playOnInteraction)
        document.addEventListener("touchstart", playOnInteraction)

        logger.info("Added play on interaction listeners")
      })
  }

  private setVideoDimensionVars(): void {
    if (this.status !== "on_fallback" && this.canPlay && this.element.readyState >= 3) {
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
    // Replace this.element.src with a URL pointing to a video that uses a supported codec
    const { currentSrc } = this.element
    const parsedSrc = parsePath(currentSrc)
    const { name } = parsedSrc
    if (name.includes("av1")) {
      logger.info("Switching to vp9 codec")
      this.element.src = currentSrc.replace("av1", "vp9")
      this.transitionToVideo()
    } else if (name.includes("vp9")) {
      logger.info("Switching to h264 codec")
      this.element.src = currentSrc.replace("vp9", "h264")
      this.transitionToVideo()
    } else {
      logger.error("No more codecs to switch to. Initiating fallback.")
      this.initiateFallback()
    }
    if (this.element.currentSrc !== currentSrc) {
      this.element.load()
      fromEvent(this.element, "canplaythrough").subscribe(() => {
        this.element
          .play()
          .then(() => {
            if (this.isPlaying()) {
              this.masterTimeline.play("videoTimeline")
            }
          })
          .catch(() => {
            this.addPlayOnInteraction()
          })
      })
    }
  }

  private loadBackup(): void {
    if (!elementInDom(this.backupPicture)) {
      requestAnimationFrame(() => {
        this.container.append(this.backupPicture)
        this.backupPicture.querySelector("img")?.classList.add("hero__poster--image")
        toggleActiveClass(this.backupPicture, "hero__poster", true)
      })
    }

    gsap.to(this.backupPicture, { autoAlpha: 1, duration: 1 })

    logger.info("Backup loaded and set to visible:", this.backupPicture)
  }

  private initiateFallback(): void {
    if (
      this.status === "on_fallback" &&
      elementInDom(this.backupPicture) &&
      this.backupPicture.classList.contains("hero__poster--active")
    ) {
      return
    }
    if (this.poster.classList.contains("hero__poster--active") && elementInDom(this.poster)) {
      this.poster.style.opacity = "1"
      this.poster.style.visibility = "visible"
    }
    if (this.poster === this.backupPicture) {
      this.loadPoster()
    } else {
      this.loadBackup()
      toggleActiveClass(this.poster, "hero__poster", false)
      toggleActiveClass(this.backupPicture, "hero__poster", true)
    }
    const newTl = gsap.timeline({ paused: false, defaults: { repeat: 0 } })
    newTl
      .add(["fallback", gsap.set(this.element, { autoAlpha: 0, duration: 0.5 })], 0)
      .call(() => {
        this.element.classList.add("hero__video--inactive")
        this.status = "on_fallback"
        if (elementInDom(this.element)) {
          this.container.removeChild(this.element)
        }
      })
      .set(this.container, { autoAlpha: 1 })
      .set(this.ctaContainer, { autoAlpha: 1 })
    newTl.add(this.setEmphasisAnimations())
    this.masterTimeline.kill()
    this.videoTimeline.kill()
    this.textAnimationTimeline.kill()
    this.videoTimeline = gsap.timeline()
    this.textAnimationTimeline = gsap.timeline()
    this.masterTimeline = newTl
    this.masterTimeline.play()
    this.subscriptions.unsubscribe()
    logger.info("Initiated fallback")
  }

  private handleStopPlay(): void {
    this.canPlay = false
    this.pause()
    if (this.hasPlayed && this.videoStore.length > 1) {
      this.reinit()
      this.status = "loading"
    }
    logger.info("Video stopped. Reinitiating.")
  }

  private reinit(): void {
    this.masterTimeline.kill()
    this.status = "not_initialized"
    VideoManager.instance = undefined
    VideoManager.getInstance()
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

  public isOnFallback(): boolean {
    if (this.status !== "on_fallback") {
      return false
    }
    if (this.backupPicture.classList.contains("hero__poster--active")) {
      return true
    } else {
      this.initiateFallback()
      return true
    }
  }

  public timeLeft(): number {
    return this.videoDuration - this.element.currentTime
  }

  public getStatus(): string {
    return this.status
  }

  public play(): void {
    if (this.isOnFallback()) {
      return
    }
    if (!this.masterTimeline.isActive()) {
      this.masterTimeline.play()
    } else if (this.status === "on_textAnimation" && !this.masterTimeline.isActive()) {
      this.masterTimeline.play("textTimeline")
    }
  }

  public pause(): void {
    if (this.status === "on_fallback") {
      return
    }
    this.textAnimationTimeline.pause()
    this.videoTimeline.pause()
    this.element.pause()
    this.status = "paused"
  }

  public resume(): void {
    if (this.status === "on_fallback") {
      return
    }
    this.play()
  }

  public restart(): void {
    this.stop()
    this.play()
  }

  public stop(): void {
    this.element.pause()
    this.element.currentTime = 0
    this.masterTimeline.restart().pause()
    // Check if video is loaded
    if (this.element.readyState === 4) {
      this.status = "loaded"
    } else {
      this.status = "loading"
    }
    logger.info("Video stopped and reset.")
  }
}
