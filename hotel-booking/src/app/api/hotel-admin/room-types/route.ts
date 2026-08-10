import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createRoomTypeSchema } from '@/lib/validations/room-type'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'

/**
 * GET /api/hotel-admin/room-types
 * Lists this hotel's room types, each with its variants and room counts
 * nested — this is the tree the UI renders (Room Type -> Variant -> Rooms).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const roomTypes = await prisma.room_types.findMany({
      where: { hotel_id: hotelId, is_active: true },
      include: {
        room_type_amenities: { include: { amenity: true } },
        type_images: { orderBy: { sort_order: 'asc' } },
        room_variants: {
          where: { is_active: true },
          include: {
            facilities: { include: { facility: true } },
            bed_types: { include: { bed_type: true } },
            variant_images: { orderBy: { sort_order: 'asc' } },
            room_details: { where: { deleted_at: null }, orderBy: { room_number: 'asc' } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, data: roomTypes })
  } catch (error) {
    console.error('Fetch room types error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/room-types
 * Direct create — live immediately, no case review.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const body = await req.json()
    const result = createRoomTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const { name, description, amenity_ids } = result.data

    const existing = await prisma.room_types.findFirst({ where: { hotel_id: hotelId, name } })
    if (existing) {
      return NextResponse.json({ success: false, message: `A room type named "${name}" already exists.` }, { status: 400 })
    }

    const roomType = await prisma.room_types.create({
      data: {
        hotel_id: hotelId,
        name,
        description: description ?? null,
        room_type_amenities: amenity_ids.length > 0
          ? { create: amenity_ids.map((amenity_id) => ({ amenity_id })) }
          : undefined,
      },
      include: { room_type_amenities: { include: { amenity: true } } },
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'room_type.created', entityType: 'room_types', entityId: roomType.id,
      metadata: { name },
    })

    return NextResponse.json({ success: true, message: 'Room type created', data: roomType }, { status: 201 })
  } catch (error) {
    console.error('Create room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}