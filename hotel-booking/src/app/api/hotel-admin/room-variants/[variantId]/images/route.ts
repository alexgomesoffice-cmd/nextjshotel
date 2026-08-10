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

async function assertOwnership(variantId: number, hotelId: number) {
  const variant = await prisma.room_variants.findUnique({
    where: { id: variantId },
    include: { room_type: true },
  })
  return variant && variant.room_type.hotel_id === hotelId ? variant : null
}

type Params = { params: Promise<{ variantId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { variantId } = await params
    const id = parseInt(variantId)
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const variant = await assertOwnership(id, hotelId!)
    if (!variant) return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })

    const images = await prisma.room_images.findMany({ where: { room_variant_id: id }, orderBy: { sort_order: 'asc' } })
    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('Fetch variant images error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST — appends photos to the variant's shared gallery. Never replaces
 * what's already there (Section 6/19 — joining rooms don't overwrite it).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { variantId } = await params
    const id = parseInt(variantId)
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const variant = await assertOwnership(id, hotelId!)
    if (!variant) return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) return NextResponse.json({ success: false, message: 'No files provided' }, { status: 400 })

    await ensureDir()
    const existingCount = await prisma.room_images.count({ where: { room_variant_id: id } })
    const urls: string[] = []
    for (const file of files) {
      if (!(file instanceof Blob)) continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${uuidv4()}.webp`
      await sharp(buffer).resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, filename))
      urls.push(`/uploads/rooms/${filename}`)
    }

    await prisma.room_images.createMany({
      data: urls.map((url, idx) => ({
        room_variant_id: id,
        image_url: url,
        is_cover: existingCount === 0 && idx === 0,
        sort_order: existingCount + idx,
      })),
    })

    const images = await prisma.room_images.findMany({ where: { room_variant_id: id }, orderBy: { sort_order: 'asc' } })
    return NextResponse.json({ success: true, message: 'Photos added', data: images }, { status: 201 })
  } catch (error) {
    console.error('Upload variant images error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}