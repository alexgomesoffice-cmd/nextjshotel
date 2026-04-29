// src/lib/upload.ts
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import fs from 'fs'

// Extend Express Request type to include custom properties
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      uploadSubDir?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'

// Ensure upload directories exist
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.uploadSubDir || 'misc')
    ensureDir(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = `${uuidv4()}${ext}`
    cb(null, filename)
  },
})

// File filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

// Image processing with sharp
export async function processImage(
  inputPath: string,
  outputPath: string,
  options: {
    width?: number
    height?: number
    quality?: number
  } = {}
): Promise<void> {
  const { width, height, quality = 80 } = options

  let transformer = sharp(inputPath)

  if (width || height) {
    transformer = transformer.resize(width, height, { fit: 'inside', withoutEnlargement: true })
  }

  await transformer.jpeg({ quality }).toFile(outputPath)
}

// Generate thumbnail
export async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toFile(outputPath)
}