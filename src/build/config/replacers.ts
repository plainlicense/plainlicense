/**
 * Replacers Config Module
 * @module config/replacers
 * @description
 * Configurations for the `ReplacersPlugin` used in the build system.
 * Handles dynamic import transformations and other replacements.
 * The replacers plugin modifies JavaScript files after bundling.
 *
 * Features:
 * - Transforms dynamic imports to variable assignments
 * - Handles cache worker imports
 * - Removes source references
 * - Transforms import statements to variable declarations
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */


import { replacementManager } from "../localPlugins/replacersPlugin"
import { ReplacerConfig } from "../types"

const replacerConfigs: ReplacerConfig[] = [
  {
    name: 'import',
    pathFilter: (path: string) => {
      return path.includes('index') && path.endsWith('js') && !path.includes('map');
    },
    pattern: /import (?<variable>\w+)\sfrom\s(?<path>"[a-zA-Z0-9/._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match?.groups) {
        // @ts-ignore - TS doesn't know we're compiling to esm in esbuild
        return `var ${match.groups.variable} = ${match.groups.path.replace('..', 'assets')};`;
      }
      return match[0];
    },
  },
  {
    // biome-ignore lint/nursery/noSecrets: not a secret, just a variable name
    name: 'cacheWorkerImports',
    pathFilter: (path: string) => {
      return path.includes('cacheWorker') && path.endsWith('js') && !path.includes('map');
    },
    pattern:
      /import (?<variable>\w+)\sfrom\s(?<quote>")\.\/(?<path>assets\/\w+\/[a-zA-Z0-9._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match?.groups) {
        return `var ${match.groups.variable} = new URL(${match.groups.quote}${match.groups.path}, self.location.origin);`;
      }
      return match[0];
    },
  },
  {
    name: 'cacheWorker',
    pattern: /cacheWorker\.ts/g,
    replacement: '',
  },
  {
    name: 'transformImportsToVariables',
    pathFilter: (path: string) => {
      return path.endsWith('.js') && !path.includes('node_modules');
    },
    pattern: /import (?<variable>\w+)\sfrom\s(?<path>"[a-zA-Z0-9/._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      const variable = match.groups?.variable;
      const path = match.groups?.path;
      return `const ${variable} = await import(${path});`;
    },
  },
  {
    name: 'transformCacheWorkerImports',
    pathFilter: (path: string) => {
      return path.endsWith('.js') && !path.includes('node_modules');
    },
    pattern: /import\s+(?<variable>\w+)\s+from\s+(?<path>"[^"]*cacheWorker[^"]*");/gi,
    replacer: (match: RegExpExecArray) => {
      const variable = match.groups?.variable;
      const path = match.groups?.path;
      return `const ${variable} = new URL(${path}, import.meta.url);`;
    },
  },
  {
    name: 'removeSourceReferences',
    pattern: /cacheWorker\.ts/g,
    replacement: '',
    customMethod: 'removeSourceReferences',
  },
];

for (const replacer of replacerConfigs) {
  replacementManager.addReplacer(replacer);
}
