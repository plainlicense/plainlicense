/**
 * @module animations/utils
 * @description Utility functions for animations
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import gsap from "gsap"
import { HeroStore } from "~/state"
import { isValidElement } from "~/utils"

/**
 * Randomly selects and removes an item from an array, reshuffling if depleted.
 *
/**
 * Normalizes the largest viewport dimension's offset value to a range between 0 and 1.
 *
 * @returns {number} A normalized value between 0 and 1
 *
 * @example
 *
 * @see {@link https://greensock.com/docs/v3/GSAP/Utilities/mapRange} GSAP Normalization Utility
 */
export function normalizeResolution(): number {
  const viewport = HeroStore.getInstance().getStateValue("viewport")
  const resolution = Math.max(viewport.offset.y, viewport.offset.x)
  const clampedResolution = gsap.utils.clamp(320, 3840, resolution)
  return gsap.utils.mapRange(320, 3840, 0, 1, clampedResolution)
}

/**
 * Retrieves a matchMedia instance with the specified contextFunction and optional scope.
 * @param context - The context function to use.
 * @param scope - The scope to use (defaults to document.documentElement).
 * @returns A matchMedia instance.
 */
/**
 * Retrieves a matchMedia instance with the specified contextFunction and optional scope.
 * @param scope - The scope to use (defaults to document.documentElement).
 * @returns A matchMedia instance.
 */
export function getMatchMediaInstance(scope?: Element | string | object | null) {
  return gsap.matchMedia(scope || document.documentElement)
}
/**
 * Retrieves the distance from the target element to the viewport.
 * @param target - The target element.
 * @param edge - The edge to measure from (defaults to 'bottom'). Accepts 'top', 'right', 'bottom', 'left'.
 * @returns The distance from the target element to the viewport.
 */
export function getDistanceToViewport(
  target: Element,
  edge: "top" | "right" | "bottom" | "left" = "bottom",
) {
  const rect = target.getBoundingClientRect()
  const { viewport } = HeroStore.getInstance().state$.getValue()
  const distanceMap = {
    top: rect.top,
    right: viewport.offset.x - rect.right,
    bottom: viewport.offset.y - rect.bottom,
    left: rect.left,
  }
  return distanceMap[edge]
}

/**
 * Checks if a timeline has a label.
 * @param tl - The timeline to check.
 * @param label - The label to check for.
 * @returns Whether the timeline has the specified label.
 */
export function hasLabel(tl: gsap.core.Timeline, label: string): boolean {
  try {
    return tl.labels[label] !== undefined
  } catch {
    return false
  }
}

/**
 * Retrieves the content-containing elements of an element.
 * @param element - The element to retrieve content-containing elements from.
 * @returns The content-containing elements of the element.
 */
export function getContentElements(element: Element): Element[] {
  // Exclude wrapper elements and utility classes
  const excludedClasses = ["outer", "inner", "hero__bg"]
  const hasExcludedClass = (el: Element) =>
    excludedClasses.some((cls) => el.classList.contains(cls))
  const hasContent = (el: Element) =>
    (el.textContent?.trim()?.length ?? 0) > 0 ||
    el.querySelector("img, svg, video, picture") !== null

  // First get all child elements
  return gsap.utils
    .toArray("*", element)
    .filter(
      (el): el is Element => el instanceof Element && el !== element && isValidElement(el, element),
    )
    .filter((el) => !hasExcludedClass(el) && hasContent(el))
}

/**
 * Attempts to retrieve an object's values as elements.
 * @param obj - The object to retrieve values from.
 * @returns The object's values as elements.
 */
function tryObject(obj: any) {
  if (obj === null || typeof obj !== "object" || obj.length === 0) {
    return []
  }
  const values = Object.values(obj)
  const newValues = []
  for (const value of values) {
    if (value === null || value === undefined) {
      newValues.push("null")
    } else if (value instanceof Element) {
      newValues.push(value)
    } else if (typeof value === "string") {
      newValues.push(document.querySelector(value))
    }
    return newValues
  }
  return null
}

/**
 * Retrieves the targets array from a TweenTarget.
 * @param targets - The TweenTarget to retrieve the targets array from.
 * @returns The targets array.
 */
export function getTargetsArray(targets: gsap.TweenTarget): Element[] {
  return gsap.utils
    .toArray(targets)
    .map((target) =>
      target instanceof Element ? target
      : typeof target === "string" ? document.querySelector(target)
      : tryObject(target),
    )
    .flat()
    .filter((el): el is Element => el !== null && el !== undefined && el instanceof Element)
}

export const hide = (vars: gsap.TweenVars = {}) => {
  return {
    ...vars,
    opacity: 0,
    visibility: "visible",
    contentVisibility:
      vars["contentVisibility"] && vars["contentVisibility"] === "visible" ? "visible" : undefined,
  }
}
export const show = (vars: gsap.TweenVars = {}) => {
  return {
    ...vars,
    opacity: 1,
    visibility: "visible",
    contentVisibility:
      vars["contentVisibility"] && vars["contentVisibility"] === "visible" ? "visible" : undefined,
  }
}

/**
 * Splits text or text within an element into divs for individual letter animations.
 * Appends the divs to a document fragment.
 * @param el - The element or text to split into divs.
 * @returns A document fragment containing the divs.
 */
export function wordsToLetterDivs(
  el: HTMLElement | string | HTMLElement[] | string[],
): DocumentFragment {
  const docFragment = document.createDocumentFragment()
  const innerContainer = document.createElement("div")
  innerContainer.classList.add("hero__letter--container--inner")
  const wordDiv = () => {
    const div = document.createElement("div")
    div.classList.add("hero__letter--word-container")
    return div
  }
  const letterDiv = () => {
    const div = document.createElement("div")
    div.classList.add("hero__letter")
    return div
  }
  let text = ""
  if (Array.isArray(el)) {
    if (el.every((item) => typeof item === "string")) {
      text = el.join(" ")
    } else {
      el.forEach((item) => {
        innerContainer.appendChild(wordsToLetterDivs(item))
      })
    }
  } else if (typeof el === "string") {
    text = el
  } else {
    text = el.innerText
    gsap.set(el, { innerText: "" })
  }
  const words = text.trim().split(" ")
  words.forEach((word) => {
    if (word === "" || word === "\n") {
      return
    }
    const newDiv = wordDiv()
    innerContainer.appendChild(newDiv)

    const letters = word.trim().split("")
    letters.forEach((letter, idx) => {
      if (
        (idx === 0 && (letter === " " || letter === "\n")) ||
        (idx === letters.length - 1 && letter === " ")
      ) {
        return
      }
      const textNode = document.createTextNode(letter)
      const newLetter = letterDiv()
      newLetter.appendChild(textNode)
      newDiv.appendChild(newLetter)
      gsap.set(newLetter, hide())
    })
  })
  const fragmentDivs = gsap.utils.toArray(".hero__letter--word-container", innerContainer)
  gsap.set(fragmentDivs, hide())
  if (el instanceof HTMLElement && el.tagName === "SPAN") {
    el.appendChild(innerContainer)
    docFragment.appendChild(el)
  } else {
    docFragment.appendChild(innerContainer)
  }
  return docFragment
}
