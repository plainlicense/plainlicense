import * as crypto from "crypto"
import * as fs from "fs/promises"
import globby from "globby"
import path, { ParsedPath } from "path"
import { optimize } from "svgo"
import {
  basePath,
  cssLocs,
  cssSrc,
  hashPattern,
  imageTypes,
  mediaExtensionPattern,
  resKeys,
  resPattern,
  videoCodecs,
  videoExtensions,
} from "../config"
import type {
  HeroFile,
  HeroFiles,
  HeroPaths,
  ImageIndex,
  ImageType,
  MediaFileExtension,
  PlaceholderMap,
  VideoWidth,
} from "../types"

/**
 * Calculates the SHA384 integrity hash of a given buffer.
 * Hashes the provided content using SHA384 and returns the result as a base64-encoded string prefixed with "sha384-".
 * @param content - The buffer to calculate the hash from.
 * @returns A promise that resolves to the SHA384 integrity hash string.
 */
export async function calculateIntegrity(content: Buffer): Promise<string> {
  const hash = crypto.createHash("sha384")
  hash.update(content)
  return `sha384-${hash.digest("base64")}`
}

/**
 * Replace the src path with the docs path.
 * @param srcPath - The source path to convert.
 * @returns {string} The corresponding docs path.
 */
export function srcToDocs(srcPath: string): string {
  return srcPath.replace("src", "docs")
}

/**
 * Checks if a file exists at the given path.
 * @param filePath - The path to the file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return await fs
    .access(filePath)
    .then(() => true)
    .catch(() => false)
}

/** Checks if a path is a directory */
export async function isDir(filePath: string): Promise<boolean> {
  return await fs
    .stat(filePath)
    .then((stat) => stat.isDirectory())
    .catch(() => false)
}

/*
 * Retrieves the file hash for a file, if it's available.
 * Returns an empty string if the hash is not found.
 */
export function getHash(filePath: string): string {
  const pattern = new RegExp(hashPattern)
  const match = filePath.match(pattern)
  return match ? match[1] : ""
}

/**
 * Compares two HeroPath-based arrays based on their width as numbers in descending order.
 * @param a - The first array
 * @param b - The second array
 * @returns {number} A negative number if a's width is greater than b's, positive if b, else 0.
 */
function sortWidths(a: [string, unknown], b: [string, unknown]): number {
  const widthA = parseInt(a[0], 10)
  const widthB = parseInt(b[0], 10)
  return widthB - widthA
}

/**
 * Extracts the base name from a filename.
 * Splits the filename by '.', removes extensions, resolutions, and codecs, and returns the remaining base name.
 * @param filename - The filename to extract the base name from.
 * @returns The base name of the file.
 */
export const getBaseName = (parsed: ParsedPath): string => {
  const splitIt = (p: string) => {
    return p.split("/").pop()
  }
  const { name, dir, ext } = parsed
  if (ext !== "" && ext !== undefined) {
    if (dir.includes("poster")) {
      return splitIt(path.parse(dir).dir)
    } else {
      return splitIt(dir)
    }
  } else if (name === "poster") {
    return splitIt(dir)
  } else {
    return name
  }
}

/**
 * Validates the input filename and extension.
 * Checks if the filename and extension are valid and if the extension matches the media extension pattern.
 * Throws an error if the input is invalid.
 * @param filename - The filename to validate.
 * @param ext - The extension to validate.
 * @returns True if the input is valid, otherwise throws an error.
 */
const validatePathInput = (filename: string, ext: string): boolean => {
  const isEmpty = (s: string) => s === "" || s === undefined || s === null
  const isValid =
    !isEmpty(filename) &&
    !isEmpty(ext) &&
    filename.includes(ext) &&
    new RegExp(mediaExtensionPattern()).test(ext)
  if (!isValid) {
    console.error(`Invalid input: ${filename} or ${ext}`)
    throw new Error("Invalid input")
  }
  return isValid
}

