/**
 * @module VideoElement
 * @description constructs a video element with sources and properties, and a corresponding picture element to be used as a poster
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import { MAX_WIDTHS } from "~/config"
import { logger } from "~/utils"
import { HeroVideo, ImageIndex, VideoWidth } from "./types"
import { getMediaType, srcToAttributes } from "./utils"

/**
 * @class VideoElement
 * @description A class to construct a video element with sources and properties. Also constructs a picture element to be used as a poster.
 * @param heroVideo - The hero video object (required)
 */
export class VideoElement {
  public video: HTMLVideoElement = document.createElement("video")

  private sources: HTMLSourceElement[]

  public heroVideo: HeroVideo

  private poster: ImageIndex

  public picture = document.createElement("picture")

  private properties: { [key: string]: string } = {}

  public message: string = ""

  constructor(heroVideo: HeroVideo, properties?: { [key: string]: string }) {
    this.video.classList.add("hero__video", "hero__video--active")
    this.heroVideo = heroVideo
    this.poster = heroVideo.poster
    this.message = heroVideo.message || ""
    this.properties = this.getProperties(properties || {})
    logger.debug("Video Properties: ")
    logger.table(this.properties)
    for (const prop of Object.keys(this.properties)) {
      const key = typeof prop === "string" ? prop : `${prop}`
      try {
        this.video.setAttribute(prop, this.properties[key])
      } catch (e) {
        logger.error(`Error setting property ${key} on video element: ${e}`)
      }
    }
    this.video = this.constructVideoElement()
    this.sources = this.constructSources()
    this.video.append(...this.sources)
    this.video.muted = true
    logger.debug("video element: %o", this.video)
    logger.debug("sources: %o", this.sources)
    this.picture = this.constructPictureElement()
  }

  // assign properties to the video element
  private getProperties(properties: { [key: string]: string }) {
    return {
      disablePictureInPicture: String(true),
      playsinline: String(true),
      preload: "metadata",
      muted: String(true),
      loop: String(true),
      autoplay: "",
      dataNoSnippet: String(true),
      volume: "0.0",
      ...properties,
    }
  }

  // construct the video element
  private constructVideoElement() {
    const { video } = this
    for (const prop of Object.keys(this.properties)) {
      const key = typeof prop === "string" ? prop : `${prop}`
      try {
        video.setAttribute(prop, this.properties[key])
      } catch (e) {
        logger.error(`Error setting property ${key} on video element: ${e}`)
      }
    }
    return video
  }

  // make the source elements for the video element
  private constructSources() {
    const { heroVideo } = this
    let srcs = []
    for (const [codec, variant] of Object.entries(heroVideo.variants)) {
      if (codec === "av1" || codec === "vp9" || codec === "h264") {
        for (const [width, url] of Object.entries(variant)) {
          const w =
            typeof width === "string" ? (parseInt(width, 10) as VideoWidth) : (width as VideoWidth)
          const src = document.createElement("source")
          const codecVariant = url
          src.src = codecVariant.href
          src.type = getMediaType(codec, w)

          logger.debug(`Adding source: ${src.src} with type: ${src.type}`)
          src.media = w !== 3840 ? `(max-width: ${MAX_WIDTHS[w]}px)` : ""
          srcs.push(src)
        }
      }
    }
    // we need to sort sources so they are organized first by width
    // from largest to smallest, then by codec type with av1 first then vp9
    return srcs.sort((a, b) => {
      const [aCodec, aWidth] = srcToAttributes(a.src)
      const [bCodec, bWidth] = srcToAttributes(b.src)
      if (aWidth === bWidth) {
        // we're comparing the same width
        switch (aCodec) {
          case "av1":
            return -1
          case "vp9":
            return bCodec === "av1" ? 1 : -1
          case "h264":
            return 1 // h264 should always be last if widths are equal
          default:
            throw new Error(`Unknown codec: ${aCodec}`)
        }
      } else {
        return aWidth - bWidth
      }
    })
  }

  // get the sizes attribute for the poster image
  private getSizes() {
    const { heroVideo } = this
    const { poster } = heroVideo
    const { png } = poster
    const { widths } = png
    let sizes = ""
    for (const width of Object.keys(widths)) {
      const w = parseInt(width, 10) as VideoWidth
      if (width in MAX_WIDTHS) {
        // @ts-ignore
        sizes += w !== 3840 ? `(max-width: ${MAX_WIDTHS[width]}px) ${width}px, ` : `${width}px`
      }
    }
    return sizes.trim().replace(/,$/, "")
  }

  // construct the picture element
  private constructPictureElement() {
    const picture = document.createElement("picture")
    picture.classList.add("hero__poster", "hero__poster--active")
    const { poster } = this
    let srcs = []
    for (const type of Object.keys(poster)) {
      // type guard
      if (type === "webp" || type === "avif") {
        const { srcset } = poster[type as keyof ImageIndex]
        const source = document.createElement("source")
        source.srcset = srcset
        source.type = `image/${type}`
        srcs.push(source)
      }
    }
    srcs = srcs.sort((a, b) => {
      const aType = a.type.split("/")[1]
      const bType = b.type.split("/")[1]
      if (aType === bType) {
        return 0
      } else {
        if (aType === "avif") {
          return -1
        }
        return 1 // webp should always be last
      }
    })
    picture.append(...srcs)
    const img = document.createElement("img")
    img.src = poster.png.widths[1280].href
    img.srcset = poster.png.srcset
    img.alt = ""
    img.sizes = this.getSizes()
    img.draggable = false
    img.fetchPriority = "high"
    img.classList.add("hero__poster--image")
    picture.classList.add("hero__poster")
    picture.role = "presentation"
    picture.append(img)
    return picture
  }

  public getElements() {
    return this.video
  }
}
