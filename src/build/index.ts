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
import { PROJECTS, backupImage, basePosterObj, baseProject, webConfig } from "./config/"
import { FileHashes, ImageIndex, Manifest, Project, buildJson, esbuildOutputs } from "./types"
import * as utils from "./utils"

// TODO: Refactor to use esbuild's transform API and reduce the number of file reads and writes

/** ========================================================================
 **                            Templates and Working Data
 *========================================================================**/

const noScriptImage: ImageIndex = {
  ...basePosterObj,
}

let currentProject: Project = baseProject
const projects = PROJECTS
const remainingProjects = () => projects.length - (projects.indexOf(currentProject) + 1)
let newFileLocs: FileHashes = {}
let outputMeta = {}

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
  try {
    const manifest = await fs.readFile("docs/manifest.json", "utf-8")
    const parsedManifest: Manifest = JSON.parse(manifest)
    const deletionPromises: Promise<void>[] = []
    for (const [key, value] of Object.entries(parsedManifest)) {
      if (key.endsWith(".js") || key.endsWith(".css") || key.endsWith(".map")) {
        deletionPromises.push(Promise.resolve(await fs.rm(`docs/${value.file}`, { force: true })))
        continue
      }
      const srcFile = key.replace("docs/", "src/")
      const { file, integrity } = value
      const srcFileContent = await fs.readFile(srcFile)
      const srcIntegrity = await utils.calculateIntegrity(srcFileContent)
      if (srcIntegrity !== integrity) {
        deletionPromises.push(Promise.resolve(await fs.rm(`docs/${file}`, { force: true })))
      }
    }
    return deletionPromises
  } catch (error) {
    console.error("Error clearing directories:", error)
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
 * @function buildNoScriptImage
 * @descripts Constructs the noscript image element.
 * @param {ImageIndex} noScriptImage - The base image index object.
 * @returns {Promise<string>} A promise resolving to the generated `<picture>` element string.
 */
const buildNoScriptImage = async (noScriptImage: ImageIndex): Promise<string> => {
  const noScriptFiles = await utils.getImageHeroes(backupImage)
  const noScriptIndex = await utils.constructImageIndex(noScriptFiles)
  const newIndex = { ...noScriptImage, ...noScriptIndex }
  return Promise.resolve(utils.generatePictureElement(newIndex))
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
  const noScriptImageContent = await buildNoScriptImage(noScriptImage)

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

async function main(): Promise<void> {
  try {
    console.log("Building Plain License...")
    console.log("Clearing directories...")
    const deletePromises = await clearDirs()
    await Promise.allSettled(deletePromises).then(async () => {
      console.log("Directories cleared")
      const buildPromises = await buildAll()
      await Promise.allSettled(buildPromises).then(async () => {
        console.log("Plain License built")
      })
    })
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