/**
 * Deconstructs a file path string into a HeroFile object.
 * Parses the path to extract information such as filename, extension, width, codec, and hash, and returns a structured HeroFile object.
 * @param pathStr - The file path string to deconstruct.
 * @returns A Promise that resolves to a HeroFile object containing the extracted information.
 */
export async function deconstructPath(pathStr: string): Promise<HeroFile> {
  const { base, ext, dir, name, root } = path.parse(pathStr)
  const baseName = getBaseName({ base, dir, ext, name, root })
  const width = parseInt(new RegExp(resPattern).exec(base)[0], 10) as VideoWidth
  const type = videoExtensions.includes(ext.slice(1)) ? "video" : "image"
  const codec = type === "video" ? videoCodecs.find((c) => base.includes(c)) : undefined
  const parentPath = srcToDocs(dir)
  validatePathInput(base, ext)
  return {
    baseName,
    extension: ext.slice(1) as MediaFileExtension,
    width,
    srcPath: pathStr,
    type,
    ...(codec && { codec }), // omits codec if type is "image"
    parentPath,
    get parsed(): path.ParsedPath {
      return path.parse(this.srcPath) // changed from this.destPath to this.srcPath
    },
    get filename() {
      return this.parsed.base
    },
  }
}
/**
 * @param {string} glob The glob to resolve.
 * @param {globby.GlobbyOptions} fastGlobOptions Options to pass to fast-glob.
 * @returns {Promise<string[]>} A promise that resolves to the first file that matches the glob.
 */
export async function resolveGlob(glob: string, fastGlobOptions?: {}): Promise<string[]> {
  try {
    const result = await Promise.resolve(globby(glob, fastGlobOptions)).then((files) => files)
    if (result.length === 0) {
      throw new Error(`Glob "${glob}" did not match any files`)
    } else {
      return result
    }
  } catch (error) {
    console.error("Error resolving glob:", error)
    throw error
  }
}

/**
 * Retrieves and categorizes hero image and video files.
 * Orchestrates retrieving all hero files, deconstructing their paths, and categorizing them into image and video files.
 * @returns {Promise<HeroFiles>} A promise that resolves to an object containing arrays of image and video hero files.
 */
export async function getHeroFiles(): Promise<HeroFiles> {
  const files = await resolveGlob(`${basePath}/**`, {
    onlyFiles: true,
    unique: true,
    expandDirectories: { extensions: [...imageTypes, ...videoExtensions] },
  })
  const heroFiles = await Promise.all(files.map((file) => deconstructPath(file)))
  let images: HeroFile[] = []
  let videos: HeroFile[] = []
  for (const file of heroFiles) {
    file.codec ? videos.push(file) : images.push(file)
  }
  return { images, videos }
}

/**
 * @param {HeroPaths} paths to generate a Srcset for.
 * @returns {Promise<string>} A promise that resolves to the Srcset for the image.
 * @description Generates a Srcset property for the provided image index information.
 */
export async function generateSrcset(paths: HeroPaths): Promise<string> {
  const entries = await Promise.all(
    Object.entries(paths)
      .sort(sortWidths)
      .map(async ([width, src]) => {
        return `${src.replace("src/", "").replace("docs/", "")} ${width}w`
      }),
  )
  return entries.join(", ")
}

/**
 * @param {string} fullPath - the full path to the file
 * @returns {string} the file hash
 * @description Extracts the hash from a file name
 */
export async function getFileHash(fullPath: string): Promise<string> {
  if (!fullPath || typeof fullPath !== "string" || !fullPath.includes(".")) {
    return ""
  }
  const parsed = path.parse(fullPath)
  const fileName = parsed.name
  const hash = fileName.match(hashPattern)
  return hash ? hash[1] : ""
}

/**
 * @param {string} data - SVG data
 * @returns {string} the minified SVG data
 * @description Minifies SVG data
 */
export function minsvg(data: string): string {
  if (!data.startsWith("<")) {
    return data
  }

  const result = optimize(data, {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
      {
        name: "removeDimensions",
      },
    ],
  })

  return result.data
}

