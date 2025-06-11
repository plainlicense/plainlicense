/** biome-ignore-all lint/correctness/noNodejsModules: because build script */

import type esbuild from 'esbuild';
import manifestPlugin from 'esbuild-plugin-manifest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { EsbuildOutput, ReplacerConfig } from '../types';

let buildOutput: EsbuildOutput = {};

export const Manifest = manifestPlugin({
  hash: false,
  append: false,
  // The `entries` object is what the contents of the manifest would normally be without using a custom `generate` function.
  // It is a string to string mapping of the original asset name to the output file name.
  generate: (entries) => {
    const manifest: Record<string, { file: string; integrity: string }> = {};

    for (const [source, file] of Object.entries(entries)) {
      const filePath = file.replace('docs/', '');
      manifest[source] = {
        file: filePath,
        integrity:
          'sha384-' +
          createHash('sha384')
            .update(filePath as string)
            .digest('base64'),
      };
    }
    return manifest;
  },
});

/**
 * Manages a collection of replacement configurations for string manipulation.
 * Provides methods to add, retrieve, and apply replacements to content.
 */
class ReplacementManager {
  replacerConfigs: ReplacerConfig[] = [];
  /**
   * Initializes a new instance of the `ReplacementManager` class.
   * @param replacerConfig - Optional initial replacer configuration(s).
   */
  constructor(replacerConfig?: ReplacerConfig | ReplacerConfig[]) {
    if (replacerConfig) {
      if (Array.isArray(replacerConfig)) {
        replacerConfig.forEach((r) => {
          this.addReplacer(r);
        });
      } else {
        this.addReplacer(replacerConfig);
      }
    }
  }
  /**
   * Adds a new replacer configuration.
   * @param replacerConfig - The replacer configuration to add.
   */
  addReplacer(replacerConfig: ReplacerConfig) {
    if (
      replacerConfig.name &&
      replacerConfig.pattern &&
      (replacerConfig.replacer || replacerConfig.simple || replacerConfig.custom) &&
      !this.replacerConfigs.find((r) => r.name === replacerConfig.name)
    ) {
      const updated = replacerConfig.replacer
        ? { ...replacerConfig, replacerConfig: replacerConfig.replacer.bind(this) }
        : replacerConfig;
      this.replacerConfigs.push(updated);
    }
  }

  /**
   * Applies a specific replacement to the given content.
   * @param content - The content to apply the replacement to.
   * @param name - The name of the replacer configuration to use.
   * @returns A promise that resolves to the modified content.
   */
  public replace(content: string, name: string): Promise<string> {
    const replacerConfig = this.getReplacer(name);
    if (!replacerConfig) {
      return Promise.resolve(content);
    }
    if (replacerConfig.custom && 'custom' in replacerConfig) {
      for (const custom of replacerConfig.custom) {
        if (custom in replacerConfig) {
          return Promise.resolve(replacerConfig[custom](content));
        }
      }
    } else if (replacerConfig.simple && replacerConfig.replacement) {
      return Promise.resolve(
        ReplacementManager.simpleReplace(
          content,
          replacerConfig.pattern,
          replacerConfig.replacement,
        ),
      );
    } else if (replacerConfig.replacer instanceof Function) {
      let newContent = content;
      const contentMatches = content.matchAll(replacerConfig.pattern) || [];
      for (const match of contentMatches) {
        newContent = newContent.replace(match[0], replacerConfig.replacer(match));
      }
      return Promise.resolve(newContent);
    }
    return Promise.resolve(content);
  }

