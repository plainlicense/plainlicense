import gsap from "gsap"
import { logger } from "~/utils"

/**
 * TimelineManager
 * @description Manages multiple GSAP timelines in a loop; using a master timeline doesn't work with the video tweening, so we need to daisy chain the timelines together
 */
export class TimelineManager {
  public timelines: GSAPTimeline[]
  public currentTimeline: GSAPTimeline | null
  public paused: boolean = true
  public timelinesDuration: number = 0
  get currentTimelineIndex() {
    if (!this.currentTimeline) {
      return -1
    }
    return this.timelines.indexOf(this.currentTimeline)
  }
  wrapper: (index: number) => GSAPTimeline
  constructor() {
    this.timelines = []
    this.currentTimeline = null
    this.wrapper = gsap.utils.wrap(this.timelines)
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

  onInit() {
    this.currentTimeline =
      this.currentTimelineIndex === -1 ? this.timelines[0] : this.wrapper(this.currentTimelineIndex)
    this.paused = false
    logger.debug("Starting timeline", this.currentTimeline.vars[0])
  }

  onEnd() {
    logger.debug("TimelineManager.onEnd")
    this.currentTimeline = this.wrapper(this.currentTimelineIndex + 1)
    logger.debug("Moving to timeline: ", this.currentTimeline.vars[0])
    this.currentTimeline.restart().play() // plays the next timeline, restarting if it's already completed
    this.paused = false
  }

  add(timeline: GSAPTimeline) {
    timeline.pause().seek(0)
    const currentOnStart = timeline["onStart"]
    const currentOnComplete = timeline["onComplete"]
    logger.debug("Adding timeline: ", timeline.vars[0])
    logger.debug("Timeline duration: ", timeline.duration())
    logger.debug("Timeline total duration: ", this.timelinesDuration)
    timeline["onComplete"] = () => {
      currentOnComplete && currentOnComplete()
      this.onEnd()
      return timeline
    }
    timeline["onStart"] = () => {
      this.onInit()
      currentOnStart && currentOnStart()
      return timeline
    }
    this.timelines.push(timeline)
    this.currentTimeline ??= timeline
    logger.debug("Current timeline set to: ", this.currentTimeline?.vars[0])
    this.timelinesDuration += timeline.duration()
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
    if (
      this.currentTimeline &&
      !this.isActive() &&
      this.currentTimeline.duration() !== this.currentTimeline.time()
    ) {
      this.currentTimeline.play()
    } else if (this.currentTimeline?.duration() === this.currentTimeline?.time()) {
      this.currentTimeline?.seek(0).pause()
      this.currentTimeline = this.wrapper(this.currentTimelineIndex + 1)
      this.currentTimeline.play()
    } else if (this.timelines.length > 0) {
      this.currentTimeline = this.timelines[0]
      this.currentTimeline.play()
    }
    this.paused = false
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
    return this.resume()
  }

  isActive() {
    return this.currentTimeline?.isActive() || false
  }

  video() {
    return this.timelines.find((timeline) => timeline.vars[0] === "videoTimeline")
  }

  text() {
    return this.timelines.find((timeline) => timeline.vars[0] === "textTimeline")
  }

  getActiveTimeline() {
    return this.currentTimeline
  }

  kill() {
    this.timelines.forEach((timeline) => {
      timeline.kill()
    })
    this.timelines = []
    this.currentTimeline = null
    this.paused = true
  }
}