/**
 * @param {string} dir - the string to convert
 * @returns {string} the title-cased string
 */
export async function makeDir(dir: string): Promise<void> {
  if (
    !(await fs
      .stat(dir)
      .then(() => true)
      .catch(() => false))
  ) {
    await fs.mkdir(dir, { recursive: true })
  }
}

/**
 * @param {string} src - the source file
 * @param src - the source file
 * @param dest - the destination file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await makeDir(path.dirname(dest))
  if (!(await fileExists(dest))) {
    await fs.copyFile(src, dest)
  }
}

/**
 * Generates a picture element for the hero image
 * @param image - the hero image
 * @param className - the class name
 * @returns {string} the picture element
 */
export const generatePictureElement = (
  image: ImageIndex,
  className: string = "hero__poster",
): string => {
  console.log("Generating picture element")
  const { avif, webp, png } = image
  const sortedImages = { avif, webp, png }
  const sources = Object.entries(sortedImages)
    .filter(([ext, _]) => ext !== "png")
    .map(([ext, { srcset }]) => `<source type="image/${ext}" srcset="${srcset}">`)
    .join("\n")
  const sizes = Object.keys(png.widths)
    .map((width) => {
      if (width !== "3840") {
        return `(max-width: ${width}px) ${width}px`
      } else {
        return `${width}px`
      }
    })
    .join(", ")
  const img = `<img src="${png.widths[1280]}" class="${className}--image" draggable="false" fetchpriority="high" loading="eager" sizes="${sizes}" srcset="${png.srcset}">`

  return `<picture class="nojs .hero__backup ${className}--active" role="presentation">${sources}\n${img}</picture>`
}

/**
 * Extracts unique parent paths from an array of HeroFile objects.
 * Creates a set of parent paths to ensure uniqueness and then converts it back to an array.
 * @param {HeroFile[]} files An array of HeroFile objects.
 * @returns {string[]} An array of unique parent paths.
 */
export function getParents(files: HeroFile[]): string[] {
  const parents = new Set(files.map((file) => file.parentPath))
  return Array.from(parents)
}

/**
 * Resolves CSS files and generates a map of placeholders to their hashed filenames.
 * Retrieves CSS files, calculates their hashes, and creates a map of placeholders to the new filenames.
 * @returns {Promise<Partial<PlaceholderMap>>} A promise that resolves to a partial PlaceholderMap containing CSS file information.
 */
async function resolveCssFiles(): Promise<Partial<PlaceholderMap>> {
  const placeholders = await Promise.all(
    Object.entries(cssLocs).map(async ([key, value]) => {
      const entries = await Promise.all(
        Object.entries(value).map(async ([placehold, v]) => {
          const file = await resolveGlob(v, {
            onlyFiles: true,
            unique: true,
            expandDirectories: false,
          })
          const newloc = await getFileHash(file[0])
          return {
            [placehold]: newloc,
          }
        }),
      )
      return {
        [key]: Object.assign({}, ...entries),
      }
    }),
  )
  return Object.assign({}, ...(await Promise.all(placeholders)))
}

/**
 * Replaces placeholders in template files with their corresponding values.
 * Reads each template file, replaces placeholders with values from the provided map, and writes the updated content to a new file. Removes "_template" from the filename.
 * @param {PlaceholderMap} newContent A map of template file paths to placeholder names and their corresponding values.
 * @returns {Promise<void>}
 */
