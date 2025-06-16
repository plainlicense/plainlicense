/**
 * Build Configuration Module
 * @module config/index
 * @description
 * Core build system configuration for Plain License project.
 * Handles esbuild setup, configuration, constants.
 *
 * Features:
 * - Dynamic esbuild configuration with plugins
 * - Video and image configuration
 *
 * @see {@link https://esbuild.github.io/}
 * @see {@link https://github.com/sindresorhus/globby}
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

import { cssModulesPlugin } from '@asn.aeb/esbuild-css-modules-plugin'

// @ts-ignore
import type * as esbuild from 'esbuild'
import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths'
import type globby from 'globby'

// import { copy } from 'esbuild-plugin-copy'

import { Manifest, ReplacersPlugin } from '../localPlugins/replacersPlugin'
import type {
  HeroPaths,
  HeroVideo,
  ImageIndex,
  ImageType,
  PlaceholderMap,
  Project,
  Separator,
  VideoCodec,
  VideoConfig,
  VideoResolution,
} from '../types'

export const isCi = () => {
  return (
    process.env.CI === 'true' ||
    process.env.CI === '1' ||
    process.env.NODE_ENV === 'production' ||
    process.env.GITHUB_ACTIONS === 'true'
  );
};

export const placeholderMap: PlaceholderMap = {
  'src/assets/stylesheets/_bundle_template.css': {
    '{{ main-hash }}': '',
    '{{ palette-hash }}': '',
  },
};

export const cssLocs = {
  'src/assets/stylesheets/_bundle_template.css': {
    '{{ main-hash }}':
      'external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css',
    '{{ palette-hash }}':
      'external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css',
  },
};

export const fontLoc = 'src/assets/fonts/*' as const;
export const clearGlobs = [
  'docs/*.{js,json}',
  'docs/*js.map',
  'docs/assets',
  'docs/manifest.json',
] as const;

export const clearOpts: globby.Options = {
  expandDirectories: true,
  onlyFiles: true,
  suppressErrors: true,
  unique: true,
} as const;

export const videoConfig = {
  baseDir: 'src/assets/videos/hero',
  codecs: ['av1', 'vp9', 'h264'] as VideoCodec[],
  resolutions: [
    { height: 2160, width: 3840 },
    { height: 1440, width: 2560 },
    { height: 1080, width: 1920 },
    { height: 720, width: 1280 },
    { height: 480, width: 854 },
    { height: 360, width: 640 },
    { height: 240, width: 426 },
  ] as VideoResolution[],
} as VideoConfig;

export const imageTypes = ['avif', 'webp', 'png'] as ImageType[];
export const videoExtensions = ['webm', 'mp4'];
export const otherExtensions = ['woff', 'woff2', 'svg', 'css', 'js', 'jpg', 'jpeg', 'gif', 'ico'];
export const allExtensions = [...imageTypes, ...videoExtensions, ...otherExtensions];
export const videoCodecs = videoConfig.codecs;

export const backupImage = 'break_free';
export const cssSrc = 'src/assets/stylesheets/bundle.css';
export const basePath = videoConfig.baseDir;

export const resKeys: HeroPaths = Object.fromEntries(
  videoConfig.resolutions.map((res) => [res.width, '']),
) as HeroPaths;
export const resolutions = Object.keys(resKeys).map((key) => {
  return Number.parseInt(key, 10);
});
const resolutionWidths = Object.keys(resKeys).map((key) => {
  return key.toString();
});
export const resPattern = resolutionWidths.join('|');

const heroPathsTemplate = Object.fromEntries(
  videoConfig.resolutions.map((res) => [res.width, '']),
) as HeroPaths;

export const HERO_VIDEO_TEMPLATE = {
  poster: {
    avif: { srcset: '', widths: { ...heroPathsTemplate } },
    png: { srcset: '', widths: { ...heroPathsTemplate } },
    webp: { srcset: '', widths: { ...heroPathsTemplate } },
  },
  variants: {
    av1: { ...heroPathsTemplate },
    h264: { ...heroPathsTemplate },
    vp9: { ...heroPathsTemplate },
  },
} as Partial<HeroVideo>;

export const basePosterObj = HERO_VIDEO_TEMPLATE.poster;

/**
 * @description Get the separator for the pattern
 * @param {boolean} isRegex - Whether the pattern is a regex (true) or a minimatch (false)
 * @returns {string} - The separator for the pattern
 */

