/**
 * @module observerEffects
 * @description Creates and registers gsap effects for observer-based animations.
 *
 * USAGE:
 * The effects register to the global gsap object, and can be used in timelines or tweens as if it were a 'gsap.to' or 'gsap.fromTo' effect.
 * For example, for the 'fadeIn' effect: gsap.fadeIn(targets, config)
 *
 ** Effects:
 **  - setSection: Sets the specified section up for a transition.
 **  - transitionSection: Transitions the specified section.
 **  - fadeIn: Fades in the specified targets with a y-axis movement.
 **  - fadeOut: Fades out the specified targets with a y-axis movement.
 **  - emphasize: Blinks, jumps, and scales up the specified targets.
 *
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 *
 */

import gsap from 'gsap';
import { OBSERVER_CONFIG, VIDEO_MANAGER_ELEMENTS } from '~/config/config';
import { isValidElement } from '../../utils/conditionChecks';
import { logObject } from '../../utils/helpers';
import { logger } from '../../utils/log';
import type { VideoManager } from '../video/videoManager';
import {
  type AnimateMessageConfig,
  Direction,
  type EmphasisConfig,
  type FadeEffectConfig,
  type ReducedMotionCondition,
  type TransitionConfig,
} from './types';
import {
  getDistanceToViewport,
  getMatchMediaInstance,
  hide,
  show,
  wordsToLetterDivs,
} from './utils';

/**
 * Retrieves the fade variables for autoAlpha and yPercent.
 * @param out - Whether it's a fade out effect or not.
 * @param yPercent - The percentage of the y-axis to fade in/out.
 * @param direction - The direction to fade in/out.
 * @returns The fade variables for the fade effect's from and to states.
 */
function getFadeVars(out: boolean, yPercent: number, direction?: Direction | null) {
  const defaultDirection = out ? Direction.Up : Direction.Down;
  const pathDirection = direction || defaultDirection;
  return {
    from: {
      autoAlpha: out ? 1 : 0,
      yPercent: out ? 0 : pathDirection * yPercent,
    },
    to: {
      autoAlpha: out ? 0 : 1,
      yPercent: out ? pathDirection * yPercent : 0,
    },
  };
}

function getDFactor(direction: Direction) {
  return direction === Direction.Up ? Direction.Up : Direction.Down;
}

// ! WARNING: gsap warns about nesting effects within effects.
// ! I Don't know what happens if you do...implosion of the multiverse?
// ! We avoid that be creating tweens/timelines and then creating effects from those tweens/timelines.
// ! (it's probably just easy to get in an infinite recursion loop)

/**
 * Sets the specified section up for a transition.
 */
gsap.registerEffect({
  defaults: { extendTimeline: true },
  effect: (targets: gsap.TweenTarget, config: TransitionConfig) => {
    if (Object.entries(config).length === 1) {
      // biome-ignore lint/style/noParameterAssign: This is the simplest way to handle this scenario
      config = config[0];
    }
    const { direction, section } = config;
    logger.info('setting up section for transition');
    const dFactor = getDFactor(direction);
    return gsap
      .timeline({ extendTimeline: true, paused: false })
      .add(gsap.set(targets, { zIndex: 0, ...hide() }))
      .add(gsap.to(section.bg, { opacity: 0, yPercent: -15 * dFactor, zIndex: 0 }))
      .add(
        gsap.set([section.outerWrapper, section.innerWrapper], {
          zIndex: -1,
          ...show(),
        }),
      )
      .add(gsap.set(section.content, { ...show(), zIndex: 1 }));
  },
  extendTimeline: true,
  name: 'setSection',
});

/**
 * Fades in or out the specified targets.
 * @param targets - The targets to fade in or out.
 * @param config - The fade effect configuration.
 * @returns The fade effect.
 */