async function replacePlaceholders(newContent: PlaceholderMap): Promise<void> {
  const mapping = Object.fromEntries(
    Object.entries(newContent).filter(([k, _v]) => k.includes("bundle")),
  )
  for (const [file, placeholders] of Object.entries(mapping)) {
    try {
      const parsedPath = path.parse(file)
      const targetDir = parsedPath.dir
      await fs.mkdir(targetDir, { recursive: true })
      let content = await fs.readFile(file, "utf8")
      if (placeholders) {
        for (const [placeholder, value] of Object.entries(placeholders)) {
          const re = new RegExp(placeholder, "g")
          content = content.replace(re, value)
        }
      }
      const newFilename = parsedPath.base.replace(/^_/, "").replace(/_template/, "")
      const newPath = path.join(targetDir, newFilename)
      console.log(`Writing CSS bundle to ${newPath}`)
      await fs.writeFile(newPath, content, "utf8")
    } catch (err) {
      console.error(`Failed to process ${file}:`, err)
      throw err // Re-throw to handle in main build
    }
  }
}

// verifies that the CSS bundle was created
export async function verifyBundleCreated(): Promise<void> {
  if (!(await fileExists(cssSrc))) {
    throw new Error("CSS bundle was not created")
  }
}

/**
 * Generates a map of placeholder names to their corresponding file names.
 * Retrieves CSS files, calculates their hashes, and creates a map of placeholders to the new filenames.
 */
export async function generatePlaceholderMap(): Promise<void> {
  const cssHashMap = await Promise.resolve(resolveCssFiles())
  //const fontHashMap = await resolveFontFiles()
  const newContent = cssHashMap
  await replacePlaceholders(newContent)
}

/**
 * @function getImageHeroes
 * @summary Retrieves hero image files based on a given base name.
 * @param {string} baseName - The base name of the hero images to retrieve.
 * @returns {Promise<HeroFile[]>} A promise that resolves to an array of HeroFile objects representing the retrieved image files.
 */
export async function getImageHeroes(baseName: string): Promise<HeroFile[]> {
  const files = await Promise.resolve(
    resolveGlob(`${basePath.replace("src", "docs")}/${baseName}/posters/${baseName}*`),
  )
  return (await Promise.all(files.map((file) => deconstructPath(file)))).filter(Boolean)
}

/**
 * @function getHeroPaths
 * @summary Constructs a record of HeroPaths categorized by image type.
 * @param {HeroFile[]} images - An array of HeroFile objects representing the images.
 * @returns {Promise<Record<ImageType, HeroPaths>>} A promise that resolves to a record mapping image types to their corresponding paths and widths.
 */
async function getHeroPaths(images: HeroFile[]): Promise<Record<ImageType, HeroPaths>> {
  // Initialize objects for each image type
  const pathObjs: Record<ImageType, typeof resKeys> = {
    avif: resKeys,
    webp: resKeys,
    png: resKeys,
  }

  // Process each image type separately
  const imageTypes = Object.keys(pathObjs) as ImageType[]
  const pathsByType = await Promise.all(
    imageTypes.map(async (type) => {
      const typeImages = images.filter((img) => img.extension === type)
      const paths = typeImages.reduce((acc, image) => {
        const { width, srcPath } = image
        const src = srcPath.replace("src/", "").replace("docs/", "")
        const resolution = parseInt(width.toString(), 10)

        if (resolution in pathObjs[type]) {
          acc[resolution] = src
        }
        return acc
      }, {} as HeroPaths)

      return { [type]: paths }
    }),
  )

  // Combine results into final object
  return Object.assign({}, ...pathsByType) as Record<ImageType, HeroPaths>
}

/**
 * @function constructImageIndex
 * @description Constructs an image index object from an array of HeroFile objects.
 * @param {HeroFile[]} images - An array of HeroFile objects representing the images.
 * @returns {Promise<ImageIndex>} A promise that resolves to an ImageIndex object containing image information categorized by type.
 */
export async function constructImageIndex(images: HeroFile[]): Promise<ImageIndex> {
  const pathRecords = await getHeroPaths(images)
  const { avif, webp, png } = pathRecords
  const parent = images[0].parentPath
  return {
    avif: {
      widths: avif,
      srcset: await generateSrcset(avif),
      parent,
    },
    webp: {
      widths: webp,
      srcset: await generateSrcset(webp),
      parent,
    },
    png: {
      widths: png,
      srcset: await generateSrcset(png),
      parent,
    },
  } as ImageIndex
}
