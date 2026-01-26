/**
 * Custom Sprite Manager
 *
 * Handles importing, storing, and managing custom sprite sheets
 * for the pet feature. Sprites are stored in the user data directory.
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { CustomSprite } from '../../shared/pet-types'
import { DEFAULT_SPRITE_CONFIG } from '../../shared/pet-types'

// Directory for storing custom sprites
const getSpritesDir = () => path.join(app.getPath('userData'), 'sprites')
const getSpritesMetaFile = () => path.join(getSpritesDir(), 'sprites.json')

/**
 * Ensure the sprites directory exists
 */
async function ensureSpritesDir(): Promise<void> {
  const dir = getSpritesDir()
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Load sprites metadata from JSON file
 */
async function loadSpritesMetadata(): Promise<CustomSprite[]> {
  try {
    const metaFile = getSpritesMetaFile()
    const content = await fs.readFile(metaFile, 'utf-8')
    return JSON.parse(content)
  } catch {
    // File doesn't exist or is invalid, return empty array
    return []
  }
}

/**
 * Save sprites metadata to JSON file
 */
async function saveSpritesMetadata(sprites: CustomSprite[]): Promise<void> {
  await ensureSpritesDir()
  const metaFile = getSpritesMetaFile()
  await fs.writeFile(metaFile, JSON.stringify(sprites, null, 2), 'utf-8')
}

/**
 * Get all custom sprites
 */
export async function getAllCustomSprites(): Promise<CustomSprite[]> {
  return loadSpritesMetadata()
}

/**
 * Get a custom sprite by ID
 */
export async function getCustomSprite(id: string): Promise<CustomSprite | null> {
  const sprites = await loadSpritesMetadata()
  return sprites.find((s) => s.id === id) ?? null
}

/**
 * Import a sprite from a file path
 *
 * @param sourcePath - Path to the source sprite sheet image
 * @param name - Display name for the sprite
 * @param config - Optional sprite configuration (defaults to Confirmo format)
 * @returns The created CustomSprite object
 */
export async function importSprite(
  sourcePath: string,
  name: string,
  config?: Partial<Omit<CustomSprite, 'id' | 'name' | 'imagePath'>>
): Promise<CustomSprite> {
  await ensureSpritesDir()

  // Generate unique ID and filename
  const id = randomUUID()
  const ext = path.extname(sourcePath)
  const filename = `${id}${ext}`
  const destPath = path.join(getSpritesDir(), filename)

  // Copy the image file to sprites directory
  await fs.copyFile(sourcePath, destPath)

  // Create sprite metadata
  const sprite: CustomSprite = {
    id,
    name,
    imagePath: destPath,
    ...DEFAULT_SPRITE_CONFIG,
    ...config,
  }

  // Save to metadata
  const sprites = await loadSpritesMetadata()
  sprites.push(sprite)
  await saveSpritesMetadata(sprites)

  return sprite
}

/**
 * Update a custom sprite's configuration
 */
export async function updateSprite(
  id: string,
  updates: Partial<Omit<CustomSprite, 'id' | 'imagePath'>>
): Promise<CustomSprite | null> {
  const sprites = await loadSpritesMetadata()
  const index = sprites.findIndex((s) => s.id === id)

  if (index === -1) {
    return null
  }

  sprites[index] = { ...sprites[index], ...updates }
  await saveSpritesMetadata(sprites)

  return sprites[index]
}

/**
 * Delete a custom sprite
 */
export async function deleteSprite(id: string): Promise<boolean> {
  const sprites = await loadSpritesMetadata()
  const sprite = sprites.find((s) => s.id === id)

  if (!sprite) {
    return false
  }

  // Delete the image file
  try {
    await fs.unlink(sprite.imagePath)
  } catch {
    // Ignore if file doesn't exist
  }

  // Remove from metadata
  const filtered = sprites.filter((s) => s.id !== id)
  await saveSpritesMetadata(filtered)

  return true
}

/**
 * Get the sprites directory path (for file dialog default location)
 */
export function getSpritesDirectory(): string {
  return getSpritesDir()
}
