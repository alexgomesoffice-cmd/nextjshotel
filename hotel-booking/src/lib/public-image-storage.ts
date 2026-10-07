import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const MAX_IMAGE_SIZE = 1 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALLOWED_FORMATS = ['png', 'jpeg', 'webp']

export class ImageUploadError extends Error {}

function getUploadDirectory(subdirectory: string) {
  if (!subdirectory || path.basename(subdirectory) !== subdirectory) {
    throw new Error('Invalid image upload directory')
  }

  return path.join(process.cwd(), 'public', 'uploads', subdirectory)
}

export async function storePublicImage(file: File, subdirectory: string) {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new ImageUploadError('Image must be 1 MB or smaller.')
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ImageUploadError('Only PNG, JPEG, and WEBP images are supported.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new ImageUploadError('Image must be 1 MB or smaller.')
  }

  let format: string | undefined
  try {
    format = (await sharp(buffer).metadata()).format
  } catch {
    throw new ImageUploadError('The uploaded file is not a valid image.')
  }

  if (!format || !ALLOWED_FORMATS.includes(format)) {
    throw new ImageUploadError('Only PNG, JPEG, and WEBP images are supported.')
  }

  const directory = getUploadDirectory(subdirectory)
  await fs.mkdir(directory, { recursive: true })

  const filename = `${uuidv4()}.webp`
  const filePath = path.join(directory, filename)

  try {
    await sharp(buffer).webp({ quality: 80 }).toFile(filePath)
  } catch (error) {
    try {
      await fs.unlink(filePath)
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to cleanup incomplete uploaded image:', cleanupError)
      }
    }
    throw error
  }

  return {
    imageUrl: `/uploads/${subdirectory}/${filename}`,
    filePath,
  }
}

export async function removePublicImageFile(filePath: string, subdirectory: string) {
  const directory = getUploadDirectory(subdirectory)
  const resolvedFilePath = path.resolve(filePath)

  if (path.dirname(resolvedFilePath) !== path.resolve(directory)) {
    throw new Error('Refusing to delete an image outside its upload directory')
  }

  await fs.unlink(resolvedFilePath)
}

export async function deletePublicImage(imageUrl: string, subdirectory: string) {
  const prefix = `/uploads/${subdirectory}/`
  if (!imageUrl.startsWith(prefix)) return

  const filename = imageUrl.slice(prefix.length)
  if (!filename || path.basename(filename) !== filename) return

  await removePublicImageFile(path.join(getUploadDirectory(subdirectory), filename), subdirectory)
}
