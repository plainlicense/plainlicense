import { logObject } from '../../utils/helpers';
import { logger } from '../../utils/log';
/**
 * TimelineManager
 * @description Manages multiple GSAP timelines in a loop;
 * using a master timeline doesn't work with the video tweening,
 * so we need to daisy chain the timelines together.
 */
export class TimelineManager {
  public timelines: GSAPTimeline[];
  public currentTimeline: GSAPTimeline | null;
  public paused = true;
  public isTransitioning = false;
  public timelinesDuration = 0;

  get currentTimelineIndex() {
    return this.currentTimeline ? this.timelines.indexOf(this.currentTimeline) : -1;
  }

  public wrapper: (index: number) => GSAPTimeline;

  constructor() {
    this.timelines = [];
    this.currentTimeline = null;
    this.wrapper = (index: number): GSAPTimeline => {
      if (this.timelines.length === 0) {
        throw new Error('No timelines available');
      }
      const nextIndex = this.timelines.length > index ? index : 0;
      // Always return a valid GSAPTimeline, fallback to first timeline if out of range
      return (this.timelines[nextIndex] as GSAPTimeline) ?? this.timelines[0];
    };
  }

  /**
   * Helper to reset a timeline: restart and then pause.
   */
  private resetTimeline(timeline: GSAPTimeline): void {
    timeline.restart().pause();
  }

  /**
   * Helper to register callbacks into a timeline.
   */
  private registerTimelineCallbacks(timeline: GSAPTimeline) {
    const currentOnStart = timeline.eventCallback('onStart');
    const currentOnComplete = timeline.eventCallback('onComplete');

    timeline.eventCallback('onStart', () => {
      logger.warn(`Timeline ${this.getTimelineName(timeline)} started`);
      this.onInit();
      if (currentOnStart) {
        currentOnStart.call(timeline);
      }
      this.isTransitioning = false;
    });

    timeline.eventCallback('onComplete', () => {
      logger.warn(`Timeline ${this.getTimelineName(timeline)} completed`);
      if (currentOnComplete) {
        currentOnComplete.call(timeline);
      }
      this.onEnd();
    });
  }

  private getSeekLocation(time: number) {
    this.timelines.forEach((timeline) => {
      this.resetTimeline(timeline);
      if (time > timeline.duration()) {
        let newTime = time;
        newTime -= timeline.duration();
      } else {
        timeline.seek(time);
      }
    });
  }

  transition() {
    const currentIndex = this.currentTimelineIndex;
    const nextTimeline = this.wrapper(currentIndex + 1);
    if (!this.isTransitioning && nextTimeline && !nextTimeline.isActive()) {
      this.isTransitioning = true;
      this.currentTimeline = nextTimeline;
      this.currentTimeline.restart();
      this.paused = false;
      logger.debug('Moving to timeline: ', this.getTimelineName());
      this.isTransitioning = false;
    } else {
      logger.debug('OnEnd: Timeline is transitioning or next timeline is active');
    }
  }

  onInit() {
    this.isTransitioning = false;
    logger.debug('TimelineManager.onInit called for timeline', this.getTimelineName());
    logger.debug("Timeline's duration: ", this.currentTimeline?.duration());
    this.currentTimeline =
      this.currentTimelineIndex === -1
        ? (this.timelines[0] ?? null)
        : (this.wrapper(this.currentTimelineIndex) ?? null);
    this.paused = false;
    logger.debug('Starting timeline', this.getTimelineName());
    if (this.currentTimeline && !this.currentTimeline.isActive()) {
      this.currentTimeline.play();
    }
  }

  onEnd() {
    logger.debug('TimelineManager.onEnd called for timeline', this.getTimelineName());
    logger.debug('Timeline ended at time:', this.currentTimeline?.time());
    this.transition();
    logger.debug(`Transition complete to timeline: ${this.getTimelineName(this.currentTimeline)}`);
  }

  add(timeline: GSAPTimeline) {
    timeline.pause().seek(0);
    logger.debug('Adding timeline: ', this.getTimelineName(timeline));
    logger.debug('Timeline duration: ', timeline.duration());
    logger.debug('Timeline total duration: ', this.timelinesDuration);

    // Register callbacks using helper
    this.registerTimelineCallbacks(timeline);

    this.timelines.push(timeline);
    this.currentTimeline ??= timeline;
    this.timelinesDuration += timeline.duration();
    logObject(timeline, `Timeline: ${this.getTimelineName(timeline)}`);
    return this;
  }

  restart() {
    if (this.timelines.length === 0) {
      logger.warn('No timelines available to restart.');
      return this;
    }
    this.timelines.forEach((timeline) => this.resetTimeline(timeline));
    this.currentTimeline = this.timelines[0] ?? null;
    this.paused = false;
    return this.play();
  }

  play() {
    if (this.timelines.length === 0) {
      logger.warn('No timelines to play');
      return this;
    }
    if (this.isTransitioning) {
      logger.warn('Timeline is transitioning, cannot play');
      return this;
    }
    this.resume();
    return this;
  }

  resume() {
    if (this.currentTimeline && !this.currentTimeline.isActive()) {
      this.currentTimeline.resume();
    }
    this.paused = false;
    return this;
  }

  pause() {
    if (this.currentTimeline?.isActive()) {
      this.currentTimeline.pause();
    }
    this.paused = true;
    return this;
  }

  seek(time: number) {
    this.getSeekLocation(time);
    this.resume();
    return this;
  }

  isActive() {
    return this.currentTimeline?.isActive();
  }

  video() {
    return this.timelines.find(
      (timeline) =>
        this.getTimelineName(timeline) === 'videoTimeline' ||
        timeline.media instanceof HTMLVideoElement,
    );
  }

  text() {
    return this.timelines.find((timeline) => this.getTimelineName(timeline) === 'textTimeline');
  }

  getActiveTimeline() {
    return this.currentTimeline;
  }

  getTimelineName(timeline: GSAPTimeline | null = this.currentTimeline) {
    return timeline?.vars[0] ?? 'not named';
  }

  kill() {
    this.timelines.forEach((timeline) => {
      timeline.kill();
    });
    this.timelines = [];
    this.currentTimeline = null;
    this.paused = true;
    this.isTransitioning = false;
    this.timelinesDuration = 0;
    return this;
  }
}