const fade = (
  targets: gsap.TweenTarget,
  config: FadeEffectConfig = {
    direction: 1,
    fromConfig: {},
    out: false,
    toConfig: {},
  },
) => {
  logger.debug(`fade: targets: ${logObject(targets, 'fade target')}`);
  const media = getMatchMediaInstance();
  const tl = gsap.timeline();
  const { out, direction, fromConfig, toConfig } = config;
  let fadeVars: { from: Record<string, unknown>; to: Record<string, unknown> };
  if (fromConfig && toConfig) {
    fadeVars = getFadeVars(
      !!out,
      Number.parseInt(fromConfig.yPercent?.toString() || '50', 10) ||
        Number.parseInt(toConfig?.yPercent?.toString() || '0', 10) ||
        50,
      direction || 1,
    );
  } else {
    fadeVars = getFadeVars(
      !!out,
      Number.parseInt(
        OBSERVER_CONFIG.fades.fadeInConfig.normal.from.yPercent?.toString() || '50',
        10,
      ),
      direction || 1,
    );
  }
  const fromVars = { ...fadeVars.from, ...fromConfig };
  const toVars = { ...fadeVars.to, ...toConfig };
  media.add({ reducedMotion: '(prefers-reduced-motion: reduce)' }, (context: gsap.Context) => {
    const { reducedMotion } = context.conditions as ReducedMotionCondition;
    if (reducedMotion) {
      const modifiedVars = [fromVars, toVars].map((vars) => {
        const { yPercent, ...modified } = vars;
        return modified;
      });
      tl.timeScale(0.6);
      tl.add(gsap.fromTo(targets, modifiedVars[0] || {}, modifiedVars[1] || {}));
    } else {
      tl.add(
        gsap.fromTo(
          targets,
          {
            ...fromVars,
          },
          {
            ...toVars,
          },
        ),
      );
    }
  });
  return tl;
};

/**
 * Transitions the specified section.
 */
gsap.registerEffect({
  defaults: {
    duration: OBSERVER_CONFIG.slides.slideDuration,
    extendTimeline: true,
  },
  effect: (targets: gsap.TweenTarget, config: TransitionConfig) => {
    // *note: `targets` is the section element
    if (Object.entries(config).length === 1) {
      // biome-ignore lint/style/noParameterAssign: This is the simplest way to handle this scenario
      config = config[0];
    }
    const { index, direction, section } = config;
    logger.debug(`transitionSection: direction: ${direction}, section: ${console.dir(section)}`);
    const dFactor = getDFactor(direction);
    const fadeInTargets = section.content.filter(
      (el) =>
        el instanceof Element &&
        isValidElement(el, el.parentElement || section.element) &&
        !Array.from(el.classList).some((cls) => VIDEO_MANAGER_ELEMENTS.includes(cls)),
    );
    logger.debug(`fadeInTargets: ${logObject(fadeInTargets, 'fadeInTargets')}`);
    const header = gsap.utils.toArray(OBSERVER_CONFIG.header);
    const revealHeader = gsap.timeline();
    if (header.length > 0 && index === 0) {
      logger.debug('Revealing header');
      revealHeader
        .add(() => {
          for (const el of header) {
            if (el instanceof HTMLElement && 'hidden' in el && el.hidden) {
              el.hidden = false;
            }
          }
        })
        .add(
          gsap.to(header, {
            autoAlpha: 1,
            background: 'transparent',
            duration: 0.5,
            opacity: 0.8,
            startAt: { background: 'transparent', yPercent: -100 },
            yPercent: 0,
            zIndex: 300,
          }),
        );
    } else {
      logger.debug('No header to reveal');
      logger.debug(`header classlists: ${logObject(header, 'header classlist')}`);
    }
    const leaving = index === 1 && Direction.Down;
    if (index === 0 || leaving) {
      gsap.to('.cta__container', {
        autoAlpha: leaving ? 0 : 1,
        duration: 0.3,
      });
    }
    return gsap
      .timeline({ extendTimeline: true })
      .set(targets, { autoAlpha: 1, z: 1, zIndex: 1 })
      .fromTo(
        [section.outerWrapper, section.innerWrapper],
        {
          yPercent: (i: number) => (i ? i * -100 * dFactor : 100 * dFactor),
        },
        {
          yPercent: 0,
          zIndex: -500,
        },
        0,
      )
      .fromTo(section.bg, { yPercent: 15 * dFactor }, { opacity: 1, yPercent: 0, zIndex: -300 }, 0)
      .add(
        [
          'fadeIn',
          fade(fadeInTargets, {
            ...OBSERVER_CONFIG.fades,
            direction,
            out: false,
          }),
        ],
        '>',
      )
      .add(gsap.to(section.content, { autoAlpha: 1, zIndex: 1 }), 'fadeIn+=0.3')
      .add(revealHeader, '>');
  },
  extendTimeline: true,
  name: 'transitionSection',
});

