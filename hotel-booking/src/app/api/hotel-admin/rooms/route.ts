import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createRoomSchema, bulkCreateRoomSchema, CreateRoomInput, BulkCreateRoomInput } from '@/lib/validations/room'
import { findOrCreateVariant } from '@/lib/room-variant-matching'
import { parseRoomNumberInput } from '@/lib/room-number-parser'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { RoomStatus } from '@prisma/client'
import { emitToRoom } from '@/lib/socket-emit'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'rooms')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

async function saveImages(files: File[]) {
  if (!files || files.length === 0) return []
  await ensureDir()
  const urls: string[] = []
  for (const file of files) {
    if (!(file instanceof Blob)) continue
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${uuidv4()}.webp`
    const filepath = path.join(UPLOAD_DIR, filename)
    await sharp(buffer).resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(filepath)
    urls.push(`/uploads/rooms/${filename}`)
  }
  return urls
}

/**
 * GET /api/hotel-admin/rooms
 * Flat list of physical rooms, each with its resolved variant nested.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const roomTypeId = searchParams.get('roomTypeId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim() ?? ''

    const rooms = await prisma.room_details.findMany({
      where: {
        room_variant: { room_type: { hotel_id: hotelId, ...(roomTypeId ? { id: parseInt(roomTypeId) } : {}) } },
        deleted_at: null,
        ...(status ? { status: status as RoomStatus } : {}),
        ...(search ? { room_number: { contains: search } } : {}),
      },
      include: {
        room_variant: {
          include: {
            room_type: { select: { id: true, name: true } },
            variant_images: { where: { is_cover: true }, take: 1 },
          },
        },
      },
      orderBy: { room_number: 'asc' },
    })

    return NextResponse.json({ success: true, data: rooms })
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/rooms
 * Direct create (single or bulk via `bulk=true`) — live immediately, no
 * case review. Variant matching happens atomically inside a transaction.
 * Hotel-Admin only — Sub-Admin does not have room-creation authority.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })

    const formData = await req.formData()
    const isBulk = formData.get('bulk') === 'true'
    const files = formData.getAll('files') as File[]

    const rawData: Record<string, any> = {}
    formData.forEach((value, key) => {
      if (key === 'files' || key === 'bulk') return
      if (['room_type_id', 'floor', 'price', 'max_occupancy'].includes(key)) {
        rawData[key] = value === '' ? undefined : Number(value)
      } else if (key === 'facility_ids' || key === 'bed_types') {
        try { rawData[key] = JSON.parse(value.toString()) } catch { rawData[key] = [] }
      } else {
        rawData[key] = value.toString()
      }
    })

    const schema = isBulk ? bulkCreateRoomSchema : createRoomSchema
    const result = schema.safeParse(rawData)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const data = result.data

    const roomType = await prisma.room_types.findUnique({ where: { id: data.room_type_id } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
    }

    let roomNumbers: string[]
    if (isBulk) {
      const parsed = parseRoomNumberInput((data as BulkCreateRoomInput).room_numbers)
      if (parsed.error) return NextResponse.json({ success: false, message: parsed.error }, { status: 400 })
      roomNumbers = parsed.roomNumbers
    } else {
      roomNumbers = [(data as CreateRoomInput).room_number]
    }

    // Room numbers are unique HOTEL-WIDE, not just within this room type —
    // check across every room this hotel owns, via room_variant -> room_type.
    const collisions = await prisma.room_details.findMany({
      where: {
        room_variant: { room_type: { hotel_id: hotelId } },
        room_number: { in: roomNumbers },
        deleted_at: null,
      },
      select: { room_number: true },
    })
    if (collisions.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Room number${collisions.length > 1 ? 's' : ''} already in use: ${collisions.map((c) => c.room_number).join(', ')}`,
      }, { status: 400 })
    }

    const imageUrls = await saveImages(files)

    const { rooms, variant, isNewlyCreated } = await prisma.$transaction(async (tx) => {
      const { variant, isNewlyCreated } = await findOrCreateVariant(tx, {
        room_type_id: data.room_type_id,
        price: data.price,
        room_size: data.room_size ?? null,
        max_occupancy: data.max_occupancy ?? null,
        facility_ids: data.facility_ids ?? [],
        bed_types: data.bed_types ?? [],
      })

      // New images are always appended to the variant's gallery — never
      // replace what's already there if this join an existing variant.
      if (imageUrls.length > 0) {
        const existingCount = await tx.room_images.count({ where: { room_variant_id: variant.id } })
        await tx.room_images.createMany({
          data: imageUrls.map((url, idx) => ({
            room_variant_id: variant.id,
            image_url: url,
            is_cover: existingCount === 0 && idx === 0,
            sort_order: existingCount + idx,
          })),
        })
      }

      await tx.room_details.createMany({
        data: roomNumbers.map((room_number) => ({
          room_variant_id: variant.id,
          room_number,
          floor: data.floor ?? null,
          notes: data.notes ?? null,
        })),
      })

      const rooms = await tx.room_details.findMany({
        where: { room_variant_id: variant.id, room_number: { in: roomNumbers } },
      })

      return { rooms, variant, isNewlyCreated }
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: isBulk ? 'room.bulk_created' : 'room.created',
      entityType: 'room_details', entityId: rooms[0]?.id,
      metadata: { room_numbers: roomNumbers, variant_id: variant.id, matched_existing_variant: !isNewlyCreated },
    })

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({
      success: true,
      message: `${rooms.length} room${rooms.length > 1 ? 's' : ''} created`,
      data: { rooms, variant_id: variant.id, matched_existing_variant: !isNewlyCreated },
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}