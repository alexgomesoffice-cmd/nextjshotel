import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createRoomSchema, bulkCreateRoomSchema } from '@/lib/validations/room'

/**
 * GET /api/hotel-admin/rooms
 * List all rooms for the hotel.
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

    const rooms = await prisma.room_details.findMany({
      where: {
        room_type: {
          hotel_id: hotelId
        },
        deleted_at: null,
        ...(roomTypeId ? { room_type_id: parseInt(roomTypeId) } : {}),
        ...(status ? { status: status as any } : {})
      },
      include: {
        room_type: {
          select: {
            id: true,
            name: true,
            base_price: true
          }
        }
      },
      orderBy: {
        room_number: 'asc'
      }
    })

    return NextResponse.json({ success: true, data: rooms })
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/rooms
 * Create a new physical room (single or bulk).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const body = await req.json()
    
    // Check if it's bulk
    if (body.bulk) {
      const result = bulkCreateRoomSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: result.error.format() },
          { status: 400 }
        )
      }

      const { room_type_id, prefix, start_number, end_number, ...commonData } = result.data

      // Verify room type
      const roomType = await prisma.room_types.findUnique({
        where: { id: room_type_id }
      })

      if (!roomType || roomType.hotel_id !== hotelId) {
        return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
      }

      // Generate rooms
      const roomsToCreate = []
      for (let i = start_number; i <= end_number; i++) {
        roomsToCreate.push({
          room_type_id,
          room_number: `${prefix}${i}`,
          ...commonData,
          price: commonData.price.toString()
        })
      }

      // Check for duplicates in the generated set
      const generatedNumbers = roomsToCreate.map(r => r.room_number)
      const existing = await prisma.room_details.findMany({
        where: {
          room_type_id,
          room_number: { in: generatedNumbers },
          deleted_at: null
        }
      })

      if (existing.length > 0) {
        return NextResponse.json({ 
          success: false, 
          message: `Some rooms already exist: ${existing.map(r => r.room_number).join(', ')}` 
        }, { status: 400 })
      }

      await prisma.room_details.createMany({
        data: roomsToCreate
      })

      return NextResponse.json({ success: true, message: `${roomsToCreate.length} rooms created successfully` }, { status: 201 })
    }

    // Single creation
    const result = createRoomSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.format() },
        { status: 400 }
      )
    }

    // Verify room type
    const roomType = await prisma.room_types.findUnique({
      where: { id: result.data.room_type_id }
    })

    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
    }

    // Check if room number already exists
    const existing = await prisma.room_details.findFirst({
      where: {
        room_type_id: result.data.room_type_id,
        room_number: result.data.room_number,
        deleted_at: null
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, message: 'Room number already exists for this type' }, { status: 400 })
    }

    const room = await prisma.room_details.create({
      data: {
        ...result.data,
        price: result.data.price.toString()
      }
    })

    return NextResponse.json({ success: true, data: room }, { status: 201 })
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
