import { createHash } from "crypto"
import esbuild from "esbuild"
import manifestPlugin from "esbuild-plugin-manifest"
import { promises as fs } from "fs"
import { EsbuildOutput, ReplacerConfig } from "../types"
import { get } from "http"

let buildOutput: EsbuildOutput = {}

export const Manifest = manifestPlugin({
  hash: false,
  append: false,
  // The `entries` object is what the contents of the manifest would normally be without using a custom `generate` function.
  // It is a string to string mapping of the original asset name to the output file name.
  generate: (entries) => {
    let manifest: Record<string, { file: string; integrity: string }> = {}

    for (const [source, file] of Object.entries(entries)) {
      const filePath = file.replace("docs/", "")
      manifest[source] = {
        file: filePath,
        integrity:
          "sha384-" +
          createHash("sha384")
            .update(filePath as string)
            .digest("base64"),
      }
    }
    return manifest
  },
})

class ReplacementManager {
  replacerConfigs: ReplacerConfig[] = []
  constructor(replacerConfig?: ReplacerConfig | ReplacerConfig[]) {
    if (replacerConfig) {
      if (Array.isArray(replacerConfig)) {
        replacerConfig.forEach((r) => {
          this.addReplacer(r)
        })
      } else {
        this.addReplacer(replacerConfig)
      }
    }
  }
  addReplacer(replacerConfig: ReplacerConfig) {
    if (
      replacerConfig.name &&
      replacerConfig.pattern &&
      (replacerConfig.replacer || replacerConfig.simple || replacerConfig.custom) &&
      !this.replacerConfigs.find((r) => r.name === replacerConfig.name)
    ) {
      const updated =
        replacerConfig.replacer ?
          { ...replacerConfig, replacerConfig: replacerConfig.replacer.bind(this) }
        : replacerConfig
      this.replacerConfigs.push(updated)
    }
  }

  public replace(content: string, name: string): Promise<string> {
    const replacerConfig = this.getReplacer(name)
    if (!replacerConfig) {
      return Promise.resolve(content)
    }
    if (replacerConfig.custom && "custom" in replacerConfig) {
      for (const custom of replacerConfig.custom) {
        if (custom in replacerConfig) {
          return Promise.resolve(replacerConfig[custom](content))
        }
      }
    } else if (replacerConfig.simple && replacerConfig.replacement) {
      return Promise.resolve(
        ReplacementManager.simpleReplace(
          content,
          replacerConfig.pattern,
          replacerConfig.replacement,
        ),
      )
    } else if (replacerConfig.replacer instanceof Function) {
      let newContent = content
      const contentMatches = content.matchAll(replacerConfig.pattern) || []
      for (const match of contentMatches) {
        newContent = newContent.replace(match[0], replacerConfig.replacer(match))
      }
      return Promise.resolve(newContent)
    }
    return Promise.resolve(content)
  }

  public async replaceAll(content: string, file: string): Promise<string> {
    let newContent = content
    for (const replacerConfig of this.replacerConfigs) {
      if (replacerConfig.pathFilter && !replacerConfig.pathFilter(file)) {
        continue
      }
      newContent = await this.replace(newContent, replacerConfig.name)
    }
    return newContent
  }

  public async replaceAllFiles(files: string[]): Promise<void> {
    const filePromises = files.map(async (file) => {
      const content = await fs.readFile(file, "utf8")
      const newContent = await this.replaceAll(content, file)
      await fs.writeFile(file, newContent)
    })
    await Promise.all(filePromises)
  }

  public static simpleReplace(content: string, pattern: RegExp, replacement: string): string {
    return content.replace(pattern, replacement)
  }

  public getReplacer(name: string): ReplacerConfig | undefined {
    return this.replacerConfigs.find((r) => r.name === name)
  }

  public getReplacers(): ReplacerConfig[] {
    return this.replacerConfigs
  }

  public clearReplacers(): void {
    this.replacerConfigs = []
  }
}

async function getOutputKey(
  output: EsbuildOutput = buildOutput,
  predicate: (key: string) => boolean,
): Promise<string | undefined> {
  const outputs = Object.keys(output)
  const key = outputs.find(predicate)
  if (key) {
    return key
  }
  return undefined
}

const replacerConfigs: ReplacerConfig[] = [
  {
    name: "import",
    pattern: /import (?<variable>\w+)\sfrom\s(?<path>"[a-zA-Z0-9/._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match && match.groups) {
        // @ts-ignore - TS doesn't know we're compiling to esm in esbuild
        return `var ${match.groups.variable} = new URL(${match.groups.path.replace("..", "assets")}, window.location.origin);`
      }
      return match[0]
    },
    pathFilter: (path: string) => {
      return path.includes("index") && path.endsWith("js") && !path.includes("map")
    },
  },
  {
    name: "cacheWorkerImports",
    pattern:
      /import (?<variable>\w+)\sfrom\s(?<quote>")\.\/(?<path>assets\/\w+\/[a-zA-Z0-9._-]+");/gi,
    replacer: (match: RegExpExecArray) => {
      if (match && match.groups) {
        return `var ${match.groups.variable} = new URL(${match.groups.quote}${match.groups.path}, self.location.origin);`
      }
      return match[0]
    },
    pathFilter: (path: string) => {
      return path.includes("cacheWorker") && path.endsWith("js") && !path.includes("map")
    },
  },
  {
    name: "cacheWorker",
    pattern: /cacheWorker\.ts/g,
    simple: true,
    replacement: "",
  },
]

export const ReplacersPlugin = {
  name: "ReplacementManager",
  setup(build: esbuild.PluginBuild) {
    build.onEnd(async (results: esbuild.BuildResult) => {
      buildOutput = results.metafile?.outputs || {}
      const indexKey = await getOutputKey(
        buildOutput,
        (key) => key.includes("index") && key.endsWith("js") && !key.includes("map"),
      )
      const workerKey = await getOutputKey(
        buildOutput,
        (key) => key.includes("cacheWorker") && key.endsWith("js") && !key.includes("map"),
      )
      const updatedReplacers = replacerConfigs.map((replacerConfig) => {
        if (!("replacement" in replacerConfig)) {
          return replacerConfig
        }
        replacerConfig.replacement = workerKey.replace("docs/", "")
        return replacerConfig
      })
      const replacersInstance = new ReplacementManager(updatedReplacers)
      const files = [indexKey, workerKey].filter(Boolean)
      await replacersInstance.replaceAllFiles(files)
    })
  },
}
