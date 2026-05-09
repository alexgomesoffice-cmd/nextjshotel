import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomSchema } from '@/lib/validations/room'

/**
 * PATCH /api/hotel-admin/rooms/[id]
 * Update a specific room.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const roomId = parseInt(resolvedParams.id)

    if (isNaN(roomId)) {
      return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })
    }

    const body = await req.json()
    const result = updateRoomSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.format() },
        { status: 400 }
      )
    }

    // Check if room exists and belongs to this hotel
    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_type: true }
    })

    if (!room || room.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    // If changing room number, check for duplicates
    if (result.data.room_number && result.data.room_number !== room.room_number) {
      const existing = await prisma.room_details.findFirst({
        where: {
          room_type_id: room.room_type_id,
          room_number: result.data.room_number,
          deleted_at: null,
          id: { not: roomId }
        }
      })

      if (existing) {
        return NextResponse.json({ success: false, message: 'Room number already exists' }, { status: 400 })
      }
    }

    const updatedRoom = await prisma.room_details.update({
      where: { id: roomId },
      data: {
        ...result.data,
        price: result.data.price ? result.data.price.toString() : undefined
      }
    })

    return NextResponse.json({ success: true, data: updatedRoom })
  } catch (error) {
    console.error('Failed to update room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/hotel-admin/rooms/[id]
 * Soft delete a room.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const roomId = parseInt(resolvedParams.id)

    if (isNaN(roomId)) {
      return NextResponse.json({ success: false, message: 'Invalid room ID' }, { status: 400 })
    }

    // Check if room exists and belongs to this hotel
    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_type: true }
    })

    if (!room || room.room_type.hotel_id !== hotelId || room.deleted_at) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    await prisma.room_details.update({
      where: { id: roomId },
      data: { deleted_at: new Date() }
    })

    return NextResponse.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
