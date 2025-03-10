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
import {
  BACKUP_PICTURE,
  OBSERVER_CONFIG,
  STRONG_EMPHASIS_CONFIG,
  SUBTLE_EMPHASIS_CONFIG,
} from "~/config"
import { HeroStore, VideoState } from "~/state"
import { elementInDom, logger, parsePath, prefersReducedMotion$, setCssVariable } from "~/utils"
import { AnimateMessageConfig } from "../animations"
import { hide, show } from "../animations/utils"
import { plainLogo } from "./data"
import { TimelineManager } from "./timelineManager"
import {
  HeroVideo,
  TimelinePauseArgs,
  TimelinePlayResumeArgs,
  TimelineRestartArgs,
  TimelineSeekArgs,
} from "./types"
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
  public element: HTMLVideoElement

  // @ts-ignore - we delay initialization for home arrival
  public poster: HTMLPictureElement

  private parentContainer: HTMLDivElement =
    document.querySelector(".hero.first .hero__container") ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("hero__container")
      const parent = document.querySelector(".hero.first .hero__bg") || document.body
      parent?.append(div)
      return div
    })()

  private container: HTMLDivElement =
    (document.querySelector(".hero.first .media__container") as HTMLDivElement) ||
    (() => {
      const div = document.createElement("div")
      div.classList.add("media__container")
      this.parentContainer.append(div)
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

  public logo: HTMLImageElement = (() => {
    const logoContainer =
      document.querySelector(".hero.first .logo__container") ||
      (() => {
        const div = document.createElement("div")
        div.classList.add("logo__container")
        this.container.append(div)
        return div
      })()
    const img = document.createElement("img")
    const { innerWidth, innerHeight } = window
    img.src = plainLogo.href
    img.alt = "Plain License Logo"
    img.width = gsap.utils.clamp(48, innerWidth * 0.1, innerHeight * 0.05)
    img.height = img.width
    logoContainer.appendChild(img)
    gsap.set(logoContainer, hide({ scale: 0, yPercent: 5 }))
    logger.debug("Logo created and appended:", img)
    return img
  })()

  public initialized: boolean = false

  public hasPlayed: boolean = false

  public onFallback: boolean = false

  public canPlay: boolean = false

  // @ts-ignore - it is used in a callback
  private emphasisSet: boolean = false

  private get videoDuration(): number {
    return this.element?.duration
  }

  private get timeScale(): number {
    return 1 / this.videoDuration
  }

  public timelineManager: TimelineManager = new TimelineManager()

  private failCount: number = 0

  private vidDefaults: gsap.TimelineVars = {
    callbackScope: this,
    onStart: () => {
      this.transitionToVideo()
    },
    onComplete: () => {
      toggleActiveClass(this.element, "hero__video", false)
    },
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

    const video$ = defer(() =>
      videoState$.pipe(
        distinctUntilKeyChanged("canPlay"),
        tap((state) => {
          logger.info("Received new video state", state)
          if (state.canPlay) {
            this.canPlay = true
          } else {
            this.canPlay = false
          }
        }),
      ),
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

    // we handle the very unlikely edge case of someone turning off prefersReducedMotion while on site; we handle the normal case in statusSetter$
    const motionSub$ = defer(() =>
      prefersReducedMotion$.pipe(
        distinctUntilChanged((prev, cur) => prev === cur),
        skipUntil(videoState$),
        skipUntil(
          prefersReducedMotion$.pipe(filter((prefersReducedMotion) => prefersReducedMotion)),
        ), // skip until we get a reduced signal
        skipWhile((prefersReducedMotion) => prefersReducedMotion), // then skip until we don't get one again
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
          logger.debug("Setting video dimensions from loadedmetadata event, " + this.videoDuration)
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

    const secondaryObservables = [varSet$, stallHandler$, errorHandler$, resize$, motionSub$]

    const videoObserver = {
      next: (videoState: VideoState) => {
        logger.info("Received new video signal for canPlay: ", videoState.canPlay)
        this.canPlay = videoState.canPlay
        logger.info("Manager Can play: ", this.canPlay)
        if (videoState.canPlay) {
          logger.info("Received can play signal")
          secondaryObservables.forEach((obs: Observable<any>, i: number) => {
            if (i !== secondaryObservables.length - 1) {
              // motionSub$ needs to stay alive when others are unsubscribed by prefersReducedMotion signal
              this.subscriptions.add(obs.subscribe())
            } else {
              obs.subscribe()
            }
          })
          this.handleCanPlay()
        }
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
          return of(this.initVideo())
        }
        return EMPTY
      }),
    )

    this.subscriptions.add(
      atHome$.subscribe(() => {
        logger.debug("At home signal received - subscribing to video")
        if (!this.initialized) {
          this.subscriptions.add(video$.subscribe(videoObserver))
        }
      }),
    )
  }
  private constructor() {
    this.store = HeroStore.getInstance()
    this.videoStore ??= getHeroVideos()
    if (!VideoManager.instance || !this.initialized) {
      logger.info("Initializing VideoManager")
      this.initSubscriptions()
    }
  }

  private initVideo(): void {
    if (this.videoStore.length === 0) {
      this.initiateFallback()
      throw new Error("No videos found")
    } else if (this.videoStore.length === 1) {
      this.video = new VideoElement(this.videoStore[0])
      this.backupPicture = this.video.picture.cloneNode(true) as HTMLPictureElement
    } else {
      // get a random video
      const randomized = gsap.utils.shuffle(this.videoStore)
      this.video = new VideoElement(randomized[0])
      this.backupPicture = new VideoElement(
        randomized.find((hero) => hero.baseName === BACKUP_PICTURE) || randomized[1],
      ).picture
    }

    this.message = this.video?.message || ""
    this.textDefaults["message"] = this.message
    const promises = []
    if (this.video) {
      this.element = this.video.video
      this.poster = this.video.picture
      if (!this.container.getElementsByTagName("video").length) {
        this.container.append(this.element)
      }
      if (!this.container.getElementsByTagName("picture").length) {
        this.container.append(this.poster)
      }
      this.backupPicture.classList.replace("hero__poster", "hero__backup")
      this.backupPicture.classList.replace("hero__poster--active", "hero__backup--inactive")
      this.container.append(this.backupPicture)
      gsap.set([this.container, this.parentContainer], show())
      promises.push(new Promise(() => this.loadSequence()))
    }
    promises.push(new Promise(() => this.mediaTimeline()))
    promises.push(new Promise(() => this.buildTextTimeline()))
    promises.push(
      new Promise(() => {
        this.initialized = true
        this.debugDump()
      }),
    )
    Promise.all(promises).then(() => {
      logger.info("VideoManager initialized")
    })
    window.vidTL = this.timelineManager
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private loadVideo(): void {
    if (!elementInDom(this.poster)) {
      this.loadPoster()
    }
    if (elementInDom(this.element)) {
      return
    }
    document$.subscribe(() => {
      gsap.set(this.element, hide())
      this.container.append(this.element)
      Promise.resolve(this.element.load())
        .then(() => {
          if (this.canPlay) {
            gsap.set(this.element, show())
            gsap.set(this.container, show())
            this.handleCanPlay()
          }
          logger.info("Video element loaded")
        })
        .catch((err) => {
          this.handleMediaError(err)
        })
    })
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

  private loadPoster(): void {
    if (!elementInDom(this.poster)) {
      requestAnimationFrame(() => {
        this.container.append(this.poster)
      })
    }
    gsap.set(this.poster, hide())
    this.exchangePosters(this.poster, this.backupPicture)
    const img = this.poster.querySelector("img")
    const transition = () => {
      gsap.to(this.poster, { ...show(), duration: 0.5 })
      gsap.to(this.container, show())
    }
    if (img && img instanceof HTMLImageElement) {
      if (img.complete) {
        // Image already loaded
        transition()
      } else {
        // Wait for load
        fromEvent(this.poster, "load")
          .pipe(take(1))
          .subscribe(() => {
            transition()
          })
      }
    } else {
      // No image found
      this.loadBackup()
    }
  }

  private loadSequence(): void {
    Promise.resolve(this.loadPoster()).then(() => {
      logger.info("Poster loaded. Initialized video")
      Promise.resolve(this.loadVideo()).then(() => {
        logger.info("Video loaded")
      })
    })
  }

  private handleCanPlay(): void {
    this.canPlay = true
    logger.info("Handling can play event")
    if ((this.isPlaying() && this.timelineManager.isActive()) || !this.canPlay || this.onFallback) {
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
            this.element.currentTime = 0
          },
        },
      ])
      .timeScale(1)
      .add(this.animateText(this.textDefaults), 0)
      .add(gsap.to(this.ctaContainer, { ...show, duration: 0.5 }))
      .add(
        gsap.to(".cta__container h1", {
          ...show(),
          duration: 0.5,
        }),
        ">",
      )
      .add(
        gsap.to(".cta__container h2", { opacity: undefined, visibility: undefined, duration: 0.5 }),
        ">",
      )
      .add(() => {
        logger.info("Text timeline completed")
        logger.debug("Setting up for next cycle")
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
   * @param config - GSAP timeline configuration.
   */
  private mediaTimeline() {
    const config = this.vidDefaults
    const existingOnStart = config.onStart
    const existingOnComplete = config.onComplete
    let duration = this.videoDuration,
      existingOnUpdate = config && config.onUpdate,
      tl = gsap.timeline([
        "videoTimeline",
        {
          ...config,
          duration: 1,
          onStart: () => {
            existingOnStart && existingOnStart()
            updateDuration()
            gsap.set([this.element, this.container, this.ctaContainer], {
              ...show(),
              duration: 0.3,
            })
            gsap.set(".cta_container h1", { ...show(), duration: 0.5 })
            gsap.set(".cta_container h2", { ...show(), duration: 0.5 }) // Update h2 with show()
            if (!this.isPlaying()) {
              this.foulPlay()
              tl.seek(this.videoDuration ? this.element.currentTime : 0, true)
            }
          },
          onComplete: () => {
            existingOnComplete && existingOnComplete()
            gsap.set(this.ctaContainer, {
              ...hide(),
              duration: 0.5,
            })
            toggleActiveClass(this.element, "hero__video", false)
          },
          callbackScope: this,
          paused: true,
          onUpdate() {
            if (tl.paused() || Math.abs(tl.time() * duration - this.element.currentTime) > 0.5) {
              this.element.currentTime = tl.time() * duration
            }
            existingOnUpdate && existingOnUpdate()
          },
        },
      ]),
      updateDuration = () => {
        tl.timeScale(this.timeScale)
      },
      pause = tl.pause,
      play = tl.play,
      restart = tl.restart,
      seek = tl.seek
    tl.set({}, {}, 0)
    tl["media"] = document.querySelector(".hero__video")
    tl["foulPlay"] = this.foulPlay.bind(this)
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
      tl.time(this.relativeToDuration(this.element.currentTime), true)
    }
    this.element.onseeked = () => {
      const newTime = this.relativeToDuration(this.element.currentTime)
      if (Math.abs(tl.time() - newTime) > 0.1) {
        tl.time(newTime, true)
      }
    }
    this.element.oncanplaythrough = () => {
      updateDuration()
      const newTime = this.relativeToDuration(this.element.currentTime)
      if (Math.abs(tl.time() - newTime) > 0.1) {
        tl.time(newTime, true)
      }
      if (!tl.isActive()) {
        tl.play()
      }
    }
    this.element.onended = () => {
      logger.info("Video ended event triggered")
      toggleActiveClass(this.element, "hero__video", false)
      gsap.to(this.ctaContainer, { ...hide(), duration: 0.5 })
      logger.info("Video ended event detected")
      logger.debug(
        `Video ended at ${this.element.currentTime} \n Video duration: ${this.videoDuration} \n Timeline time: ${tl.time()} \n Timeline duration: ${tl.duration()} \n Timeline progress: ${tl.progress()} \n Timeline paused: ${tl.paused()} \n Timeline isActive: ${tl.isActive()}`,
      )

      // Add this to properly signal completion to the timeline when video ends
      if (tl && tl.progress() !== 1) {
        // Force the timeline to complete
        tl.progress(1, true).eventCallback("onComplete")()
      }
    }
    this.element.onplaying = () => {
      if (!tl.isActive()) {
        tl.play()
      }
      gsap.to(this.element, { ...show(), duration: 0.5 })
    }
    this.element.onloadedmetadata = () => {
      updateDuration()
    }
    this.element.onpause = () => {
      if (tl.isActive()) {
        tl.pause()
      }
    }
    this.element.onwaiting = () => {
      if (tl.isActive()) {
        tl.pause()
      }
    }
    tl.pause = function () {
      tl["media"].pause()
      pause.apply(tl, Array.from(arguments).slice(0, 2) as TimelinePauseArgs)
      return tl
    }
    tl.play = function () {
      tl["foulPlay"]()
      play.apply(tl, Array.from(arguments).slice(0, 2) as TimelinePlayResumeArgs)
      if (arguments.length) {
        tl["media"].currentTime = (arguments[0] ?? 0) as number
      }
      return tl
    }
    tl.restart = function () {
      restart.apply(tl, Array.from(arguments).slice(0, 2) as TimelineRestartArgs)
      tl["media"].currentTime = 0
      tl.time(0, true)
      return tl
    }
    tl.seek = function () {
      seek.apply(tl, Array.from(arguments).slice(0, 2) as TimelineSeekArgs)
      tl["media"].currentTime = arguments[0]
      tl.time(arguments[0] / duration, true)
      return tl
    }
    tl.timeScale(this.timeScale)
    this.timelineManager.add(tl)
  }

  /*=============================================*/
  /* Error handling and tear down */

  private handleMediaError(error: MediaError): void {
    if (this.onFallback || (this.timelineManager.isActive() && this.isPlaying()) || !this.canPlay) {
      return
    }
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
    if (this.isPlaying() || this.onFallback || this.timelineManager.isActive()) {
      return
    }
    this.element
      .play()
      .then(() => {
        this.beginPlay()
      })
      .catch(() => {
        this.timelineManager.restart().pause()
        this.addPlayOnInteraction()
      })
  }

  private beginPlay(): void {
    if (this.onFallback) {
      return
    }
    logger.debug("entered beginPlay function")
    this.transitionToVideo()
    if (!this.timelineManager.isActive() && this.timelineManager.timelines.length) {
      const tlDuration = this.timelineManager.currentTimeline?.duration()
      if (tlDuration && tlDuration > 0 && this.timelineManager.currentTimeline) {
        this.timelineManager.play()
      } else {
        return
      }
    }
    logger.debug("Playing video")
    gsap.set(this.element, show())
    this.setVideoDimensionVars()
    document.removeEventListener("click", this.addPlayOnInteraction)
    document.removeEventListener("touchstart", this.addPlayOnInteraction)
  }

  private addPlayOnInteraction(): void {
    const playOnInteraction = () => {
      this.element
        .play()
        .then(() => {
          this.beginPlay()
        })
        .catch((e) => {
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
      .then(() => {
        this.beginPlay()
      })
      .catch(() => {
        this.transitionToVideo(true)
        document.addEventListener("click", playOnInteraction)
        document.addEventListener("touchstart", playOnInteraction)
        logger.info("Added play on interaction listeners")
      })
  }

  private setVideoDimensionVars(): void {
    if (this.onFallback && this.canPlay && this.element.readyState >= 3) {
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
    // Replace this.element.src with a URL pointing to a video that uses a supported codec -- the mimetype details should prevent this, but sometimes browsers aren't the brightest
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
        .then(() => {
          this.beginPlay()
        })
        .catch(() => {
          this.timelineManager.restart().pause()
          this.addPlayOnInteraction()
        })
    })
  }

  private backupIsPoster(): boolean {
    const { baseName } = this.video.heroVideo
    return baseName === BACKUP_PICTURE
  }

  private loadBackup(): void {
    if (this.backupIsPoster()) {
      this.backupPicture = this.poster
    }
    if (!elementInDom(this.backupPicture)) {
      requestAnimationFrame(() => {
        this.container.append(this.backupPicture)
        this.exchangePosters(this.backupPicture, this.poster)
      })
    }
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
        toggleActiveClass(this.element, "hero__video", false)
        if (elementInDom(this.element)) {
          this.container.removeChild(this.element)
        }
      })
      .set(this.container, show())
      .set(gsap.utils.toArray("*", this.ctaContainer), show())
      .to(this.backupPicture, { ...show(), duration: 1 })
    newTl.add(this.setEmphasisAnimations())
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

  private handlePlay(): void {
    if (this.onFallback) {
      logger.debug("On fallback. Cannot play.")
      return
    }
    if (this.timelineManager.isActive()) {
      return
    } else if (this.isPlaying()) {
      this.timelineManager.resume()
      return
    } else if (
      this.timelineManager.currentTimeline &&
      this.timelineManager.currentTimeline["media"]
    ) {
      try {
        if (
          this.timelineManager.currentTimeline["media"].ended &&
          !this.timelineManager?.text()?.isActive()
        ) {
          this.element.currentTime = 0
          this.timelineManager.restart().play()
        }
      } catch (error) {
        logger.error("Error handling video play: ", error)
      }
    }
    if (!this.timelineManager.isActive()) {
      this.timelineManager.play()
    }
    logger.info("Video playback started.")
  }

  private debugDump(): void {
    const videoTl = this.timelineManager.video()
    const textTl = this.timelineManager.text()
    logger.debug("Debugging VideoManager State", {
      currentTime: this.element.currentTime,
      isPlaying: this.isPlaying(),
      canPlay: this.canPlay,
      hasPlayed: this.hasPlayed,
    })
    logger.debug("Debugging VideoManager timelines: ", {
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

  public relativeToDuration(realTime: number) {
    return realTime * this.timeScale
  }

  public timeLeft(): number {
    return this.videoDuration - this.element.currentTime
  }

  public play(): void {
    this.handlePlay()
  }

  public pause(): void {
    if (this.onFallback) {
      return
    }
    this.timelineManager.pause()
  }

  public resume(): void {
    if (this.onFallback) {
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
  }
}
