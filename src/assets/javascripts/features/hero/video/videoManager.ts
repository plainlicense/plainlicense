import gsap from "gsap"
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  combineLatest,
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
  switchMap,
  tap,
} from "rxjs"
import {
  BACKUP_PICTURE,
  OBSERVER_CONFIG,
  STRONG_EMPHASIS_CONFIG,
  SUBTLE_EMPHASIS_CONFIG,
} from "~/config"
import { HeroStore } from "~/state"
import { elementInDom, logger, parsePath } from "~/utils"
import { HeroVideo, VideoStatus } from "./types"
import { getHeroVideos, toggleActiveClass } from "./utils"
import { VideoElement } from "./videoElement"

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
  private element: HTMLVideoElement

  // @ts-ignore - we delay initialization for home arrival
  private poster: HTMLPictureElement

  private container: HTMLDivElement =
    (document.querySelector(".hero.first .hero__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("hero__container")
      const parent = document.querySelector(".hero.first .hero__bg")
      parent?.append(div)
      return div
    })()

  private ctaContainer: HTMLDivElement =
    (document.querySelector(".cta__container") as HTMLDivElement) || document.createElement("div")

  private ctaText: HTMLElement[] = gsap.utils.toArray("h1, h2")

  public timeline: GSAPTimeline = gsap.timeline()

  private subscriptions: Subscription = new Subscription()

  public hasPlayed: boolean = false

  public status: VideoStatus = "not_initialized"

  public canPlay: boolean = false

  private videoDuration: number = 0

  private titleStart: number = 0

  // @ts-ignore - we delay initialization for home arrival
  private backupPicture: HTMLPictureElement

  private message: string = ""

  /**
   * @method init_subscriptions
   * @private
   * @description Initializes the subscriptions for the VideoManager
   */
  private init_subscriptions(): void {
    const { videoState$ } = this.store

    const video$ = videoState$.pipe(
      distinctUntilKeyChanged("canPlay"),
      tap((canPlay) => {
        logger.info("video manager video$ observable received new value", canPlay)
      }),
      map(({ canPlay }) => {
        return canPlay
      }),
    )

    const motionSub$ = this.store.state$.pipe(
      distinctUntilKeyChanged("prefersReducedMotion"),
      filter(({ prefersReducedMotion }) => prefersReducedMotion),
    )

    const stallHandler$ = combineLatest([
      videoState$.pipe(filter((state) => state.canPlay === true)),
      merge(fromEvent(this.element, "stalled"), fromEvent(this.element, "waiting")),
    ]).pipe(
      tap(() => {
        logger.info("Video is stalled or waiting, pausing video")
        this.pause()
      }),
      switchMap(() => fromEvent(this.element, "canplaythrough")),
      tap(() => {
        if (!elementInDom(this.element)) {
          this.container.append(this.element)
        }
        this.resume()
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

    const metadata$ = fromEvent(this.element, "loadedmetadata").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        this.videoDuration = this.element.duration
        this.titleStart = this.videoDuration - 5
      }),
    )

    const canplaythrough$ = fromEvent(this.element, "canplaythrough").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        this.status = "loaded"
        this.transitionToVideo()
        this.play()
      }),
      catchError((e) => {
        logger.error("Failed to play video", e)
        this.handleMediaError(e)
        return EMPTY
      }),
    )

    const playing$ = fromEvent(this.element, "playing").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        this.status = "playing"
        this.timeline.play()
        toggleActiveClass(this.poster, "hero__poster", false)
        toggleActiveClass(this.element, "hero__video", true)
        logger.info("Received playing event")
      }),
    )

    const waiting$ = fromEvent(this.element, "waiting").pipe(
      filter((ev) => {
        return ev.target instanceof HTMLMediaElement
      }),
      distinctUntilChanged(),
      tap(() => {
        this.pause()
      }),
    )

    const secondaryObservables = [
      motionSub$,
      stallHandler$,
      errorHandler$,
      canplaythrough$,
      playing$,
      waiting$,
      metadata$,
    ]

    const videoObserver = {
      next: (canPlay: boolean) => {
        logger.info("Received new video signal for canPlay: ", canPlay)
        this.canPlay = canPlay
        logger.info("Manager Can play: ", this.canPlay)
        if (canPlay) {
          secondaryObservables.forEach((obs: Observable<any>) => {
            this.subscriptions.add(obs.subscribe())
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
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    logger.info("Initializing VideoManager")
    this.videoStore = getHeroVideos()
    this.initVideo()
    this.constructTimeline()
    this.init_subscriptions()
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
        this.backupPicture = new VideoElement(randomized[1]).picture
      } else {
        this.backupPicture = this.video.picture.cloneNode(true) as HTMLPictureElement
      }
      this.backupPicture.classList.add("hero__backup", "hero__poster,", "hero__backup--inactive")
      this.container.append(this.backupPicture)

      this.backupPicture.style.display = "none"
    }
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private handleCanPlay(): void {
    this.canPlay = true
    logger.info("Handling can play event")
    switch (this.status) {
      case "loading":
        logger.info("Video loading. Preparing to play.")
        break
      case "playing":
        break
      case "paused":
        logger.info("Video paused. Resuming.")
        this.play()
        break
      case "on_delay":
        logger.info("Video on delay. Resuming.")
        this.timeline.play()
        break
      case "loaded":
        logger.info("Video loaded. Playing.")
        this.play()
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

  private handleStopPlay(): void {
    this.canPlay = false
    this.pause()
    if (this.hasPlayed && this.videoStore.length > 1) {
      this.reinit()
      this.status = "loading"
    }

    logger.info("Video stopped. Reinitiating.")
  }

  // sets initial timeline properties
  private constructTimeline(): void {
    this.timeline = gsap.timeline({
      defaults: { paused: true, callbackScope: this },
      paused: true,
      callbackScope: this,
      onStart: () => {
        this.transitionToVideo()
        this.element.play()
        this.timeline.play()
        this.status = "playing"
        if (!this.videoDuration && this.element.duration) {
          this.videoDuration = this.element.duration
          this.titleStart = this.videoDuration - 5
        }
      },
      onUpdate: () => {
        if (
          this.status !== "on_delay" &&
          this.element.played.length > 0 &&
          this.videoDuration > 0 &&
          this.element.currentTime > this.titleStart
        ) {
          this.element.pause()
          this.status = "on_delay"
          gsap.to(this.element, { autoAlpha: 0, duration: 0.5 })
          this.animateText().play()
        }
        if (!this.element.played.length && this.element.error) {
          this.timeline.pause()
          this.status = "loading"
          try {
            this.tryNewSource()
          } catch (e) {
            logger.error("Failed to switch codec", e)
            this.initiateFallback()
          }
        }
      },
      onComplete: () => {
        this.stop()
        this.timeline.restart()
        this.hasPlayed = true
        this.status = "on_delay"
      },
      onRepeat: () => {
        this.hasPlayed = true
      },
      repeat: -1,
      repeatDelay: 3,
      ease: "none",
    })
  }

  private setEmphasisAnimations(): GSAPTimeline {
    const { subtle, strong } = OBSERVER_CONFIG.emphasisTargets
    const subtleTargets = gsap.utils.toArray(subtle)
    const strongTargets = gsap.utils.toArray(strong)
    return gsap
      .timeline()
      .add(
        ["subtleEmphasis", gsap.timeline().emphasize(subtleTargets, SUBTLE_EMPHASIS_CONFIG), ">"],
        ">",
      )
      .add(
        ["strongEmphasis", gsap.timeline().emphasize(strongTargets, STRONG_EMPHASIS_CONFIG), ">"],
        ">=0.5",
      )
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
      this.timeline
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
        .call(() => {
          toggleActiveClass(this.poster, "hero__poster", false)
          toggleActiveClass(this.element, "hero__video", true)
          gsap.set(this.container, { autoAlpha: 1, duration: 1 })
        })
      if (this.video.message) {
        this.timeline
          .add(
            ["fadeOutVideo", gsap.to(this.element, { autoAlpha: 0, duration: 0.5 })],
            this.titleStart,
          )
          .add(this.animateText())
          .add(this.setEmphasisAnimations())
      } else {
        logger.info("No message to display for the video")
      }
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

  private loadBackup(): void {
    const backup =
      this.poster.classList.contains("hero__poster--active") ? this.poster : this.backupPicture
    if (!elementInDom(backup)) {
      requestAnimationFrame(() => {
        this.container.append(backup)
        backup.querySelector("img")?.classList.add("hero__poster--image")
        toggleActiveClass(backup, "hero__poster", true)
      })
    }

    gsap.to(backup, { autoAlpha: 1, duration: 1 })

    logger.info("Backup loaded and set to visible:", backup)
  }

  private transitionToVideo(revert: boolean = false): void {
    gsap.to(revert ? this.element : this.poster, { autoAlpha: 0, duration: 0.5 })
    gsap.to(revert ? this.poster : this.element, { autoAlpha: 1, duration: 0.5 })
    gsap.set(this.container, { autoAlpha: 1, contentVisibility: "visible" })
    gsap.set(revert ? this.element : this.poster, { autoAlpha: 0 })
    gsap.set(revert ? this.poster : this.element, { autoAlpha: 1 })
    this.status = revert ? "paused" : "playing"
    toggleActiveClass(this.element, "hero__video", !revert)
    toggleActiveClass(this.poster, "hero__poster", revert)
    if (revert) {
      this.timeline.pause()
      this.element.pause()
    } else {
      this.element.play().catch(() => {
        this.addPlayOnInteraction()
      })
      this.timeline.play()
    }
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
    this.transitionToVideo(true)
    document.addEventListener("click", playOnInteraction)
    document.addEventListener("touchstart", playOnInteraction)

    logger.info("Added play on interaction listeners")
  }

  private initiateFallback(): void {
    if (this.status === "on_fallback") {
      return
    }
    const fallback =
      this.poster.classList.contains("hero__poster--active") ? this.poster : this.backupPicture
    if (fallback !== this.poster) {
      this.loadBackup()
    }
    if (!elementInDom(fallback)) {
      this.container.append(fallback)
    }
    toggleActiveClass(fallback, "hero__poster", true)
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
    newTl.add(this.animateText({ onComplete: () => {} }))
    newTl.add(this.setEmphasisAnimations())
    this.timeline.kill()
    this.timeline = newTl
    this.timeline.play()
    this.subscriptions.unsubscribe()
    logger.info("Initiated fallback")
  }
  public play(): void {
    if (!this.timeline.isActive() && this.status !== "on_fallback") {
      this.transitionToVideo()
    }
  }

  private animateText(overrideVars: gsap.TweenVars = {}): GSAPTimeline {
    return gsap
      .timeline()
      .call(() => {
        toggleActiveClass(this.element, "hero__video", false)
      })
      .set(this.container, { autoAlpha: 1 })
      .set(this.ctaContainer, { autoAlpha: 1 })
      ["animateMessage"](this.container, {
        message: this.message || this.ctaText,
        repeat: 0,
        duration: 5,
        callbackScope: this,
        onComplete: () => {
          this.stop()
          this.play()
        },
        ...overrideVars,
      })
      .call(() => {
        logger.info("Text animation completed")
      })
  }

  public pause(): void {
    this.transitionToVideo(true)
  }

  public resume(): void {
    this.play()
  }

  public stop(): void {
    this.element.pause()
    this.element.currentTime = 0
    this.timeline.restart()
  }

  private reinit(): void {
    this.timeline.kill()
    this.constructor()
  }

  private handleMediaError(error: MediaError): void {
    switch (error.code) {
      case 1:
        logger.error("Video element encountered an error. User aborted the video.")
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
        break
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
        this.element.play().catch(() => {
          this.addPlayOnInteraction()
        })
      })
    }
  }
}