const getSep = (isRegex: boolean): Separator => {
  return isRegex ? '|' : ',';
};

export const widthPattern = (isRegex = true) => {
  return resolutionWidths.join(getSep(isRegex));
};
export const codecPattern = (isRegex = true) => {
  return videoCodecs.join(getSep(isRegex));
};

export const videoExtensionPattern = (isRegex = true) => {
  return videoExtensions.join(getSep(isRegex));
};

export const imageExtensionPattern = (isRegex = true) => {
  return imageTypes.join(getSep(isRegex));
};
export const mediaExtensionPattern = (isRegex = true) => {
  return `${videoExtensionPattern(isRegex)}|${imageExtensionPattern(isRegex)}`;
};
export const hashPattern = '\.([0-9a-fA-F]{8})\.';

const removeDefaultPattern = (content: string, variable: string) => {
  const pattern = new RegExp(`${variable}.default`, 'g');
  let newContent = content;
  for (const match of content.matchAll(pattern)) {
    newContent = newContent.replace(match[0], variable);
  }
  return newContent;
};

export const videoMessages = {
  break_free: "Understanding shouldn't require a degree.",
  tokyo_shuffle: 'Stop the Nonsense',
} as Record<string, string>;

const jsBanner = `/**
 * ---DO NOT EDIT THIS FILE---
 * The build process generates this file
 * You should edit the source file instead
 *
 * sources are in: src/assets/javascripts directory
 */
`;
const cssBanner = `/**
  * ---DO NOT EDIT THIS FILE---
  * The build process generates this file
  * You should edit the source file instead
  *
  * sources are in: src/assets/stylesheets directory
  *
  */
`;

/**
 * @description esbuild configuration for the web platform.
 */
export const webConfig: esbuild.BuildOptions = {
  assetNames: '[dir]/[name].[hash]',
  banner: { css: cssBanner, js: jsBanner },

  bundle: true,
  chunkNames: '[dir]/chunks/[name].[hash]',
  format: 'esm',
  loader: {
    '.avif': 'copy',
    '.css': 'css',
    '.js': 'js',
    '.json': 'copy',
    '.mp4': 'copy',
    '.png': 'copy',
    '.sass': 'css',
    '.scss': 'css',
    '.svg': 'copy',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.webm': 'copy',
    '.webp': 'copy',
    '.woff': 'copy',
    '.woff2': 'copy',
  },
  logLevel: 'info',
  metafile: true,
  minify: isCi(),
  outbase: 'src',
  outExtension: { '.css': '.css', '.js': '.js' },
  platform: 'browser',
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd(),
      filter: /src\/assets\/javascripts\/.*|src\/cache_worker.*/,
      tsconfig: 'tsconfig.json',
    }),
    cssModulesPlugin({
      emitCssBundle: {
        filename: 'bundle.css',
      },
    }),
    Manifest,
    ReplacersPlugin,
  ],
  sourcemap: true,
  splitting: false,
  target: ['chrome72', 'firefox65', 'safari12', 'edge88'],
};

export const baseProject: Project = {
  entryNames: '[dir]/[name].[hash]',
  entryPoints: [
    'src/assets/javascripts/index.ts',
    'src/assets/stylesheets/bundle.css',
    'src/cacheWorker.ts',
  ],
  outdir: 'docs',
  platform: 'browser',
  tsconfig: 'tsconfig.json',
};

export const PROJECTS = [baseProject] as const;

/**
 * @param {string} str - the string to convert
 * @returns {string} the enum string
 */
function toEnumString(str: string): string {
  return `${str.toUpperCase()} = "${str}"`;
}

export const tsTemplate = (videos: HeroVideo[], noScriptImage: ImageIndex) => {
  const keyPattern = /"(\w+?)":|"[[\](){}]|[[\](){}]"/g;
  return `
/**
 *! NOTE: The build process generates this file.
 *! DO NOT EDIT THIS FILE DIRECTLY.
 * Edit the build script instead (src/build/config/index.ts).
 *
 * @module data
 * @description A collection of hero videos for the landing page.
 */

export const rawHeroVideos = ${JSON.stringify(videos, null, 2)} as const;

export enum HeroName {
    ${videos.map((video) => toEnumString(video.baseName)).join(',\n    ')}
    }

export const backupImage = "${JSON.stringify(noScriptImage, null, 2)}" as const;
`.replace(keyPattern, (match) => {
    return match.replace(/"/g, '');
  });
};
