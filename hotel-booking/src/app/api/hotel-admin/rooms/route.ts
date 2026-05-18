import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createRoomSchema, bulkCreateRoomSchema } from '@/lib/validations/room'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { RoomStatus } from '@prisma/client'

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
  const urls = []
  for (const file of files) {
    if (!(file instanceof Blob)) continue
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${uuidv4()}.webp`
    const filepath = path.join(UPLOAD_DIR, filename)
    await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath)
    urls.push(`/uploads/rooms/${filename}`)
  }
  return urls
}

/**
 * GET /api/hotel-admin/rooms
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const roomTypeId = searchParams.get('roomTypeId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim() ?? ''
    const page = parseInt(searchParams.get('page') ?? '0')
    const limit = parseInt(searchParams.get('limit') ?? '0')
    const where = {
      room_type: { hotel_id: hotelId },
      deleted_at: null,
      ...(roomTypeId ? { room_type_id: parseInt(roomTypeId) } : {}),
      ...(status ? { status: status as RoomStatus } : {}),
      ...(search ? { room_number: { contains: search, mode: 'insensitive' } } : {}),
    }

    const include = {
      room_type: {
        select: {
          id: true,
          name: true,
          base_price: true,
        },
      },
      room_images: {
        where: { is_cover: true },
        take: 1,
      },
    }

    if (page > 0 && limit > 0) {
      const [rooms, total] = await Promise.all([
        prisma.room_details.findMany({
          where,
          include,
          orderBy: { room_number: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.room_details.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          rooms,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      })
    }

    const rooms = await prisma.room_details.findMany({
      where,
      include,
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
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const formData = await req.formData()
    
    const isBulk = formData.get('bulk') === 'true'
    const files = formData.getAll('files') as File[]
    
    // Convert FormData to object for validation
    const rawData: Record<string, string | number | boolean> = {}
    formData.forEach((value, key) => {
      if (key !== 'files' && key !== 'bulk') {
        // Try to parse numbers and booleans
        if (['room_type_id', 'start_number', 'end_number', 'floor', 'price'].includes(key)) {
          rawData[key] = parseFloat(value.toString())
        } else if (['ac', 'smoking_allowed', 'pet_allowed'].includes(key)) {
          rawData[key] = value.toString() === 'true'
        } else {
          rawData[key] = value.toString()
        }
      }
    })

    if (isBulk) {
      const result = bulkCreateRoomSchema.safeParse(rawData)
      if (!result.success) {
        return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.format() }, { status: 400 })
      }

      const { room_type_id, prefix, start_number, end_number, ...commonData } = result.data

      const roomType = await prisma.room_types.findUnique({ where: { id: room_type_id } })
      if (!roomType || roomType.hotel_id !== hotelId) {
        return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
      }

      const roomsToCreate: Array<{
        room_type_id: number
        room_number: string
        floor: number
        price: number
        status: RoomStatus
        room_size?: string | null
        ac: boolean
        smoking_allowed: boolean
        pet_allowed: boolean
        notes?: string
      }> = []
      for (let i = start_number; i <= end_number; i++) {
        roomsToCreate.push({
          room_type_id,
          room_number: `${prefix || ''}${i}`,
          ...commonData,
          price: commonData.price
        })
      }

      // Check for duplicates in the generated set + existing
      const existing = await prisma.room_details.findMany({
        where: {
          room_type_id,
          room_number: { in: roomsToCreate.map(r => r.room_number) },
          floor: commonData.floor,
          deleted_at: null
        }
      })

      if (existing.length > 0) {
        return NextResponse.json({ 
          success: false, 
          message: `Some rooms already exist on this floor: ${existing.map(r => r.room_number).join(', ')}` 
        }, { status: 400 })
      }

      const imageUrls = await saveImages(files)

      await prisma.$transaction(async (tx) => {
        for (const roomData of roomsToCreate) {
          const room = await tx.room_details.create({ data: roomData })
          if (imageUrls.length > 0) {
            await tx.room_images.createMany({
              data: imageUrls.map((url, idx) => ({
                room_detail_id: room.id,
                image_url: url,
                is_cover: idx === 0,
                sort_order: idx
              }))
            })
          }
        }
      })

      return NextResponse.json({ success: true, message: `${roomsToCreate.length} rooms created successfully` }, { status: 201 })
    }

    // Single creation
    const result = createRoomSchema.safeParse(rawData)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.format() }, { status: 400 })
    }

    const roomType = await prisma.room_types.findUnique({ where: { id: result.data.room_type_id } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
    }

    const { prefix, ...finalData } = result.data
    const fullRoomNumber = `${prefix || ''}${finalData.room_number}`

    const existing = await prisma.room_details.findFirst({
      where: {
        room_type_id: finalData.room_type_id,
        room_number: fullRoomNumber,
        floor: finalData.floor,
        deleted_at: null
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, message: 'Room number already exists on this floor for this type' }, { status: 400 })
    }

    const imageUrls = await saveImages(files)

    const room = await prisma.room_details.create({
      data: {
        ...finalData,
        room_number: fullRoomNumber,
        price: finalData.price,
        room_images: {
          create: imageUrls.map((url, idx) => ({
            image_url: url,
            is_cover: idx === 0,
            sort_order: idx
          }))
        }
      }
    })

    return NextResponse.json({ success: true, data: room }, { status: 201 })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