// Register the fade effect with GSAP for fadeIn and fadeOut.
gsap.registerEffect({
  effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
    const combinedConfig = { ...OBSERVER_CONFIG.fades, ...config };
    const { direction, fromConfig, toConfig } = combinedConfig;
    const checkedTargets = Array.isArray(targets) ? targets : [targets];
    logger.debug(`fading in targets: ${logObject(checkedTargets, 'fadeIn target')}`);
    return fade(checkedTargets, { direction, fromConfig, out: false, toConfig });
  },
  extendTimeline: true,
  name: 'fadeIn',
});

gsap.registerEffect({
  defaults: { extendTimeline: true },
  effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
    const combinedConfig = { ...OBSERVER_CONFIG.fades, ...config };
    const checkedTargets = Array.isArray(targets) ? targets : [targets];
    logger.debug(`fadeOut: targets: ${logObject(checkedTargets, 'fadeOut target')}`);
    const { direction, fromConfig, toConfig } = combinedConfig;
    return fade(checkedTargets, { direction, fromConfig, out: true, toConfig });
  },
  extendTimeline: true,
  name: 'fadeOut',
});

/**
 * Blinks the specified targets.
 * @param targets - The targets
 * @param config - The blink configuration.
 * @returns The blink effect.
 */
const blink = (targets: gsap.TweenTarget, config: gsap.TweenVars = {}) => {
  logger.debug(`blink: targets: ${logObject(targets, 'blink target')}`);
  return gsap.to(targets, {
    autoAlpha: 0,
    duration: 0.5,
    ease: 'power4.in',
    startAt: { filter: 'brightness(1.3)' },
    ...config,
  });
};

/**
 * Jumps the specified targets.
 * @param targets - The targets.
 * @param config - The jump configuration.
 * @returns The jump effect.
 */
const jump = (targets: gsap.TweenTarget, config: gsap.TweenVars = {}) => {
  logger.debug(`jump: targets: ${logObject(targets, 'jump target')}`);
  // biome-ignore lint/complexity/useLiteralKeys: We want to clarify that these are not part of the standard API
  config.y ? config['delete']('y') : null;
  return gsap.to(targets, {
    duration: 0.5,
    ease: 'elastic',
    repeatDelay: 2,
    y: (_index: number, target: Element, _targets: Element[]) => {
      const distance = Math.abs(getDistanceToViewport(target));
      // Note the negative sign to invert the direction of the jump.
      return -(gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25) as number);
    },
    yoyoEase: 'bounce',
    ...config,
  });
};

/**
 * Scales up the specified targets.
 * @param targets - The targets.
 * @param config - The scale up configuration.
 * @returns The scale up effect.
 */
const scaleUp = (targets: gsap.TweenTarget, config: gsap.TweenVars = {}) => {
  logger.debug(`scaleUp: targets: ${logObject(targets, 'scaleUp target')}`);
  return gsap.to(targets, {
    duration: 0.5,
    ease: 'elastic',
    scale: 1.5,
    ...config,
  });
};

/**
 * Emphasizes the specified targets.
 * @param targets - The targets.
 * @param config - The emphasis configuration.
 * @returns The emphasis effect.
 */
gsap.registerEffect({
  defaults: { extendTimeline: true, repeat: -1, yoyo: true },
  effect: (targets: gsap.TweenTarget, config: EmphasisConfig) => {
    if (!targets || (Array.isArray(targets) && !targets.length)) {
      return gsap.timeline();
    }
    const { blinkConfig, jumpConfig, scaleUpConfig } = config;
    const emphasisTimeline = gsap.timeline();
    getMatchMediaInstance().add(
      { reducedMotion: '(prefers-reduced-motion: reduce)' },
      (context: gsap.Context) => {
        const { reducedMotion } = context.conditions as ReducedMotionCondition;
        if (reducedMotion) {
          emphasisTimeline.add(blink(targets, { ...blinkConfig, ease: 'power1.inOut' }));
          emphasisTimeline.add(scaleUp(targets, { ...scaleUpConfig }));
        } else {
          emphasisTimeline.add(blink(targets, blinkConfig));
          emphasisTimeline.add(jump(targets, jumpConfig));
          emphasisTimeline.add(scaleUp(targets, scaleUpConfig));
        }
      },
    );
    return emphasisTimeline;
  },
  extendTimeline: true,
  name: 'emphasize',
});

