import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomTypeSchema } from '@/lib/validations/room-type'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'
import { resolvePriceForDate } from '@/lib/pricing-resolver'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { id } = await params
    const roomTypeId = parseInt(id)
    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({
      where: { id: roomTypeId },
      include: {
        room_type_amenities: { include: { amenity: true } },
        type_images: { orderBy: { sort_order: 'asc' } },
        room_variants: {
          include: {
            facilities: { include: { facility: true } },
            bed_types: { include: { bed_type: true } },
            variant_images: { orderBy: { sort_order: 'asc' } },
            room_details: { where: { deleted_at: null } },
            pricing_rules: { where: { status: 'ACTIVE' } },
          },
        },
      },
    })

    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const today = new Date()
    const data = {
      ...roomType,
      room_variants: roomType.room_variants.map((variant) => ({
        ...variant,
        pricing: resolvePriceForDate(Number(variant.price), variant.pricing_rules, today),
      })),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Fetch room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/hotel-admin/room-types/[id]
 * Direct edit — live immediately, no case review.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const roomTypeId = parseInt(id)
    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const existing = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!existing || existing.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const body = await req.json()
    const result = updateRoomTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const { name, description, amenity_ids, is_active } = result.data

    if (name && name !== existing.name) {
      const dupe = await prisma.room_types.findFirst({ where: { hotel_id: hotelId, name, id: { not: roomTypeId } } })
      if (dupe) return NextResponse.json({ success: false, message: `A room type named "${name}" already exists.` }, { status: 400 })
    }

    const roomType = await prisma.$transaction(async (tx) => {
      if (amenity_ids !== undefined) {
        await tx.room_type_amenities.deleteMany({ where: { room_type_id: roomTypeId } })
        if (amenity_ids.length > 0) {
          await tx.room_type_amenities.createMany({
            data: amenity_ids.map((amenity_id) => ({ room_type_id: roomTypeId, amenity_id })),
          })
        }
      }
      return tx.room_types.update({
        where: { id: roomTypeId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(is_active !== undefined && { is_active }),
        },
        include: { room_type_amenities: { include: { amenity: true } } },
      })
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'room_type.updated', entityType: 'room_types', entityId: roomTypeId,
      metadata: { changed: Object.keys(result.data) },
    })

    return NextResponse.json({ success: true, message: 'Room type updated', data: roomType })
  } catch (error) {
    console.error('Update room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/hotel-admin/room-types/[id]
 * A room type can only be removed before any room variant is created for it.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const roomTypeId = parseInt(id)
    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({
      where: { id: roomTypeId },
      select: { hotel_id: true, name: true, _count: { select: { room_variants: true } } },
    })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }
    if (roomType._count.room_variants > 0) {
      return NextResponse.json({ success: false, message: 'Room types with room variants cannot be deleted.' }, { status: 409 })
    }

    await prisma.room_types.delete({ where: { id: roomTypeId } })
    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'room_type.deleted', entityType: 'room_types', entityId: roomTypeId,
      metadata: { name: roomType.name },
    })

    return NextResponse.json({ success: true, message: 'Room type deleted' })
  } catch (error) {
    console.error('Delete room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}