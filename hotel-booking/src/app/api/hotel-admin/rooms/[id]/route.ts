import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomSchema } from '@/lib/validations/room'
import { emitToRoom } from '@/lib/socket-emit'

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

    // Handle room number and prefix
    const stripOldPrefix = (roomNumber: string) => {
      const match = roomNumber.match(/^(.*?)(\d.*)$/)
      return match ? match[2] : roomNumber
    }

    let finalRoomNumber = room.room_number
    if (result.data.room_number !== undefined) {
      finalRoomNumber = result.data.prefix !== undefined
        ? (result.data.room_number.startsWith(result.data.prefix)
          ? result.data.room_number
          : `${result.data.prefix}${result.data.room_number}`)
        : result.data.room_number
    } else if (result.data.prefix !== undefined) {
      if (!room.room_number.startsWith(result.data.prefix)) {
        finalRoomNumber = `${result.data.prefix}${stripOldPrefix(room.room_number)}`
      }
    }

    const roomTypeId = result.data.room_type_id !== undefined ? result.data.room_type_id : room.room_type_id

    if (result.data.room_type_id !== undefined && result.data.room_type_id !== room.room_type_id) {
      const newRoomType = await prisma.room_types.findUnique({ where: { id: result.data.room_type_id } })
      if (!newRoomType || newRoomType.hotel_id !== hotelId) {
        return NextResponse.json({ success: false, message: 'Invalid room type' }, { status: 400 })
      }
    }

    // Note: unique constraint is on room_type_id + room_number
    const existing = await prisma.room_details.findFirst({
      where: {
        room_type_id: roomTypeId,
        room_number: finalRoomNumber,
        deleted_at: null,
        id: { not: roomId }
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, message: 'Room with same number already exists for this type' }, { status: 400 })
    }

    const { prefix, ...updateData } = result.data
    void prefix

    const updatedRoom = await prisma.room_details.update({
      where: { id: roomId },
      data: {
        ...updateData,
        room_number: finalRoomNumber,
        price: updateData.price !== undefined ? updateData.price.toString() : undefined
      }
    })

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({ success: true, data: updatedRoom })
  } catch (error) {
    console.error('Failed to update room:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Room number already exists for this room type' }, { status: 400 })
    }
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

    void emitToRoom(`hotel:${hotelId}:availability`, 'room:updated', { hotel_id: hotelId })

    return NextResponse.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