/**
 * Animates the logo element within the provided VideoManager scope.
 * This function creates a GSAP timeline that animates the logo in or out, adapting to reduced motion preferences.
 *
 * @param scope - The VideoManager instance containing the logo element and animation settings.
 * @param config - The configuration object for the animation, including shared variables and duration.
 * @returns A GSAP timeline representing the logo animation.
 */
function animateLogo(scope: VideoManager, config: AnimateMessageConfig) {
  const logoTl = gsap.timeline({
    ...(config.sharedVars as gsap.TimelineVars),
    defaults: {},
  });
  gsap
    .matchMedia()
    .add({ reducedMotion: '(prefers-reduced-motion: reduce)' }, (context: gsap.Context) => {
      const { reducedMotion } = context.conditions as ReducedMotionCondition;
      const logoTl = gsap.timeline({ label: 'logo' });
      const duration = config.duration || scope.textDuration || 10;
      if (reducedMotion) {
        logoTl.set(
          scope.logo,
          hide({
            scale: 0,
            xPercent: 0,
            yPercent: 0,
            z: -1,
          }),
        );
        logoTl.to(
          scope.logo,
          show({
            duration: duration / 1.5,
            ease: 'power1.inOut',
            repeat: 1,
            scale: 1,
            yoyo: true,
            z: 10,
          }),
        );
      } else {
        logoTl.set(
          scope.logo,
          hide({
            scale: 0,
            xPercent: -100,
            yPercent: 5,
            z: -1,
          }),
        );
        logoTl.to(
          scope.logo,
          show({
            duration: duration / 1.5,
            ease: 'power3.inOut',
            repeat: 1,
            scale: 1,
            xPercent: 0,
            yoyo: true,
            yPercent: 0,
            z: 50,
          }),
        );
      }
    });
  return logoTl;
}

/**
 * Returns the primary container element for text animation.
 *
 * @param targets - The target or array of targets for the animation.
 * @returns The container element to use for text animation, or null if not found.
 */
function getContainerTarget(targets: gsap.TweenTarget): Element | null {
  return (
    (Array.isArray(targets) ? targets[0] : targets) ||
    document.querySelector('.text-animation__container')
  );
}

/**
 * Collects and returns a unique list of container elements related to the animated text.
 *
 * @param fragDivs - An array of fragment div elements representing words or letters.
 * @param innerContainer - The inner container element for the animated text.
 * @param containerTarget - The main container element for the animation.
 * @returns An array of unique container elements to be used in the animation.
 */
function getContainers(
  fragDivs: Element[],
  innerContainer: Element,
  containerTarget: Element,
): Element[] {
  return [
    ...fragDivs,
    innerContainer,
    innerContainer.parentElement,
    containerTarget,
    containerTarget.parentElement,
  ]
    .flat()
    .reduce((acc: Element[], el) => {
      if (el instanceof Element && !acc.includes(el)) {
        acc.push(el);
      }
      return acc;
    }, [] as Element[]);
}

/**
 * Prepares letter div elements for animation by hiding them initially.
 *
 * @param fragDivs - An array of fragment div elements representing words.
 * @param _fromVars - The initial animation variables (unused).
 * @param _toVars - The target animation variables (unused).
 * @param _totalDuration - The total duration for the animation (unused).
 */
function setupLetterDivs(
  fragDivs: Element[],
  _fromVars: GSAPTweenVars,
  _toVars: GSAPTweenVars,
  _totalDuration: number,
) {
  for (const div of fragDivs) {
    if (!(div && div instanceof HTMLDivElement && div.children.length)) {
      continue;
    }
    gsap.set(div, hide());
    const letters = gsap.utils.toArray('.hero__letter', div);
    gsap.set(letters, hide());
  }
}

/**
 * Animates the letters within each word fragment by transitioning them from a hidden to a visible state.
 *
 * @param fragDivs - An array of fragment div elements representing words.
 * @param fromVars - The initial animation variables for the letters.
 * @param toVars - The target animation variables for the letters.
 * @param totalDuration - The total duration for the animation.
 */
