/**
 * @module BuildProcess
 * @description Comprehensive build and asset management system for Plain License
 * Handles image processing, esbuild configuration, hash breaking,
 * and metadata generation.
 *
 * It also generates a TypeScript file for hero images/videos, with all associated metadata,
 * and provides metadata used in the MKDocs build process.
 *
 * @overview
 * A build script that handles:
 * - Asset processing and optimization
 * - Image transformation and hashing
 * - SVG minification
 * - TypeScript file generation
 * - esbuild configuration and execution
 * - CSS placeholder replacement
 * - Build artifact management
 *
 * @see {@link https://esbuild.github.io/} esbuild Documentation
 * @see {@link https://rxjs.dev/} RxJS Documentation
 *
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */

import * as esbuild from "esbuild"
import * as fs from "fs/promises"
import * as path from "path"
import { Observable, from } from "rxjs"
import { PROJECTS, basePosterObj, baseProject, noDelete, webConfig } from "./config/"
import { FileHashes, , ImageIndex, Project, buildJson, esbuildOutputs } from "./types"
import * as utils from "./utils"
import { resolveGlob } from "./utils"

// TODO: Refactor to use esbuild's transform API and reduce the number of file reads and writes

/** ========================================================================
 **                            Templates and Working Data
 *========================================================================**/

const noScriptImage: ImageIndex = {
  ...basePosterObj,
}

const heroFiles: Promise<HeroFiles> = utils.getHeroFiles()

let currentProject: Project = baseProject
const projects = PROJECTS
const remainingProjects = () => projects.length - (projects.indexOf(currentProject) + 1)
let newFileLocs: FileHashes = {}
let outputMeta = {}
let precache_urls = []
let metaCache = {}

