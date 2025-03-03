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
import { HeroStore, VideoState } from "~/state"
import {
  elementInDom,
  logger,
  logObject,
  parsePath,
  prefersReducedMotion$,
  setCssVariable,
} from "~/utils"
import {
  HeroVideo,
  TimelinePauseArgs,
  TimelinePlayResumeArgs,
  TimelineRestartArgs,
  TimelineSeekArgs,
  VideoStatus,
} from "./types"
import { getHeroVideos, toggleActiveClass } from "./utils"
import { VideoElement } from "./videoElement"
import { plainLogo } from "./data"
import { SectionIndex } from "../animations"

let customWindow: CustomWindow = window as unknown as CustomWindow

const { document$ } = customWindow

/**
 * TODO: Add special pause/play/resume to masterTimeline
 */

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
    gsap.set(logoContainer, { autoAlpha: 0, scale: 0, yPercent: 5 })
    logger.debug("Logo created and appended:", img)
    return img
  })()

  public hasPlayed: boolean = false

  public status: VideoStatus = "not_initialized"

  public canPlay: boolean = false

  private emphasisSet: boolean = false

  private get videoDuration(): number {
    return this.element?.duration ?? VIDEO_END_BUFFER
  }

  private get titleStart(): number {
    return Math.max(this.videoDuration - VIDEO_END_BUFFER + 0.5, VIDEO_END_BUFFER + 0.5)
  }

  private get timeScale(): number {
    return 1 / this.videoDuration
  }

  private vidDefaults: gsap.TimelineVars = {
    callbackScope: this,
    onStart: () => {
      this.transitionToVideo()
      this.status = "playing"
    },
    onComplete: () => {
      this.status = "on_textAnimation"
    },
    repeat: 0,
    paused: true,
  }

  private textDuration: number = 10

  private textDefaults: gsap.TimelineVars = {
    defaults: {
      paused: true,
      repeat: 0,
      callbackScope: this,
    },
    duration: () => this.relativeToDuration(this.textDuration),
    paused: true,
    callbackScope: this,
    repeat: 0,
    onStart: () => {
      logger.debug("Text animation timeline started")
      this.hasPlayed = true
      this.status = "on_textAnimation"
      gsap.set(
        gsap.utils.toArray("*", this.container.querySelector(".text-animation__container")),
        {
          visibility: "visible",
        },
      )
    },
    onComplete: () => {
      logger.debug("Text animation timeline completed")
      this.status = "playing"
      // Prepare the video for the next cycle
      this.element.currentTime = 0
      gsap.set(
        gsap.utils.toArray("*", this.container.querySelector(".text-animation__container")),
        { visibility: "hidden" },
      )
    },
  }

  public masterTimeline: GSAPTimeline = gsap.timeline({
    callbackScope: this,
    repeat: -1,
    paused: true,
    log: true,
    onRepeat: () => {
      this.hasPlayed = true
      if (!this.emphasisSet) {
        this.setEmphasisAnimations().play()
      }
      this.element.currentTime = Math.min(this.element.currentTime, 0)
      this.element.load()
      this.status = "playing"
    },
    onStart: () => {
      gsap.set(this.parentContainer, {
        visibility: "visible",
        opacity: 1,
        contentVisibility: "visible",
      })
      logger.debug("Master timeline started")
      this.debugDump()
    },
    onComplete: () => {
      logger.debug("Master timeline completed")
      this.debugDump()
    },
  })

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

    const video$ = videoState$.pipe(
      distinctUntilKeyChanged("canPlay"),
      tap((state) => {
        logger.info("Received new video state", state)
        if (state.canPlay) {
          this.canPlay = true
        } else {
          this.canPlay = false
        }
      }),
    )

    const statusSetter$ = state$.pipe(
      map(({ canPlay, prefersReducedMotion, currentSection }) => ({
        canPlay,
        prefersReducedMotion,
        currentSection,
      })),
      tap(({ prefersReducedMotion }) => this.handleReducedMotion({ prefersReducedMotion })),
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

    // we handle the very unlikely edge case of someone turning off prefersReducedMotion while on site; we handle the normal case in statusSetter$
    const motionSub$ = prefersReducedMotion$.pipe(
      distinctUntilChanged((prev, cur) => prev === cur),
      skipUntil(videoState$),
      skipUntil(prefersReducedMotion$.pipe(filter((prefersReducedMotion) => prefersReducedMotion))), // skip until we get a reduced signal
      skipWhile((prefersReducedMotion) => prefersReducedMotion), // then skip until we don't get one again
      distinctUntilChanged((prev, cur) => prev === cur),
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
            return of(this.play()).pipe(
              tap(() => {
                logger.info("Playing the video after stalled event")
              }),
            )
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
      distinctUntilKeyChanged("timeStamp"),
      tap(() => {
        logger.debug("Received playing event")
        this.beginPlay()
      }),
    )

    const secondaryObservables = [
      varSet$,
      motionSub$,
      stallHandler$,
      errorHandler$,
      playing$,
      resize$,
    ]

    const videoObserver = {
      next: (videoState: VideoState) => {
        logger.info("Received new video signal for canPlay: ", videoState.canPlay)
        this.canPlay = videoState.canPlay
        logger.info("Manager Can play: ", this.canPlay)
        if (videoState.canPlay) {
          logger.info("Received can play signal")
          secondaryObservables.forEach((obs: Observable<any>) => {
            if (obs !== motionSub$) {
              // motionSub$ needs to stay alive when others are unsubscribed by prefersReducedMotion signal
              logger.debug(`Subscribing to secondary observable: ${logObject(obs)}`)
              this.subscriptions.add(obs.subscribe())
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
    this.subscriptions.add(video$.subscribe(videoObserver))
    this.subscriptions.add(statusSetter$.subscribe())
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    logger.info("Initializing VideoManager")
    this.videoStore = getHeroVideos()
    this.initVideo()
    this.buildMasterTimeline()
    this.initSubscriptions()
    this.debugDump()
  }

  private initVideo(): void {
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
      if (!this.container.getElementsByTagName("video").length) {
        this.container.append(this.element)
      }
      if (!this.container.getElementsByTagName("picture").length) {
        this.container.append(this.poster)
      }
      if (this.videoStore.length > 1 && !this.backupIsPoster()) {
        this.backupPicture = new VideoElement(
          randomized.find((hero) => hero.baseName === BACKUP_PICTURE) || randomized[1],
        ).picture
      } else {
        this.backupPicture = this.video.picture.cloneNode(true) as HTMLPictureElement
      }
      this.backupPicture.classList.replace("hero__poster", "hero__backup")
      this.backupPicture.classList.replace("hero__poster--active", "hero__backup--inactive")
      this.container.append(this.backupPicture)
      gsap.set(this.container, { visibility: "visible", contentVisibility: "visible" })
      gsap.set(this.parentContainer, {
        visibility: "visible",
        opacity: 1,
        contentVisibility: "visible",
      })
      this.loadSequence()
    }
  }

  public static getInstance(): VideoManager {
    return (this.instance ??= new VideoManager())
  }

  private transition(el: HTMLElement, hide = false) {
    const contentVisibilityProp = gsap.getProperty(el, "contentVisibility")
    if (
      (contentVisibilityProp === "hidden" && !hide) ||
      (contentVisibilityProp === "visible" && hide)
    ) {
      gsap.set(el, { contentVisibility: hide ? "hidden" : "visible" })
    }
    gsap.to(el, {
      autoAlpha: hide ? 0 : 1,
      duration: 0.5,
    })
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
      Promise.resolve(this.element.load())
        .then(() => {
          if (this.canPlay) {
            this.transition(this.element)
            this.transition(this.container)
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
    gsap.set(this.poster, { autoAlpha: 0 })
    this.exchangePosters(this.poster, this.backupPicture)
    const img = this.poster.querySelector("img")
    const transition = () => {
      gsap.to(this.poster, { autoAlpha: 1, duration: 0.5 })
      gsap.to(this.container, { autoAlpha: 1, contentVisibility: "visible" })
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
        this.status = "loaded"
        this.play()
      })
    })
  }

  private handleCanPlay(): void {
    this.canPlay = true
    logger.info("Handling can play event")
    switch (this.status) {
      case "not_initialized":
        this.initVideo()
        break
      case "loading":
        if (
          this.element.readyState <= 3 &&
          (!this.element.duration || this.element.duration < 1 || !elementInDom(this.poster))
        ) {
          this.loadSequence()
        } else {
          this.play()
        }
        break
      case "playing":
      case "paused":
      case "on_textAnimation":
        this.resume()
        break
      case "loaded":
        logger.info("Video loaded. Playing.")
        if (!this.masterTimeline.isActive()) {
          this.masterTimeline.play()
        }
        break
      default:
        if (!this.masterTimeline.duration() || !this.element.duration) {
          this.initVideo()
        } else {
          this.initiateFallback()
          throw new Error("Unhandled video status")
        }
        break
    }
  }

  /*================== Animations =================*/

  private animateText(overrideVars: gsap.TweenVars = {}): GSAPTimeline {
    const tl = gsap.timeline(this.textDefaults)
    return tl
      .call(
        function () {
          logger.info("Text animation started")
        },
        [],
        0,
      )
      .set(".text-animation__container", { autoAlpha: 1 })
      ["animateMessage"](".text-animation__container", {
        message: this.message,
        repeat: 0,
        duration: () => this.relativeToDuration(7),
        callbackScope: this,
        extendTimeline: true,
        entranceToVars: {
          stagger: { each: this.relativeToDuration(0.08) },
          duration: this.relativeToDuration(2),
          ease: "power2.out",
        },
        exitVars: { duration: this.relativeToDuration(2) },
        ...overrideVars,
      })
      .call(
        function () {
          logger.info("Text animation completed")
          logger.debug(
            `text timeline vars, duration: ${tl.duration}, exitVars duration: ${tl["exitVars"].duration}`,
          )
        },
        [],
        ">",
      )
  }

  private buildMasterTimeline(): void {
    this.masterTimeline
      .add(this.mediaTimeline(), "videoTimeline")
      .add(["textTimeline", this.buildTextTimeline()], ">")
    this.masterTimeline["video"] = (() => {
      const tl = this.masterTimeline
        .getChildren(false, false, true)
        .filter((tl) => tl instanceof gsap.core.Timeline)
        .find((tl: GSAPTimeline) => {
          return tl.vars[0] === "videoTimeline"
        })
      if (!tl) {
        throw new Error("Video timeline not found")
      }
      return tl
    })()
  }

  private buildTextTimeline(): GSAPTimeline {
    const ctaHeaders = gsap.utils.toArray("h1, h2", this.ctaContainer)
    return gsap
      .timeline(["textTimeline", this.textDefaults])
      .add(this.animateText(), 0)
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
    const tl = gsap.timeline([
      "emphasisTimeline",
      {
        repeat: -1,
        paused: false,
        delay: Math.min(VIDEO_END_BUFFER, 2),
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
      this.masterTimeline.pause()
      this.masterTimeline.seek("videoTimeline")
    } else {
      this.masterTimeline.play("videoTimeline")
    }
  }

  /**
   * Creates a GSAP timeline that synchronizes with a media element.
   * This allows for animations to be timed with the media playback.
   * *slightly modified from https://gsap.com/community/forums/topic/22234-control-video-html-tag/#comment-187059 thanks Jack!*
   * @param config - GSAP timeline configuration.
   * @returns A GSAP timeline instance linked to the media element.
   */
  private mediaTimeline(): GSAPTimeline {
    const config = this.vidDefaults
    const ctaHeadings = gsap.utils.toArray("h1, h2", this.ctaContainer)
    let duration = this.videoDuration,
      onUpdate = config && config.onUpdate,
      tl = gsap.timeline([
        "videoTimeline",
        {
          onStart: function () {
            this.transitionToVideo()
            gsap.set(this.element, { autoAlpha: 1, visibility: "visible" })
            if (!this.isPlaying()) {
              this.element.foulPlay()
              tl.seek(this.videoDuration ? this.element.currentTime : 0, true)
            }
          },
          onComplete: () => {
            gsap.set(this.element, { autoAlpha: 0, visibility: "hidden" })
          },
          callbackScope: this,
          paused: true,
          onUpdate() {
            if (tl.paused() || Math.abs(tl.time() * duration - this.element.currentTime) > 0.5) {
              this.element.currentTime = tl.time() * duration
            }
            onUpdate && onUpdate.call(tl)
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
    tl["media"] = this.element
    tl["status"] = this.status
    tl["foulPlay"] = this.foulPlay.bind(this)
    tl.set({}, {}, 1)
      .set([this.element, this.container, this.ctaContainer], { autoAlpha: 1 }, 0)
      .add(gsap.to(ctaHeadings, { autoAlpha: 1, duration: this.relativeToDuration(0.3) }), 0)
      .add(
        gsap.to(gsap.utils.toArray("h1, h2", this.ctaContainer), {
          autoAlpha: 0,
          duration: this.relativeToDuration(0.5),
        }),
        this.relativeToDuration(this.titleStart),
      )
      .add(
        gsap.to(this.element, { autoAlpha: 0, duration: this.relativeToDuration(0.5) }),
        this.relativeToDuration(this.titleStart),
      )
    this.element.addEventListener("durationchange", updateDuration)
    updateDuration()
    this.element.onplay = () => tl.play()
    this.element.onpause = () => tl.pause()
    this.element.ontimeupdate = () => {
      tl.time(this.relativeToDuration(this.element.currentTime), true)
    }
    this.element.onseeked = () => {
      tl.time(this.relativeToDuration(this.element.currentTime), true)
    }
    this.element.oncanplaythrough = () => {
      updateDuration()
      tl.time(this.relativeToDuration(this.element.currentTime), true)
      if (!tl.isActive()) {
        tl.play()
      }
    }
    this.element.onended = () => {
      tl.seek(0).pause()
      this.status = "on_textAnimation"
    }
    this.element.onplaying = () => {
      this.status = "playing"
      tl.play()
    }
    this.element.onloadedmetadata = () => {
      updateDuration()
    }
    this.element.onpause = () => {
      this.status = "paused"
      tl.pause()
    }
    this.element.onwaiting = () => {
      this.status = "loading"
      tl.pause()
    }
    tl.pause = function () {
      this["media"].pause()
      pause.apply(tl, Array.from(arguments).slice(0, 2) as TimelinePauseArgs)
      return tl
    }
    tl.play = function () {
      this["foulPlay"]()
      play.apply(tl, Array.from(arguments).slice(0, 2) as TimelinePlayResumeArgs)
      if (arguments.length) {
        this["media"].currentTime = arguments[0] as number
      }
      return tl
    }
    tl.restart = function () {
      restart.apply(tl, Array.from(arguments).slice(0, 2) as TimelineRestartArgs)
      this["media"].currentTime = 0
      return tl
    }
    tl.seek = function (time: number) {
      seek.apply(tl, Array.from(arguments).slice(0, 2) as TimelineSeekArgs)
      this["media"].currentTime = time
      tl.time(time / duration, true)
      return tl
    }
    return tl
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
        } else if (currentSection >= SectionIndex.Impact || this.masterTimeline.paused()) {
          return this.masterTimeline.totalProgress() > 0 || this.hasPlayed ? "paused" : "loaded"
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
        this.masterTimeline.paused()
      ) {
        return this.element.currentTime > 0 || this.hasPlayed ? "paused" : "loaded"
      } else if (
        (!this.element.duration && this.element.readyState === 0) ||
        !elementInDom(this.element)
      ) {
        return "not_initialized"
      } else if (this.masterTimeline.totalProgress() > 0) {
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
    if (this.isPlaying() || this.status === "on_fallback" || this.masterTimeline.isActive()) {
      return
    }
    this.element
      .play()
      .then(() => {
        this.beginPlay()
      })
      .catch(() => {
        this.masterTimeline.seek("videoTimeline").pause()
        this.addPlayOnInteraction()
      })
  }

  private beginPlay(): void {
    logger.debug("entered beginPlay function")
    this.transitionToVideo()
    if (!this.masterTimeline.isActive()) {
      logger.debug("Master timeline is not active. trying to play.")
      this.masterTimeline.play()
    } else {
      logger.debug("Master timeline is active. Resuming.")
      this.masterTimeline.resume()
    }
    logger.debug("Playing video")
    this.status = "playing"
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
          this.masterTimeline.seek("videoTimeline").pause()
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
    this.loadBackup()
    const newTl = gsap.timeline({ paused: false, defaults: { repeat: 0 } })
    newTl
      .add(["fallback", gsap.set(this.element, { autoAlpha: 0, duration: 0.5 })], 0)
      .call(() => {
        toggleActiveClass(this.element, "hero__video", false)
        this.status = "on_fallback"
        if (elementInDom(this.element)) {
          this.container.removeChild(this.element)
        }
      })
      .set(this.container, { autoAlpha: 1 })
      .set(this.ctaContainer, { autoAlpha: 1 })
      .to(this.backupPicture, { autoAlpha: 1, duration: 1 })
    newTl.add(this.setEmphasisAnimations())
    this.masterTimeline.kill()
    this.masterTimeline = newTl
    this.masterTimeline.play()
    this.subscriptions.unsubscribe()
    logger.info("Initiated fallback")
  }

  private reinit(): void {
    this.masterTimeline.kill()
    this.status = "not_initialized"
    VideoManager.instance = undefined
    VideoManager.getInstance()
  }

  private handlePlay(): void {
    if (this.isOnFallback()) {
      return
    }
    if (this.masterTimeline.isActive()) {
      logger.debug("Master timeline is active. Resuming.")
      this.masterTimeline.resume()
      return
    }
    this.masterTimeline.play()
    logger.info("Video playback started.")
  }

  private debugDump(): void {
    const videoTl = this.masterTimeline.getChildren(false, false, true).find((tl) => {
      return tl.vars[0] === "videoTimeline"
    })
    const textTl = this.masterTimeline.getChildren(false, false, true).find((tl) => {
      return tl.vars[0] === "textTimeline"
    })
    logger.debug("Debugging VideoManager State", {
      status: this.status,
      currentTime: this.element.currentTime,
      isPlaying: this.isPlaying(),
      canPlay: this.canPlay,
      hasPlayed: this.hasPlayed,
    })
    logger.debug("Debugging VideoManager timelines: ", {
      masterTimeline: this.masterTimeline,
      textTimeline: textTl || null,
      videoTimeline: videoTl || null,
      masterDuration: this.masterTimeline.duration(),
      masterTimeScale: this.masterTimeline.timeScale(),
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
    this.handlePlay()
  }

  public pause(): void {
    if (this.status === "on_fallback") {
      return
    }
    this.masterTimeline.pause()
  }

  public resume(): void {
    if (this.status === "on_fallback") {
      return
    }
    if (!this.masterTimeline.isActive()) {
      this.masterTimeline.resume()
    }
  }

  public restart(): void {
    this.masterTimeline.restart()
  }

  public seek(time: number): void {
    this.masterTimeline.seek(time)
  }
}