  /**
   * Applies all applicable replacements to the given content based on file path.
   * @param content - The content to apply replacements to.
   * @param file - The file path associated with the content.
   * @returns A promise that resolves to the modified content.
   */
  public async replaceAll(content: string, file: string): Promise<string> {
    const newContent = content;
    const replacerConfigsToApply = this.replacerConfigs.filter(
      (replacerConfig) => !(replacerConfig.pathFilter && !replacerConfig.pathFilter(file)),
    );
    const promiseChain: Promise<string>[] = [];
    for (const replacerConfig of replacerConfigsToApply) {
      promiseChain.push(this.replace(newContent, replacerConfig.name));
    }
    return await Promise.allSettled(promiseChain).then((results) =>
      results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)
        .join('\n'),
    );
  }

  /**
   * Applies all applicable replacements to a set of files.
   * Reads each file, applies replacements, and writes the modified content back.
   * @param files - An array of file paths to process.
   * @returns A promise that resolves when all files have been processed.
   */
  public async replaceAllFiles(files: string[]): Promise<void> {
    const filePromises = files.map(async (file) => {
      const content = await fs.readFile(file, 'utf8');
      const newContent = await this.replaceAll(content, file);
      await fs.writeFile(file, newContent);
    });
    await Promise.all(filePromises);
  }

  /**
   * Performs a simple string replacement.
   * @param content - The content to perform the replacement on.
   * @param pattern - The regular expression pattern to match.
   * @param replacement - The replacement string.
   * @returns The modified content.
   */
  public static simpleReplace(content: string, pattern: RegExp, replacement: string): string {
    return content.replace(pattern, replacement);
  }

  /**
   * Retrieves a replacer configuration by its name.
   * @param name - The name of the replacer configuration to retrieve.
   * @returns The replacer configuration if found, otherwise undefined.
   */
  public getReplacer(name: string): ReplacerConfig | undefined {
    return this.replacerConfigs.find((r) => r.name === name);
  }

  /**
   * Gets all replacer configurations.
   * @returns An array of all replacer configurations.
   */
  public getReplacers(): ReplacerConfig[] {
    return this.replacerConfigs;
  }

  /**
   * Clears all replacer configurations.
   */
  public clearReplacers(): void {
    this.replacerConfigs = [];
  }
}

function getOutputKey(
  output: EsbuildOutput,
  predicate: (key: string) => boolean,
): string | undefined {
  const outputs = Object.keys(output);
  const key = outputs.find(predicate);
  if (key) {
    return key;
  }
  return undefined;
}

const replacerConfigs: ReplacerConfig[] = [
  {
    name: 'import',
    pattern: /import (?<variable>\w+)\sfrom\s(?<path>"[a-zA-Z0-9/._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match?.groups) {
        // @ts-ignore - TS doesn't know we're compiling to esm in esbuild
        return `var ${match.groups.variable} = ${match.groups.path.replace('..', 'assets')};`;
      }
      return match[0];
    },
    pathFilter: (path: string) => {
      return path.includes('index') && path.endsWith('js') && !path.includes('map');
    },
  },
  {
    // biome-ignore lint/nursery/noSecrets: not a secret, just a variable name
    name: 'cacheWorkerImports',
    pattern:
      /import (?<variable>\w+)\sfrom\s(?<quote>")\.\/(?<path>assets\/\w+\/[a-zA-Z0-9._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match?.groups) {
        return `var ${match.groups.variable} = new URL(${match.groups.quote}${match.groups.path}, self.location.origin);`;
      }
      return match[0];
    },
    pathFilter: (path: string) => {
      return path.includes('cacheWorker') && path.endsWith('js') && !path.includes('map');
    },
  },
  {
    name: 'cacheWorker',
    pattern: /cacheWorker\.ts/g,
    simple: true,
    replacement: '',
  },
];

export const ReplacersPlugin = {
  // biome-ignore lint/nursery/noSecrets: definitely not a secret
  name: 'ReplacementManager',
  /**
   * Sets up the plugin.
   * @param build - The esbuild build object.
   */
  setup(build: esbuild.PluginBuild) {
    build.onEnd(async (results: esbuild.BuildResult) => {
      buildOutput = results.metafile?.outputs || {};
      const indexKey = await getOutputKey(
        buildOutput,
        (key) => key.includes('index') && key.endsWith('js') && !key.includes('map'),
      );
      const workerKey = await getOutputKey(
        buildOutput,
        (key) => key.includes('cacheWorker') && key.endsWith('js') && !key.includes('map'),
      );
      const updatedReplacers = replacerConfigs.map((replacerConfig) => {
        if (!('replacement' in replacerConfig)) {
          return replacerConfig;
        }
        replacerConfig.replacement = workerKey.replace('docs/', '');
        return replacerConfig;
      });
      const replacersInstance = new ReplacementManager(updatedReplacers);
      const files = [indexKey, workerKey].filter(Boolean);
      await replacersInstance.replaceAllFiles(files);
    });
  },
};
