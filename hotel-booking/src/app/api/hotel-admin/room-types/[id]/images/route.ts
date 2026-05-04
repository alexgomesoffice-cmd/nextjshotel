import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'rooms')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)

    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No files provided' }, { status: 400 })
    }

    await ensureDir()
    const uploadedImages = []

    const maxSort = await prisma.room_images.aggregate({
      where: { room_type_id: roomTypeId },
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

      const imageUrl = `/uploads/rooms/${filename}`
      
      const imgRecord = await prisma.room_images.create({
        data: {
          room_type_id: roomTypeId,
          image_url: imageUrl,
          is_cover: false, // Default to false, handled below
          sort_order: currentSortOrder++
        }
      })

      uploadedImages.push(imgRecord)
    }

    // Check if there's any cover, if not make the first one cover
    const coverExists = await prisma.room_images.findFirst({
      where: { room_type_id: roomTypeId, is_cover: true }
    })
    
    if (!coverExists && uploadedImages.length > 0) {
      await prisma.room_images.update({
        where: { id: uploadedImages[0].id },
        data: { is_cover: true }
      })
      uploadedImages[0].is_cover = true
    }

    return NextResponse.json({ success: true, data: uploadedImages, message: 'Uploaded successfully' })
  } catch (error) {
    console.error('Upload room image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
