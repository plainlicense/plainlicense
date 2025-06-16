/** biome-ignore-all lint/correctness/noNodejsModules: because build script */

import type esbuild from 'esbuild'
import manifestPlugin from 'esbuild-plugin-manifest'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import type { EsbuildOutput, ReplacerConfig } from '../types'

let buildOutput: EsbuildOutput = {};

const Manifest = manifestPlugin({
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
  hash: false,
});

/**
 * Manages a collection of replacement configurations for string manipulation.
 * Provides methods to add, retrieve, and apply replacements to content.
 */
class ReplacementManager {
	private replacerConfigs: ReplacerConfig[] = [];

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
	addReplacer(config: ReplacerConfig): void {
		// Validate configuration
		if (!config.name || !config.pattern) {
			throw new Error('ReplacerConfig must have both name and pattern properties');
		}

		if (!config.replacement && !config.replacer && !config.customMethod) {
			throw new Error('ReplacerConfig must have at least one replacement mechanism');
		}

		// Check for duplicate names
		if (this.replacerConfigs.some(r => r.name === config.name)) {
			throw new Error(`Replacer with name '${config.name}' already exists`);
		}

		// Validate regex pattern
		if (!(config.pattern instanceof RegExp)) {
			throw new Error('Pattern must be a RegExp object');
		}

		this.replacerConfigs.push(config);
	}

	/**
	 * Applies a specific replacement to the given content.
	 * @param content - The content to apply the replacement to.
	 * @param name - The name of the replacer configuration to use.
	 * @returns A promise that resolves to the modified content.
	 */
	public async replace(name: string, content: string): Promise<string> {
		const replacerConfig = this.replacerConfigs.find((replacer) => replacer.name === name);
		if (!replacerConfig) {
			throw new Error(`Replacer with name '${name}' not found`);
		}

		try {
			if (replacerConfig.customMethod) {
				// Handle custom method calls
				if (replacerConfig.customMethod === 'removeSourceReferences') {
					return content.replace(replacerConfig.pattern, replacerConfig.replacement || '');
				}
			} else if (replacerConfig.replacement) {
				// Handle simple replacement
				return content.replace(replacerConfig.pattern, replacerConfig.replacement);
			} else if (replacerConfig.replacer) {
				// Handle function-based replacement
				let newContent = content;
				const matches = Array.from(content.matchAll(replacerConfig.pattern));

				for (const match of matches) {
					const replacement = await replacerConfig.replacer(match);
					newContent = newContent.replace(match[0], replacement);
				}
				return newContent;
			}
		} catch (error) {
			throw new Error(`Error applying replacer '${name}': ${error.message}`);
		}

		return content;
	}

	/**
	 * Applies all applicable replacements to the given content based on file path.
	 * @param content - The content to apply replacements to.
	 * @param file - The file path associated with the content.
	 * @returns A promise that resolves to the modified content.
	 */
	public async replaceAll(content: string, filePath: string): Promise<string> {
		const applicableReplacers = this.replacerConfigs.filter(replacer =>
			!replacer.pathFilter || replacer.pathFilter(filePath)
		);

		let processedContent = content;

		for (const replacer of applicableReplacers) {
			try {
				processedContent = await this.replace(replacer.name, processedContent);
			} catch (error) {
				console.warn(`Failed to apply replacer '${replacer.name}' to file '${filePath}':`, error);
			}
		}

		return processedContent;
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

// Create instance of ReplacementManager
const replacementManager = new ReplacementManager();

const ReplacersPlugin: esbuild.Plugin = {
	name: 'replacers',
	setup(build) {
		build.onEnd(async (result) => {
			if (!result.outputFiles) {
				return;
			}

			const outputFiles = result.outputFiles.filter(
				(file) => file.path.endsWith('.js')
			);

			for (const file of outputFiles) {
				try {
					const originalContent = new TextDecoder().decode(file.contents);
					const processedContent = await replacementManager.replaceAll(originalContent, file.path);

					if (processedContent !== originalContent) {
						file.contents = new TextEncoder().encode(processedContent);
						console.log(`Applied replacements to: ${file.path}`);
					}
				} catch (error) {
					console.error(`Error processing file ${file.path}:`, error);
				}
			}
		});
	},
};

export { Manifest, replacementManager, ReplacersPlugin }
