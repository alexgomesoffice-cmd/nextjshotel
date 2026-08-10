import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomSchema } from '@/lib/validations/room'
import { findOrCreateVariant } from '@/lib/room-variant-matching'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'
import { emitToRoom } from '@/lib/socket-emit'

type Params = { params: Promise<{ id: string }> }

// Fields that define a variant — if the PATCH body touches any of these,
// the room's signature is recalculated and it may move to a different
// (matched or newly created) variant. Everything else is physical-only.
const VARIANT_DEFINING_KEYS = ['price', 'room_size', 'max_occupancy', 'facility_ids', 'bed_types'] as const

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { id } = await params
    const roomId = parseInt(id)
    if (isNaN(roomId)) return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: {
        room_variant: {
          include: {
            room_type: true,
            facilities: { include: { facility: true } },
            bed_types: { include: { bed_type: true } },
            variant_images: { orderBy: { sort_order: 'asc' } },
          },
        },
      },
    })

    if (!room || room.room_variant.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: room })
  } catch (error) {
    console.error('Failed to fetch room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/hotel-admin/rooms/[id]
 * Direct edit — live immediately, no case review. If any variant-defining
 * field is present in the body, recalculates the signature and moves the
 * room to whichever variant matches (existing or newly created); otherwise
 * only the physical-room fields (room_number/floor/notes) are touched.
 * Room status is intentionally NOT accepted here — see the /status route.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const roomId = parseInt(id)
    if (isNaN(roomId)) return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })

    const body = await req.json()
    const result = updateRoomSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const data = result.data

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: {
        room_variant: {
          include: { facilities: true, bed_types: true, room_type: true },
        },
      },
    })
    if (!room || room.room_variant.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    const touchesVariant = VARIANT_DEFINING_KEYS.some((k) => data[k] !== undefined)

    if (data.room_number && data.room_number !== room.room_number) {
      const collision = await prisma.room_details.findFirst({
        where: {
          room_variant: { room_type: { hotel_id: hotelId } },
          room_number: data.room_number,
          deleted_at: null,
          id: { not: roomId },
        },
      })
      if (collision) return NextResponse.json({ success: false, message: 'Room number already in use' }, { status: 400 })
    }

    let newVariantId: number | null = null
    let matchedExisting = false

    if (touchesVariant) {
      const currentVariant = room.room_variant
      const config = {
        room_type_id: currentVariant.room_type_id,
        price: data.price !== undefined ? data.price : Number(currentVariant.price),
        room_size: data.room_size !== undefined ? data.room_size : currentVariant.room_size,
        max_occupancy: data.max_occupancy !== undefined ? data.max_occupancy : currentVariant.max_occupancy,
        facility_ids: data.facility_ids !== undefined ? data.facility_ids : currentVariant.facilities.map((f) => f.facility_id),
        bed_types: data.bed_types !== undefined ? data.bed_types : currentVariant.bed_types.map((b) => ({ bed_type_id: b.bed_type_id, count: b.count })),
      }

      const txResult = await prisma.$transaction(async (tx) => {
        const { variant, isNewlyCreated } = await findOrCreateVariant(tx, config)
        await tx.room_details.update({
          where: { id: roomId },
          data: {
            room_variant_id: variant.id,
            ...(data.room_number !== undefined && { room_number: data.room_number }),
            ...(data.floor !== undefined && { floor: data.floor }),
            ...(data.notes !== undefined && { notes: data.notes }),
          },
        })
        return { variant, isNewlyCreated }
      })
      newVariantId = txResult.variant.id
      matchedExisting = !txResult.isNewlyCreated
    } else {
      await prisma.room_details.update({
        where: { id: roomId },
        data: {
          ...(data.room_number !== undefined && { room_number: data.room_number }),
          ...(data.floor !== undefined && { floor: data.floor }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      })
    }

    const updatedRoom = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_variant: { include: { room_type: true, facilities: { include: { facility: true } }, bed_types: { include: { bed_type: true } } } } },
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: touchesVariant ? 'room.variant_changed' : 'room.updated',
      entityType: 'room_details', entityId: roomId,
      metadata: touchesVariant
        ? { from_variant_id: room.room_variant_id, to_variant_id: newVariantId, matched_existing_variant: matchedExisting }
        : { changed: Object.keys(data) },
    })

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({ success: true, message: 'Room updated', data: updatedRoom })
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/hotel-admin/rooms/[id]
 * Soft delete a physical room. Its variant is left in place even if this
 * was the last room in it (see Artifact 7 — no auto-delete of empty
 * variants; pricing_rules/booking history may still reference it).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const roomId = parseInt(id)
    if (isNaN(roomId)) return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_variant: { include: { room_type: true } } },
    })
    if (!room || room.room_variant.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    await prisma.room_details.update({ where: { id: roomId }, data: { deleted_at: new Date() } })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'room.deleted', entityType: 'room_details', entityId: roomId,
    })

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}