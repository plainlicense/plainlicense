import { logger, logObject } from "~/utils"

/**
 * TimelineManager
 * @description Manages multiple GSAP timelines in a loop; using a master timeline doesn't work with the video tweening, so we need to daisy chain the timelines together
 */
export class TimelineManager {
  public timelines: GSAPTimeline[]
  public currentTimeline: GSAPTimeline | null
  public paused: boolean = true
  public isTransitioning: boolean = false
  public timelinesDuration: number = 0
  get currentTimelineIndex() {
    if (!this.currentTimeline) {
      return -1
    }
    return this.timelines.indexOf(this.currentTimeline)
  }
  public wrapper: (index: number) => GSAPTimeline
  constructor() {
    this.timelines = []
    this.currentTimeline = null
    this.wrapper = (number: number) => {
      return this.timelines[number % this.timelines.length]
    }
  }

  private getSeekLocation(time: number) {
    this.timelines.forEach((timeline) => {
      timeline.restart().pause()
      if (time > timeline.duration()) {
        time -= timeline.duration()
      } else {
        timeline.seek(time)
        time = 0
      }
    })
  }

  transition() {
    const currentIndex = this.currentTimelineIndex
    if (!this.isTransitioning && !this.wrapper(currentIndex + 1)?.isActive()) {
      this.isTransitioning = true
      this.currentTimeline?.restart().pause()
      this.currentTimeline = this.wrapper(currentIndex + 1)
      this.currentTimeline?.pause().seek(0)
      this.currentTimeline?.play()
      this.paused = false
      logger.debug("Moving to timeline: ", this.getTimelineName())
      this.isTransitioning = false
    } else {
      logger.debug("OnEnd: Timeline is transitioning or next timeline is active")
    }
  }

  onInit() {
    this.isTransitioning = false
    logger.debug("TimelineManager.onInit called for timeline ", this.getTimelineName())
    logger.debug("Timeline's duration: ", this.currentTimeline?.duration())
    this.currentTimeline =
      this.currentTimelineIndex === -1 ? this.timelines[0] : this.wrapper(this.currentTimelineIndex)
    this.paused = false
    logger.debug("Starting timeline", this.getTimelineName())
    if (!this.currentTimeline.isActive()) {
      this.currentTimeline.play()
    }
  }

  onEnd() {
    logger.debug("TimelineManager.onEnd called for timeline ", this.getTimelineName()) // Direct logger for debugging
    logger.debug("Timeline ended at time: ", this.currentTimeline?.time())
    this.transition()
    logger.debug(`Transition complete to timeline: ${this.getTimelineName(this.currentTimeline)}`)
  }

  add(timeline: GSAPTimeline) {
    timeline.pause().seek(0)

    // Use GSAP's official callback registration method instead
    const currentOnStart = timeline.eventCallback("onStart")
    const currentOnComplete = timeline.eventCallback("onComplete")

    logger.debug("Adding timeline: ", this.getTimelineName(timeline))
    logger.debug("Timeline duration: ", timeline.duration())
    logger.debug("Timeline total duration: ", this.timelinesDuration)

    // Register callbacks using GSAP's official method
    timeline.eventCallback("onComplete", () => {
      logger.warn(`Timeline ${this.getTimelineName(timeline)} completed`) // Direct logger log for debugging
      if (currentOnComplete) {
        currentOnComplete.call(timeline)
      }
      this.onEnd()
    })

    timeline.eventCallback("onStart", () => {
      logger.warn(`Timeline ${this.getTimelineName(timeline)} started`) // Direct logger log for debugging
      this.onInit()
      if (currentOnStart) {
        currentOnStart.call(timeline)
      }
      this.isTransitioning ??= false
    })

    this.timelines.push(timeline)
    this.currentTimeline ??= timeline
    logger.debug("Current timeline set to: ", this.getTimelineName())
    this.timelinesDuration += timeline.duration()
    logObject(timeline, `Timeline: ${this.getTimelineName()}`)
    return this
  }

  restart() {
    if (this.timelines.length === 0) {
      logger.warn("No timelines available to restart.")
      return this
    }
    this.timelines.forEach((timeline) => {
      timeline.restart().pause()
    })
    this.currentTimeline = this.timelines[0]
    this.paused = false
    return this.play()
  }

  play() {
    // If we have no timelines, do nothing
    if (this.timelines.length === 0) {
      logger.warn("No timelines to play")
      return this
    }
    if (this.isTransitioning) {
      logger.warn("Timeline is transitioning, cannot play")
      return this
    }
    // Force check if the current timeline is at its end
    if (
      this.currentTimeline &&
      Math.abs(this.currentTimeline.duration() - this.currentTimeline.time()) < 0.01
    ) {
      this.transition()
    }
    // Normal play logic
    else if (this.currentTimeline && !this.isActive() && !this.isTransitioning) {
      logger.warn(`Playing timeline: ${this.getTimelineName()}`)
      this.currentTimeline.play()
    }
    // Default to first timeline
    else if (!this.currentTimeline && this.timelines.length > 0) {
      this.currentTimeline = this.timelines[0]
      logger.warn(`Starting first timeline: ${this.getTimelineName()}`)
      this.currentTimeline.play()
    }
    this
    return this
  }

  resume() {
    if (this.currentTimeline && !this.currentTimeline.isActive()) {
      this.currentTimeline.resume()
    }
    this.paused = false
    return this
  }

  pause() {
    if (this.currentTimeline && this.currentTimeline.isActive()) {
      this.currentTimeline.pause()
    }
    this.paused = true
    return this
  }

  seek(time: number) {
    this.getSeekLocation(time)
    this.resume()
    return this
  }

  isActive() {
    return this.currentTimeline?.isActive() || false
  }

  video() {
    return this.timelines.find(
      (timeline) =>
        this.getTimelineName(timeline) === "videoTimeline" ||
        timeline["media"] instanceof HTMLVideoElement,
    )
  }

  text() {
    return this.timelines.find((timeline) => this.getTimelineName(timeline) === "textTimeline")
  }

  getActiveTimeline() {
    return this.currentTimeline
  }

  getTimelineName(timeline: GSAPTimeline | null = this.currentTimeline) {
    return timeline?.vars[0] ?? "not named"
  }

  kill() {
    this.timelines.forEach((timeline) => {
      timeline.kill()
    })
    this.timelines = []
    this.currentTimeline = null
    this.paused = true
    this.isTransitioning = false
    this.timelinesDuration = 0
    return this
  }
}
