import { HeroVideo, VideoCodec, VideoWidth } from "./types"
import { rawHeroVideos } from "./data"
import { logger, parsePath } from "~/utils"

/**
 * Gets the hero videos
 * @returns The hero videos
 */
export function getHeroVideos(): HeroVideo[] {
  return rawHeroVideos
}

/**
 * Gets the AV1 media type
 * @see https://jakearchibald.com/2022/html-codecs-parameter-for-av1/
 * @param width - The width of the video
 * @returns The AV1 media type
 */
const getAv1MediaType = (width: VideoWidth) => {
  const seqlevelMap = {
    426: "16",
    640: "16",
    854: "16",
    1280: "16",
    1920: "16",
    2560: "16",
    3840: "16",
  } as const
  const seqlevel = seqlevelMap[width]

  return `video/webm;codecs=av01.0.${seqlevel}M.10.0.110.01.01.01.0`
}

const getH264MediaType = () => "video/mp4"

const getVp9MediaType = (width: VideoWidth) => {
  const levelMap = {
    426: "20",
    640: "21",
    854: "30",
    1280: "31",
    1920: "40",
    2560: "50",
    3840: "51",
  } as const
  // @ts-ignore
  const level = levelMap[width]
  return `video/webm;codecs=vp09.02.${level}.10.00.01.01.01.01`
}

/**
 * Gets the media type for the codec and width for the source element
 * @see https://publishing-project.rivendellweb.net/getting-the-codec-attribute-for-html-video/
 * @see https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
 * @param type
 * @param width
 * @returns The media type parameter
 */
export function getMediaType(type: VideoCodec, width: VideoWidth): string {
  switch (type) {
    case "av1":
      return getAv1MediaType(width)
    case "vp9":
      return getVp9MediaType(width)
    case "h264":
      return getH264MediaType()
    default:
      throw new Error(`Unsupported video codec: ${type}`)
  }
}

/**
 * Gets the codec and width of the video from the source
 * @param src - The source of the video
 * @returns A tuple with the codec and width of the video
 */
export function srcToAttributes(src: string): [VideoCodec, VideoWidth] {
  const splitName = (s: string) => s.split("_")
  const { name } = parsePath(src)
  const width = parseInt(splitName(name).slice(-1)[0].split(".")[0], 10) as VideoWidth
  const codec = splitName(name).slice(-2)[0] as VideoCodec
  return [codec as VideoCodec, width as VideoWidth]
}

/**
 * Gets the activity classes for the given base class
 * @param baseClass - The base class name
 * @returns An object containing the active and inactive class names
 */
function getActivityClasses(baseClass: string) {
  return {
    active: `${baseClass}--active`,
    inactive: `${baseClass}--inactive`,
  }
}

/**
 * Filters the class list to include only active or inactive classes
 * @param classList - The list of classes to filter
 * @param baseClass - The base class name to derive active/inactive classes
 * @returns An object containing the active or inactive class name if present, otherwise null
 */
function filterActiveClass(
  classList: DOMTokenList,
  baseClass: string,
): Record<"active" | "inactive", string | null> {
  const { active, inactive } = getActivityClasses(baseClass)
  const classObj = { active: "", inactive: "" }
  Array.from(classList)
    .filter((c) => c in classObj)
    .forEach((c) => {
      if (c === active) {
        classObj.active = active
      } else if (c === inactive) {
        classObj.inactive = inactive
      }
    })
  return Object.fromEntries(
    Object.entries(classObj).map(([k, v]) => (v !== "" && k ? [k, v] : [k, null])),
  ) as Record<"active" | "inactive", string | null>
}

/**
 * Toggles the active class based on the makeActive parameter
 * @param el - The HTML element to modify
 * @param classBase - The base class name for active/inactive states, "--active" or "--inactive" will be appended
 * @param makeActive - Whether to make the element active or inactive (active is true)
 */
export function toggleActiveClass(el: HTMLElement, classBase: string, makeActive: boolean) {
  const { active, inactive } = filterActiveClass(el.classList, classBase)
  if ((makeActive && active && !inactive) || (!makeActive && !active && inactive)) {
    return
  }
  const targetNames = getActivityClasses(classBase)
  if (makeActive && inactive) {
    el.classList.replace(inactive, targetNames.active)
  } else if (!makeActive && active) {
    el.classList.replace(active, targetNames.inactive)
  } else {
    el.classList.add(makeActive ? targetNames.active : targetNames.inactive)
  }
  Array.from(el.classList)
    .filter((c) => (makeActive ? c.endsWith("inactive") : c.endsWith("active")))
    .filter((c) => c && c.length)
    .forEach((c) => el.classList.remove(c))
}

/**
 * Swaps the active class between two elements.
 * Deactivates one element and activates another, using a common base class.
 * @param inactivateElement - The element to deactivate.
 * @param activateElement - The element to activate.
 * @param classBase - The base class name for active/inactive states.
 */
export function swapActiveClass(
  inactivateElement: HTMLElement,
  activateElement: HTMLElement,
  classBase: string,
) {
  toggleActiveClass(inactivateElement, classBase, false)
  toggleActiveClass(activateElement, classBase, true)
}
