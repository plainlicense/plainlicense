import fs from "fs"
import path from "path"
import crypto from "crypto"

const cacheFilePath = path.join(__dirname, "../../..", ".cache", "file-hashes.json")

export function getFileHash(filePath: fs.PathOrFileDescriptor): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash("md5").update(fileBuffer).digest("hex")
}

export function loadCache(): Record<string, string> {
  if (fs.existsSync(cacheFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFilePath, "utf-8"))
    } catch (error) {
      console.warn("Cache file exists but couldn't be parsed. Creating new cache.")
      return {}
    }
  }
  // Ensure directory exists
  const cacheDir = path.dirname(cacheFilePath)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  return {}
}

export function saveCache(cache: Record<string, string>): void {
  const cacheDir = path.dirname(cacheFilePath)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
}

export function copyIfChanged(source: string, destination: string): void {
  const cache = loadCache()
  const sourceHash = getFileHash(source)

  if (cache[source] !== sourceHash || !fs.existsSync(destination)) {
    fs.copyFileSync(source, destination)
    cache[source] = sourceHash
    saveCache(cache)
  }
}

export function shouldCopyFile(filePath: string): boolean {
  const cache = loadCache()
  const currentHash = getFileHash(filePath)

  console.log(`Current Hash: ${currentHash}, Cached Hash: ${cache[filePath]}`)
  console.log(`Should copy file: ${filePath}, ${cache[filePath] !== currentHash}`)
  if (!cache[filePath]) {
    return true
  }
  return cache[filePath] !== currentHash
}
