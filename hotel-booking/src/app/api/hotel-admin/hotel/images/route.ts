import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'hotels')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const images = await prisma.hotel_images.findMany({
      where: { hotel_id: hotelId },
      orderBy: { sort_order: 'asc' }
    })

    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('Fetch images error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const setAsCoverStr = formData.get('set_as_cover') as string | null
    const setAsCover = setAsCoverStr === 'true'

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No files provided' }, { status: 400 })
    }

    await ensureDir()

    const uploadedImages = []

    // Get current max sort order
    const maxSort = await prisma.hotel_images.aggregate({
      where: { hotel_id: hotelId },
      _max: { sort_order: true }
    })
    let currentSortOrder = (maxSort._max.sort_order || 0) + 1

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof Blob)) continue

      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${uuidv4()}.webp`
      const filepath = path.join(UPLOAD_DIR, filename)

      // Resize and convert to WebP using sharp
      await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath)

      const imageUrl = `/uploads/hotels/${filename}`
      
      // If it's the first upload ever, or explicitly requested, set as cover
      const isCover = (setAsCover && i === 0) 
      
      if (isCover) {
        // Reset all other images to false
        await prisma.hotel_images.updateMany({
          where: { hotel_id: hotelId },
          data: { is_cover: false }
        })
      }

      const imgRecord = await prisma.hotel_images.create({
        data: {
          hotel_id: hotelId,
          image_url: imageUrl,
          is_cover: isCover,
          sort_order: currentSortOrder++
        }
      })

      uploadedImages.push(imgRecord)
    }

    // Check if there's any cover, if not make the first one cover
    const coverExists = await prisma.hotel_images.findFirst({
      where: { hotel_id: hotelId, is_cover: true }
    })
    
    if (!coverExists && uploadedImages.length > 0) {
      await prisma.hotel_images.update({
        where: { id: uploadedImages[0].id },
        data: { is_cover: true }
      })
      uploadedImages[0].is_cover = true
    }

    return NextResponse.json({ success: true, data: uploadedImages, message: 'Uploaded successfully' })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
