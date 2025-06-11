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
import { OBSERVER_CONFIG, VIDEO_MANAGER_ELEMENTS } from '~/config';
import { isValidElement, logObject, logger } from '~/utils';
import type { VideoManager } from '../video';
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
  name: 'setSection',
  extendTimeline: true,
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
      .add(gsap.to(section.bg, { yPercent: -15 * dFactor, zIndex: 0, opacity: 0 }))
      .add(
        gsap.set([section.outerWrapper, section.innerWrapper], {
          zIndex: -1,
          ...show(),
        }),
      )
      .add(gsap.set(section.content, { ...show(), zIndex: 1 }));
  },
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
    out: false,
    direction: 1,
    fromConfig: {},
    toConfig: {},
  },
) => {
  logger.debug(`fade: targets: ${logObject(targets, 'fade target')}`);
  const media = getMatchMediaInstance();
  const tl = gsap.timeline();
  const { out, direction, fromConfig, toConfig } = config;
  // biome-ignore lint/suspicious/noImplicitAnyLet: we're just initializing out of the conditional
  let fadeVars;
  if (fromConfig && toConfig) {
    fadeVars = getFadeVars(
      out || false,
      Number.parseInt(fromConfig.yPercent?.toString() || '50', 10) ||
        Number.parseInt(toConfig?.yPercent?.toString() || '0', 10) ||
        50,
      direction || 1,
    );
  } else {
    fadeVars = getFadeVars(
      out || false,
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
  name: 'transitionSection',
  extendTimeline: true,
  defaults: {
    extendTimeline: true,
    duration: OBSERVER_CONFIG.slides.slideDuration,
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
            zIndex: 300,
            duration: 0.5,
            yPercent: 0,
            opacity: 0.8,
            background: 'transparent',
            startAt: { background: 'transparent', yPercent: -100 },
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
      .set(targets, { zIndex: 1, autoAlpha: 1, z: 1 })
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
      .fromTo(section.bg, { yPercent: 15 * dFactor }, { yPercent: 0, zIndex: -300, opacity: 1 }, 0)
      .add(
        [
          'fadeIn',
          fade(fadeInTargets, {
            ...OBSERVER_CONFIG.fades,
            out: false,
            direction,
          }),
        ],
        '>',
      )
      .add(gsap.to(section.content, { autoAlpha: 1, zIndex: 1 }), 'fadeIn+=0.3')
      .add(revealHeader, '>');
  },
});

// Register the fade effect with GSAP for fadeIn and fadeOut.
gsap.registerEffect({
  name: 'fadeIn',
  extendTimeline: true,
  effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
    const combinedConfig = { ...OBSERVER_CONFIG.fades, ...config };
    const { direction, fromConfig, toConfig } = combinedConfig;
    const checkedTargets = Array.isArray(targets) ? targets : [targets];
    logger.debug(`fading in targets: ${logObject(checkedTargets, 'fadeIn target')}`);
    return fade(checkedTargets, { out: false, direction, fromConfig, toConfig });
  },
});

gsap.registerEffect({
  name: 'fadeOut',
  extendTimeline: true,
  defaults: { extendTimeline: true },
  effect: (targets: gsap.TweenTarget, config: FadeEffectConfig) => {
    const combinedConfig = { ...OBSERVER_CONFIG.fades, ...config };
    const checkedTargets = Array.isArray(targets) ? targets : [targets];
    logger.debug(`fadeOut: targets: ${logObject(checkedTargets, 'fadeOut target')}`);
    const { direction, fromConfig, toConfig } = combinedConfig;
    return fade(checkedTargets, { out: true, direction, fromConfig, toConfig });
  },
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
    ease: 'power4.in',
    duration: 0.5,
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
    y: (_index: number, target: Element, _targets: Element[]) => {
      const distance = Math.abs(getDistanceToViewport(target));
      // Note the negative sign to invert the direction of the jump.
      return -(gsap.utils.clamp(distance > 10 ? 10 : distance, distance, 25) as number);
    },
    yoyoEase: 'bounce',
    ease: 'elastic',
    repeatDelay: 2,
    duration: 0.5,
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
    scale: 1.5,
    ease: 'elastic',
    duration: 0.5,
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
  name: 'emphasize',
  extendTimeline: true,
  defaults: { repeat: -1, yoyo: true, extendTimeline: true },
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
});

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
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut',
            duration: duration / 1.5,
            scale: 1,
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
            scale: 1,
            duration: duration / 1.5,
            yoyo: true,
            repeat: 1,
            ease: 'power3.inOut',
            xPercent: 0,
            yPercent: 0,
            z: 50,
          }),
        );
      }
    });
  return logoTl;
}

