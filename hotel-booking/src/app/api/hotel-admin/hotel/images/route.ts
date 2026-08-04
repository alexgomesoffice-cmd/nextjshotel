import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { stageFieldChange, getLatestCase } from '@/lib/case-engine'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

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
      orderBy: { sort_order: 'asc' },
    })

    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('Fetch images error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/hotel/images
 * Files are saved to disk immediately (just storage), but the DB row that
 * actually adds them to the live gallery is staged into the open draft case
 * — the image doesn't appear on the public listing until approved.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No files provided' }, { status: 400 })
    }

    await ensureDir()

    const wantCover = formData.get('set_as_cover') === 'true'
    const coverIndexRaw = formData.get('set_as_cover_index')
    const coverIndex = coverIndexRaw !== null && coverIndexRaw !== '' ? Number(coverIndexRaw) : null
    const images = await prisma.hotel_images.findMany({ where: { hotel_id: hotelId }, select: { id: true } })
    const coverOnFirstUpload = images.length === 0 && wantCover
    const coverOnIndexedUpload = Number.isInteger(coverIndex) && coverIndex! >= 0 && coverIndex! < files.length
    const stagedImages: { image_url: string; is_cover: boolean; sort_order: number }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof Blob)) continue
      if (file.size > 1 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'File size exceeds 1MB limit' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${uuidv4()}.webp`
      const filepath = path.join(UPLOAD_DIR, filename)

      await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath)

      const imageUrl = `/uploads/hotels/${filename}`
      stagedImages.push({
        image_url: imageUrl,
        is_cover: (coverOnIndexedUpload && i === coverIndex) || (coverOnFirstUpload && i === 0),
        sort_order: i,
      })
    }

    try {
      await stageFieldChange({
        hotelId,
        hotelAdminId,
        entityType: 'HOTEL_IMAGE',
        entityId: null,
        fieldName: null,
        previousValue: null,
        proposedValue: stagedImages,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e.message || 'Failed to stage image' }, { status: 400 })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Photo(s) proposed — pending review', data: { currentCase } })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}