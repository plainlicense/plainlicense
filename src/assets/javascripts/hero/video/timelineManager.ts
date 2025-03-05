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
  get timelinesDuration() {
    return this.timelines.reduce((acc, timeline) => acc + timeline.duration(), 0)
  }
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

  updateSelf(timeline: GSAPTimeline) {
    logger.debug("TimelineManager.updateSelf", timeline)
    this.currentTimeline = timeline
    this.paused = false
  }

  onComplete() {
    logger.debug("TimelineManager.onComplete")
    this.currentTimeline = this.wrapper(this.currentTimelineIndex + 1)
    this.currentTimeline.play()
    this.wrapper(this.currentTimelineIndex - 1)
      .seek(0)
      .pause()
  }

  add(timeline: GSAPTimeline) {
    timeline.pause().seek(0)
    const currentOnStart = timeline.eventCallback("onStart")
    const currentOnComplete = timeline.eventCallback("onComplete")
    timeline.eventCallback("onStart", () => {
      this.updateSelf(timeline)
      if (currentOnStart) {
        currentOnStart()
      }
    })
    timeline.eventCallback("onComplete", () => {
      this.onComplete()
      if (currentOnComplete) {
        currentOnComplete()
      }
    })
    this.timelines.push(timeline)
    if (!this.currentTimeline) {
      this.currentTimeline = timeline
    }
    return this
  }

  restart() {
    this.timelines.forEach((timeline) => {
      timeline.restart().pause()
    })
    this.currentTimeline = this.timelines[0]
    this.paused = false
    return this.play()
  }

  play() {
    if (this.currentTimeline && !this.isActive()) {
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
    if (this.currentTimeline) {
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