function animateLettersInWords(
  fragDivs: Element[],
  fromVars: GSAPTweenVars,
  toVars: GSAPTweenVars,
  totalDuration: number,
) {
  for (const div of fragDivs) {
    if (div instanceof HTMLDivElement) {
      logger.debug('Animating letters in word');
      gsap.set(div, { display: 'flex', visibility: 'visible' });
      const letters = gsap.utils.toArray('.hero__letter', div);
      gsap.fromTo(
        letters,
        hide({
          yPercent: () => gsap.utils.random(-150, 150, 10),
          ...fromVars,
        }),
        show({
          duration: totalDuration,
          ease: 'power4.out',
          repeat: 1,
          repeatDelay: totalDuration / 2.5,
          stagger: { each: 0.03, from: 'random' },
          yoyo: true,
          yPercent: 0,
          zIndex: 50,
          ...toVars,
        }),
      );
    }
  }
}

/**
 * Validates and extracts the message and container target for text animation.
 *
 * @param scope - The VideoManager instance containing the default message.
 * @param targets - The target or array of targets for the animation.
 * @param config - The configuration object for the animation, possibly containing a message.
 * @returns An object containing the message and the container element, or undefined/null if validation fails.
 */
function validateAnimateTextInputs(
  scope: VideoManager,
  targets: gsap.TweenTarget,
  config: AnimateMessageConfig,
): { message: string | undefined; containerTarget: Element | null } {
  if (Array.isArray(targets) && targets.length > 1) {
    logger.warn('Multiple targets provided for animateMessage. Only animating the first.');
  }
  const message = config.message ?? scope.message;
  const containerTarget = getContainerTarget(targets);
  if (!(containerTarget && message)) {
    logger.error(
      message
        ? 'No target provided for animateMessage.'
        : 'No message provided for animateMessage.',
    );
    return { containerTarget: null, message: undefined };
  }
  return { containerTarget, message };
}

/**
 * Prepares the message fragment for animation by converting the message into DOM elements and appending them to the container.
 *
 * @param message - The message string to be animated.
 * @param containerTarget - The container element to which the message fragment will be appended.
 * @returns An object containing the message fragment, inner container, and an array of word container elements.
 */
function prepareMessageFragment(message: string, containerTarget: Element) {
  logger.debug(`Animating message: ${message}`);
  const msgFrag = wordsToLetterDivs(message);
  const innerContainer = msgFrag.querySelector('.hero__letter--container--inner');
  if (!(innerContainer && containerTarget && msgFrag)) {
    logger.error(
      `Needed element(s) not found for message animation. \n  msgFrag: ${logObject(msgFrag)}, \n  innerContainer: ${logObject(innerContainer)}, \n  containerTarget: ${logObject(containerTarget)}`,
    );
    return { fragDivs: [] as Element[], innerContainer: null, msgFrag: null };
  }
  const fragDivs = gsap.utils.toArray('.hero__letter--word-container', msgFrag) as Element[];
  containerTarget.append(msgFrag);
  return { fragDivs, innerContainer, msgFrag };
}

/**
 * Applies shared animation variables to the configuration's fromVars and toVars properties.
 *
 * @param config - The animation message configuration object to update.
 */
function applySharedVars(config: AnimateMessageConfig) {
  if (config.sharedVars && Object.keys(config.sharedVars).length) {
    config.fromVars =
      config.fromVars && Object.keys(config.fromVars).length
        ? { ...config.fromVars, ...config.sharedVars }
        : config.sharedVars;
    config.toVars =
      config.toVars && Object.keys(config.toVars).length
        ? { ...config.toVars, ...config.sharedVars }
        : config.sharedVars;
  }
}

/**
 * Configures the animation timeline and variables for users who prefer reduced motion.
 * This function adjusts the timeline speed and modifies animation variables to create a simpler, less dynamic animation experience.
 *
 * @param messageTimeline - The GSAP timeline for the message animation.
 * @param fromVars - The initial animation variables to be adjusted for reduced motion.
 * @param toVars - The target animation variables to be adjusted for reduced motion.
 */
