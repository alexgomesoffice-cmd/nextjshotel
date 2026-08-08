import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { stageFieldChange, getLatestCase } from '@/lib/case-engine'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'room-types')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * POST /api/hotel-admin/room-types/propose
 * multipart form: name, description?, amenity_ids (JSON string array),
 * file (0 or 1 image — one room type, one photo). Stages a ROOM_TYPE
 * creation into the open draft case, plus one ROOM_TYPE_IMAGE entry linked
 * to it via a client_key (the room type has no real id until approved).
 * Nothing goes live until the System Admin approves it.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const formData = await req.formData()
    const name = (formData.get('name') as string | null)?.trim()
    const description = (formData.get('description') as string | null)?.trim() || null
    const amenityIdsRaw = formData.get('amenity_ids') as string | null
    const file = formData.get('file') as File | null

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, message: 'Room type name is required' }, { status: 400 })
    }

    let amenityIds: number[] = []
    try {
      amenityIds = amenityIdsRaw ? JSON.parse(amenityIdsRaw) : []
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid amenity_ids' }, { status: 400 })
    }

    const existing = await prisma.room_types.findFirst({ where: { hotel_id: hotelId, name } })
    if (existing) {
      return NextResponse.json({ success: false, message: `You already have a room type named "${name}".` }, { status: 400 })
    }

    let imageUrl: string | null = null
    if (file && file instanceof Blob && file.size > 0) {
      if (file.size > 1 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Photo must be under 1MB' }, { status: 400 })
      }
      await ensureDir()
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${uuidv4()}.webp`
      const filepath = path.join(UPLOAD_DIR, filename)
      await sharp(buffer).resize(1600, 1000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(filepath)
      imageUrl = `/uploads/room-types/${filename}`
    }

    const clientKey = `rt_${uuidv4()}`

    try {
      await stageFieldChange({
        hotelId, hotelAdminId,
        entityType: 'ROOM_TYPE', entityId: null, fieldName: null,
        previousValue: null,
        proposedValue: { name, description, amenity_ids: amenityIds, client_key: clientKey },
      })
      if (imageUrl) {
        await stageFieldChange({
          hotelId, hotelAdminId,
          entityType: 'ROOM_TYPE_IMAGE', entityId: null, fieldName: null,
          previousValue: null,
          proposedValue: { room_type_id: clientKey, image_url: imageUrl },
        })
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e.message || 'Failed to stage room type' }, { status: 400 })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Room type proposed — saved to your draft', data: { currentCase } })
  } catch (error) {
    console.error('Propose room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}