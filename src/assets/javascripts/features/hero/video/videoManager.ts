import {
  EMPTY,
  Subscription,
  combineLatest,
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
import gsap from "gsap"
import { VideoElement } from "./videoElement"
import { OBSERVER_CONFIG, STRONG_EMPHASIS_CONFIG, SUBTLE_EMPHASIS_CONFIG } from "~/config"
import { HeroStore } from "~/state"
import { HeroVideo, VideoStatus } from "./types"
import { getHeroVideos } from "./utils"
import { logger, parsePath } from "~/utils"

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
    (document.querySelector(".hero__container") as HTMLDivElement) || document.createElement("div")

  private ctaContainer: HTMLDivElement =
    (document.querySelector(".cta__container") as HTMLDivElement) || document.createElement("div")

  private ctaText: HTMLElement[] = gsap.utils.toArray("h1, h2")

  public timeline: gsap.core.Timeline = gsap.timeline()

  private subscriptions: Subscription = new Subscription()

  public has_played: boolean = false

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
      map(({ canPlay }) => canPlay),
      tap((canPlay) => {
        if (canPlay) {
          this.handleCanPlay()
        } else {
          this.handleStopPlay()
        }
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
        this.pause()
      }),
      switchMap(() => fromEvent(this.element, "canplaythrough")),
      tap(() => {
        this.resume()
      }),
    )

    const elementChildren = Array.from(this.element.children)
    const errorHandler$ = merge([
      fromEvent(this.element, "error"),
      fromEvent(elementChildren, "error"),
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

    this.subscriptions.add(video$.subscribe())
    this.subscriptions.add(motionSub$.subscribe(() => this.initiateFallback()))
    this.subscriptions.add(stallHandler$.subscribe())
    this.subscriptions.add(errorHandler$.subscribe())
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    this.videoStore = getHeroVideos()
    this.initVideo()
    this.constructTimeline()
    this.init_subscriptions()
  }

  private initVideo(): void {
    this.backupPicture =
      (document.querySelector(".hero__backup") as HTMLPictureElement) ||
      document.createElement("picture")
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
    }
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private handleCanPlay(): void {
    this.canPlay = true
    switch (this.status) {
      case "loading":
      case "playing":
        break
      case "paused":
        this.timeline.resume()
        break
      case "on_delay":
        this.timeline.restart()
        break
      case "loaded":
        this.timeline.play()
        break
      case "not_initialized":
        this.status = "loading"
        this.loadVideo()
    }
  }

  private handleStopPlay(): void {
    this.canPlay = false
    this.pause()
    if (this.has_played && this.videoStore.length > 1) {
      this.reinit()
      this.status = "loading"
    }
  }

  // sets initial timeline properties
  private constructTimeline(): void {
    this.timeline = gsap.timeline({
      defaults: { paused: true, callbackScope: this },
      paused: true,
      onStart: () => {
        this.status = "playing"
      },
      onComplete: () => {
        this.status = "on_delay"
      },
      onRepeat: () => {
        this.has_played = true
      },
      onUpdate: () => {
        if (!this.element.played.length) {
          this.timeline.pause()
          try {
            this.tryNewSource()
          } catch (e) {
            logger.error("Failed to switch codec", e)
            this.initiateFallback()
          }
        }
      },
      repeat: -1,
      repeatDelay: 3,
      callbackScope: this,
      ease: "none",
    })
  }

  private setEmphasisAnimations(): void {
    const { subtle, strong } = OBSERVER_CONFIG.emphasisTargets
    const subtleTargets = gsap.utils.toArray(document.querySelectorAll(subtle))
    const strongTargets = gsap.utils.toArray(document.querySelectorAll(strong))
    this.timeline
      .add(
        ["subtleEmphasis", gsap.timeline.emphasize(subtleTargets, SUBTLE_EMPHASIS_CONFIG), ">"],
        ">",
      )
      .add(
        ["strongEmphasis", gsap.timeline.emphasize(strongTargets, STRONG_EMPHASIS_CONFIG), ">"],
        ">=0.5",
      )
  }

  private loadVideo(): void {
    if (!this.container.querySelector("picture")) {
      this.loadPoster()
    }
    if (this.container.querySelector("video")) {
      return
    }
    document$.subscribe(() => {
      gsap.set(this.element, { autoAlpha: 0 })
      this.element.pause()
      this.container.append(this.element)
      this.element.load()
      fromEvent(this.element, "loadedmetadata").subscribe(() => {
        this.videoDuration = this.element.duration
        this.titleStart = this.videoDuration - 5
      })
      fromEvent(this.element, "canplaythrough").subscribe(() => {
        this.status = "loaded"
        gsap.to(this.poster, { autoAlpha: 0, duration: 0.5 })
        this.timeline.add(
          ["fadeinVideo", gsap.to(this.element, { autoAlpha: 1, duration: 0.5 })],
          0,
        )
        this.timeline.add(
          [
            "startVideo",
            () => {
              this.element.play()
            },
          ],
          "<",
        )
        if (this.video.message) {
          this.timeline.add(
            ["fadeOutVideo", gsap.to(this.element, { autoAlpha: 0, duration: 0.5 })],
            this.titleStart,
          )

          this.timeline.add(
            [
              "message",
              gsap.timeline.animateMessage(this.container, { message: this.message, repeat: 0 }),
            ],
            this.titleStart,
          )
          this.setEmphasisAnimations()
          this.timeline.add([
            "resetVideo",
            () => {
              this.stop()
              this.play()
            },
            ">",
          ])
        }
      })
    })
  }

  private loadPoster(): void {
    gsap.set(this.poster, { autoAlpha: 0 })
    this.container.append(this.poster)
    const img = this.poster.querySelector("img")
    const transition = () => gsap.to(this.poster, { autoAlpha: 1, duration: 0.5 })
    if (img && img instanceof HTMLImageElement) {
      if (img.complete) {
        // Image already loaded
        transition()
      } else {
        // Wait for load
        fromEvent(img, "load").subscribe(transition)
      }
    } else {
      // No image found
      this.loadBackup()
    }
  }

  private loadBackup(): void {
    const backup = this.backupPicture || this.poster
    if (!Array.from(this.container.children).includes(backup)) {
      requestAnimationFrame(() => {
        this.container.append(backup)
        backup.classList.add("hero__poster--active")
        backup.querySelector("img")?.classList.add("hero__poster--image")
      })
    }
    gsap.to(backup, { autoAlpha: 1, duration: 1 })
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
    this.poster.classList.add("hero__poster--active")
    this.poster.classList.remove("hero__poster--inactive")
    document.addEventListener("click", playOnInteraction)
    document.addEventListener("touchstart", playOnInteraction)
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
    const newTl = gsap.timeline({ paused: false, defaults: { repeat: 0 } })
    newTl
      .add(["fallback", gsap.set(this.element, { autoAlpha: 0, duration: 0.5 })], 0)
      .call(() => {
        this.element.classList.add("hero__video--inactive")
        this.status = "on_fallback"
        if (this.container.querySelector("video")) {
          this.container.removeChild(this.element)
        }
        if (!this.container.querySelector("picture")) {
          this.container.append(fallback)
        }
        if (!fallback.classList.contains("hero__poster--active")) {
          gsap.set(fallback, { autoAlpha: 1, duration: 0.5 })
          fallback.classList.add("hero__poster--active")
        }
      })
      .set(this.ctaContainer, { autoAlpha: 1 })
      .animateMessage(this.container, {
        message: this.ctaText || this.message,
        repeat: 0,
        duration: 0.5,
        autoRemoveChildren: true,
      })
    this.setEmphasisAnimations()
    this.timeline.kill()
    this.timeline = newTl
    this.timeline.play()
    this.subscriptions.unsubscribe()
  }
  public play(): void {
    if (!this.timeline.isActive() && this.status !== "on_fallback") {
      this.timeline.play()
      this.element.play().catch(() => {
        this.addPlayOnInteraction()
      })
    }
  }

  public pause(): void {
    if (this.timeline.isActive()) {
      this.timeline.pause()
      this.element.pause()
    }
  }

  public resume(): void {
    if (this.timeline.paused()) {
      this.timeline.resume()
      this.element.play().catch(() => {
        this.addPlayOnInteraction()
      })
    }
  }

  public stop(): void {
    if (this.timeline.isActive()) {
      this.timeline.pause()
      this.element.pause()
      this.timeline.seek(0)
      this.element.currentTime = 0
    } else {
      this.timeline.seek(0)
      this.element.currentTime = 0
    }
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
    } else if (name.includes("vp9")) {
      logger.info("Switching to h264 codec")
      this.element.src = currentSrc.replace("vp9", "h264")
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