function animateText(scope: VideoManager, targets: gsap.TweenTarget, config: AnimateMessageConfig) {
  if (Array.isArray(targets) && targets.length > 1) {
    logger.warn('Multiple targets provided for animateMessage. Only animating the first.');
  }
  const message = config.message ?? scope.message;
  const containerTarget =
    (Array.isArray(targets) ? targets[0] : targets) ||
    document.querySelector('.text-animation__container');
  if (!containerTarget || !message) {
    logger.error(
      message
        ? 'No target provided for animateMessage.'
        : 'No message provided for animateMessage.',
    );
    return gsap.timeline();
  }
  logger.debug(`Animating message: ${message}`);
  const msgFrag = wordsToLetterDivs(message);
  const innerContainer = msgFrag.querySelector('.hero__letter--container--inner');
  if (!innerContainer || !containerTarget || !msgFrag) {
    logger.error(
      `Needed element(s) not found for message animation. \n  msgFrag: ${logObject(msgFrag)}, \n  innerContainer: ${logObject(innerContainer)}, \n  containerTarget: ${logObject(containerTarget)}`,
    );
    return gsap.timeline();
  }
  const fragDivs = gsap.utils.toArray('.hero__letter--word-container', msgFrag);
  containerTarget.append(msgFrag);
  const totalDuration = config.duration || scope.textDuration || 10;
  const messageTimeline = gsap.timeline({
    paused: true,
    repeat: 0,
    duration: totalDuration,
    ...(config.sharedVars as gsap.TimelineVars),
  });
  logger.debug(`Fragdiv count: ${fragDivs.length}`);
  const containers = [
    ...fragDivs,
    innerContainer,
    innerContainer.parentElement,
    containerTarget,
    containerTarget.parentElement,
  ]
    .flat()
    .reduce((acc, el) => {
      if (el instanceof Element && !acc.includes(el)) {
        acc.push(el);
      }
      return acc;
    }, []);
  logger.debug(`Container count: ${containers.length}`);
  logObject(containers, 'Containers');
  gsap.set(containers, hide({ zIndex: -1 }));
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
  const fromVars: GSAPTweenVars = config.fromVars || {};
  const toVars: GSAPTweenVars = config.toVars || {};
  // Configure for reduced motion
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

  // Set up individual letters
  for (const div of fragDivs) {
    if (!div || !(div instanceof HTMLDivElement) || !div.children.length) {
      continue;
    }
    gsap.set(div, hide());
    const letters = gsap.utils.toArray('.hero__letter', div);
    gsap.set(letters, hide());
  }
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
              // Force parent container to be visible
              gsap.set(
                [containerTarget, innerContainer],
                show({
                  display: 'flex',
                  zIndex: 10,
                }),
              );

              for (const div of fragDivs) {
                if (div instanceof HTMLDivElement) {
                  logger.debug('Animating letters in word');
                  // Make div visible
                  gsap.set(div, { visibility: 'visible', display: 'flex' });
                  const letters = gsap.utils.toArray('.hero__letter', div);
                  gsap.fromTo(
                    letters,
                    hide({
                      yPercent: () => gsap.utils.random(-150, 150, 10),
                      ...fromVars,
                    }),
                    show({
                      yPercent: 0,
                      stagger: { each: 0.03, from: 'random' },
                      duration: totalDuration,
                      ease: 'power4.out',
                      repeatDelay: totalDuration / 2.5,
                      zIndex: 50,
                      yoyo: true,
                      repeat: 1,
                      ...toVars,
                    }),
                  );
                }
              }
            },
            ...show({
              stagger: { each: 0.1, from: 'start' },
              zIndex: 15,
              yPercent: 0,
              duration: totalDuration,
              yoyo: true,
              repeatDelay: totalDuration / 2.5,
              repeat: 1,
              ease: 'power4.out',
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
  name: 'animateMessage',
  extendTimeline: true,
  paused: true,
  effect: (targets: gsap.TweenTarget, config: AnimateMessageConfig) => {
    const scope =
      config.sharedVars?.callbackScope ||
      config.callbackScope ||
      // biome-ignore lint/complexity/useLiteralKeys: This clarifies that these are not standard API properties
      config.sharedVars?.['defaults']['callbackScope'] ||
      config.toVars?.callbackScope;
    if (!config || !targets || !scope) {
      logger.error('No targets or scope provided for animateMessage');
      return gsap.timeline();
    }
    return animateText(scope, targets, config);
  },
});