/**
 * @param {Project} project - the project to build
 * @returns {Observable<Promise<void>>} an observable
 */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`)
  const config = webConfig
  try {
    const buildPromise = esbuild
      .build({
        ...config,
        ...project,
      })
      .then(async (result) => {
        if (result && result.metafile) {
          const output = await metaOutput(result)
          if (output) {
            outputMeta = { ...outputMeta, ...output }
            if (remainingProjects() === 0) {
              await writeMeta(outputMeta)
              await metaOutputMap(outputMeta)
            }
          }
        }
      })
    return from(buildPromise)
  } catch (error) {
    console.error(`Error building ${project.platform}:`, error)
  }
}

/**
 * @function clearDirs
 * @description Clears the directories in the docs folder
 */
async function clearDirs() {
  const files = await heroFiles
  const parents = utils.getParents(files.videos)
  const destParents = parents.map((parent) => utils.srcToDocs(parent))
  const dirs = [
    "docs/assets/stylesheets",
    "docs/assets/javascripts",
    "docs/assets/images",
    "docs/assets/fonts",
    "docs/assets/videos",
    "docs/chunks",
    ...destParents,
  ]
  const filesToDelete = new Set()
  try {
    const workerGlob = await resolveGlob("docs/cache_*")
    if (workerGlob) {
      workerGlob.forEach((file) => filesToDelete.add(file))
    }
  } catch (err) {
    console.log("No workers found to delete")
  }
  for (const dir of dirs) {
    const dirFiles = await fs.readdir(dir)
    dirFiles
      .filter((file) => {
        const parsed = path.parse(file)
        return !noDelete.includes(parsed.name)
      })
      .forEach((file) => filesToDelete.add(path.join(dir, file)))
  }
  for (const file of filesToDelete) {
    if (typeof file === "string" && file !== "" && !(await fs.lstat(file)).isDirectory()) {
      try {
        await fs.rm(file)
      } catch (err) {
        console.error(`Error removing file ${file}: ${err}`)
      }
    }
  }
}

/**
 * @param {esbuild.BuildResult} result - the esbuild build result
 * @returns {esbuild.BuildResult.esbuildOutputs} the 'outputs' section of the esbuild metafile
 * @description Gets the 'outputs' section of the esbuild metafile
 */
const metaOutput = async (result: esbuild.BuildResult): Promise<esbuildOutputs> => {
  if (!result.metafile) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(result.metafile.outputs).map(([key, output]) => [
      key,
      {
        bytes: output.bytes,
        inputs: Object.keys(output.inputs),
        exports: output.exports,
        entryPoint: output.entryPoint,
      },
    ]),
  )
}

/**
 * @param {esbuildOutputs} output - the esbuild outputs
 * @returns {Promise<buildJson>} the mapping object
 * @description Maps the metafile outputs
 */
const metaOutputMap = async (output: esbuildOutputs): Promise<buildJson> => {
  const keys = Object.keys(output)
  const jsSrcKey = keys.find((key) => key.endsWith(".js"))
  const cssSrcKey = keys.find(
    (key) => key.endsWith(".css") && key.includes("bundle") && !key.includes("javascripts"),
  )
  const logoKey =
    keys.find((key) => key.includes("logo_named")) ||
    Object.values(newFileLocs).find((value) => value.includes("logo_named"))
  const noScriptImageContent = utils.generatePictureElement(noScriptImage)

  const mapping = {
    noScriptImage: noScriptImageContent,
    SCRIPTBUNDLE: jsSrcKey?.replace("docs/", "") || "",
    CSSBUNDLE: cssSrcKey?.replace("docs/", "") || "",
    LOGONAMED: (logoKey as string)?.replace("docs/", "") || "",
  }
  const outputMetaPath = path.join("overrides", "buildmeta.json")
  await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2))

  return mapping // Return the mapping object
}

/**
 * @param {Object} metaOutput - the meta output
 * @description Writes the meta output to a file
 */
const writeMeta = async (metaOutput: {}) => {
  const mappedOutputs = {
    ...metaOutput,
    ...Object.fromEntries(
      Object.entries(newFileLocs).map(([_, val]) => [
        _,
        Array.isArray(val) ? val.flat().map((val) => val.replace("docs/", "")) : val,
      ]),
    ),
  }
  const metaJson = JSON.stringify(mappedOutputs, null, 2)
  await fs.writeFile(path.join("docs", "meta.json"), metaJson)
}

/**
 * @description Builds all projects
 * @returns {Promise<void>}
 */
async function buildAll(): Promise<any[]> {
  const handleSubscription = async (project: any) => {
    ;(await build(project)).subscribe({
      next: () => console.log(`Build for ${project.platform} completed successfully`),
      error: (error) => console.error(`Error building ${project.platform}:`, error),
      complete: () => console.log(`Build for ${project.platform} completed`),
    })
  }
  const buildPromises: Promise<Observable<any> | any>[] = []
  console.log("Building all projects...")
  buildPromises.push(clearDirs())
  console.log("Directories cleared")
  console.log("generating placeholder map")
  buildPromises.push(utils.generatePlaceholderMap())
  console.log("retrieving hero videos")
  buildPromises.push(utils.verifyBundleCreated())
  for (const project of projects) {
    try {
      currentProject = project
      console.log(`Building ${project.platform} of ${projects.length}...`)
      buildPromises.push(handleSubscription(project))
    } catch (error) {
      console.error(`Error building ${project.platform}:`, error)
    }
  }
  return buildPromises
}

async function findAndWriteCache(): Promise<boolean> {
  try {
    const result = await resolveGlob("docs/*").then((files) =>
      files.filter((file) => file.match(/cache_worker\.[A-Z0-9]{8}\.js/)),
    )
    if (result && result.length > 0 && typeof metaCache === "string") {
      const cacheLoc = result[0]
      await fs.writeFile(cacheLoc, metaCache)
      return true
    }
    return false
  } catch (error) {
    console.error("Error writing cache:", error)
    return false
  }
}

async function replaceBadPath(): Promise<void> {
  const indexJs = await resolveGlob("docs/assets/javascripts/index.*.js")
  if (
    indexJs &&
    indexJs.length > 0 &&
    metaCache["worker"] &&
    typeof metaCache["worker"] === "string"
  ) {
    try {
      const jsContent = await fs.readFile(indexJs[0], "utf8")
      const replaced = jsContent.replace(/\.\/cache_worker\.ts/g, metaCache["worker"])
      await fs.writeFile(indexJs[0], replaced, "utf8")
      console.log("Bad path replaced")
    } catch (error) {
      console.error("Error replacing bad path:", error)
    }
  }
}

async function main(): Promise<void> {
  try {
    console.log("Building Plain License...")
    const buildPromises = await buildAll()
    await Promise.allSettled(buildPromises).then(async () => {
      console.log("Plain License built")

      await replaceBadPath()
      const cacheResult = await findAndWriteCache()
      Promise.resolve(cacheResult)

      console.log(cacheResult ? "Cache written" : "Cache not written")
    })
    console.log("Build process completed")
  } catch (error) {
    console.error("Build process failed:", error)
    throw error
  }
}

// Single entry point with proper error handling
main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