function configureReducedMotion(
  messageTimeline: gsap.core.Timeline,
  fromVars: GSAPTweenVars,
  toVars: GSAPTweenVars,
) {
  gsap
    .matchMedia()
    .add({ reducedMotion: '(prefers-reduced-motion: reduce)' }, (context: gsap.Context) => {
      const { reducedMotion } = context.conditions as ReducedMotionCondition;
      if (reducedMotion) {
        messageTimeline.timeScale(0.6);
        fromVars.yPercent = 50;
        toVars.ease = 'power1.inOut';
        toVars.stagger = { from: 'start' };
      }
    });
}

/**
 * Animates a message by revealing its text and logo with coordinated GSAP timeline effects.
 *
 * @param scope - The VideoManager instance containing animation settings and elements.
 * @param targets - The target or array of targets for the animation.
 * @param config - The configuration object for the animation, including message, duration, and animation variables.
 * @returns A GSAP timeline representing the complete text and logo animation sequence.
 */
function animateText(scope: VideoManager, targets: gsap.TweenTarget, config: AnimateMessageConfig) {
  const { message, containerTarget } = validateAnimateTextInputs(scope, targets, config);
  if (!(containerTarget && message)) {
    return gsap.timeline();
  }
  const { msgFrag, innerContainer, fragDivs } = prepareMessageFragment(message, containerTarget);
  if (!(innerContainer && containerTarget && msgFrag)) {
    return gsap.timeline();
  }
  const totalDuration = config.duration || scope.textDuration || 10;
  const messageTimeline = gsap.timeline({
    duration: totalDuration,
    paused: true,
    repeat: 0,
    ...(config.sharedVars as gsap.TimelineVars),
  });
  logger.debug(`Fragdiv count: ${fragDivs.length}`);
  const containers = getContainers(fragDivs, innerContainer, containerTarget);
  logger.debug(`Container count: ${containers.length}`);
  logObject(containers, 'Containers');
  gsap.set(containers, hide({ zIndex: -1 }));

  applySharedVars(config);

  const fromVars: GSAPTweenVars = config.fromVars || {};
  const toVars: GSAPTweenVars = config.toVars || {};

  configureReducedMotion(messageTimeline, fromVars, toVars);

  setupLetterDivs(fragDivs, fromVars, toVars, totalDuration);

  return messageTimeline
    .add(() => logger.debug('Starting text animation timeline effect'), 0)
    .add(
      [
        'wordAnimation',
        gsap.fromTo(
          fragDivs,
          hide({
            yPercent: () => gsap.utils.random(-150, 150, 10),
            zIndex: 10,
            ...fromVars,
          }),
          {
            onStart: () => {
              logger.debug('Word animation starting');
              gsap.set(
                [containerTarget, innerContainer],
                show({
                  display: 'flex',
                  zIndex: 10,
                }),
              );
              animateLettersInWords(fragDivs, fromVars, toVars, totalDuration);
            },
            ...show({
              duration: totalDuration,
              ease: 'power4.out',
              repeat: 1,
              repeatDelay: totalDuration / 2.5,
              stagger: { each: 0.1, from: 'start' },
              yoyo: true,
              yPercent: 0,
              zIndex: 15,
              ...toVars,
            }),
          },
        ),
      ],
      0.02,
    )
    .add(animateLogo(scope, config), '<=2.5')
    .add(() => logger.debug('Finishing text animation'), '>')
    .add(gsap.set([containerTarget, innerContainer], hide()), '>');
}
/**
 * Animates a message.
 * Note: The message will be animated by drawing text from the target element(s) if
 * you don't provide a message in the config.
 * If a message is provided in the config, it will only animate
 * in the first target element (if there are multiple)
 * ... I assume you don't want the same message animated over and over again.
 * @param target - The target element(s) to animate the message in.
 * @param config - The animate message configuration.
 */
gsap.registerEffect({
  effect: (targets: gsap.TweenTarget, config: AnimateMessageConfig) => {
    const scope =
      config.sharedVars?.callbackScope ||
      config.callbackScope ||
      // biome-ignore lint/complexity/useLiteralKeys: This clarifies that these are not standard API properties
      config.sharedVars?.['defaults']['callbackScope'] ||
      config.toVars?.callbackScope;
    if (!(config && targets && scope)) {
      logger.error('No targets or scope provided for animateMessage');
      return gsap.timeline();
    }
    return animateText(scope, targets, config);
  },
  extendTimeline: true,
  name: 'animateMessage',
  paused: true,
});
