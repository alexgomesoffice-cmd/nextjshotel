import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomStatusSchema } from '@/lib/validations/room'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'
import { emitToRoom } from '@/lib/socket-emit'

/**
 * PATCH /api/hotel-admin/rooms/[id]/status
 * Operational state only — available/booked/checked-in/checked-out/
 * maintenance. Immediate, no case review, and deliberately kept separate
 * from the main room PATCH so status changes can never accidentally
 * trigger variant re-matching. Sub-Admin can update status (booking/
 * housekeeping duties) even though they can't create/edit rooms.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const actorId = auth.payload.actor_id
    const actorType = auth.payload.actor_type as 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN'
    const { id } = await params
    const roomId = parseInt(id)
    if (isNaN(roomId)) return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })

    const body = await req.json()
    const result = updateRoomStatusSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_variant: { include: { room_type: true } } },
    })
    if (!room || room.room_variant.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    const updated = await prisma.room_details.update({
      where: { id: roomId },
      data: { status: result.data.status },
    })

    await logHotelAdminActivity({
      hotelId, actorId, actorType,
      action: 'room.status_changed', entityType: 'room_details', entityId: roomId,
      metadata: { from: room.status, to: result.data.status },
    })

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({ success: true, message: 'Status updated', data: updated })
  } catch (error) {
    console.error('Failed to update room status:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}