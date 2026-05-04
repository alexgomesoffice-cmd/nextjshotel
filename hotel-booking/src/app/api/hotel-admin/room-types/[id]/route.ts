import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().nullable().optional(),
  base_price: z.number().min(0).optional(),
  room_size: z.string().max(50).nullable().optional(),
  max_occupancy: z.number().min(1).optional(),
  cancellation_policy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM']).optional(),
  cancellation_hours: z.number().nullable().optional(),
  refund_percent: z.number().nullable().optional(),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  bed_types: z.array(z.object({
    bed_type_id: z.number(),
    count: z.number().min(1)
  })).optional(),
  amenity_ids: z.array(z.number()).optional()
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)

    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({
      where: { id: roomTypeId },
      include: {
        room_bed_types: { include: { bed_type: true } },
        room_properties: { include: { amenity: true } },
        type_images: { orderBy: { sort_order: 'asc' } },
        _count: { select: { room_details: { where: { deleted_at: null } } } }
      }
    })

    if (!roomType || roomType.hotel_id !== hotelId || !roomType.is_active) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const { _count, ...rest } = roomType
    return NextResponse.json({ success: true, data: { ...rest, room_count: _count.room_details } })
  } catch (error) {
    console.error('Fetch room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)

    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!roomType || roomType.hotel_id !== hotelId || !roomType.is_active) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const data = result.data

    await prisma.$transaction(async (tx) => {
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.base_price !== undefined) updateData.base_price = data.base_price
      if (data.room_size !== undefined) updateData.room_size = data.room_size
      if (data.max_occupancy !== undefined) updateData.max_occupancy = data.max_occupancy
      if (data.cancellation_policy !== undefined) updateData.cancellation_policy = data.cancellation_policy
      if (data.cancellation_hours !== undefined) updateData.cancellation_hours = data.cancellation_hours
      if (data.refund_percent !== undefined) updateData.refund_percent = data.refund_percent
      if (data.check_in_time !== undefined) updateData.check_in_time = data.check_in_time
      if (data.check_out_time !== undefined) updateData.check_out_time = data.check_out_time

      if (Object.keys(updateData).length > 0) {
        await tx.room_types.update({
          where: { id: roomTypeId },
          data: updateData
        })
      }

      if (data.bed_types !== undefined) {
        await tx.room_bed_types.deleteMany({ where: { room_type_id: roomTypeId } })
        if (data.bed_types.length > 0) {
          await tx.room_bed_types.createMany({
            data: data.bed_types.map(bt => ({
              room_type_id: roomTypeId,
              bed_type_id: bt.bed_type_id,
              count: bt.count
            }))
          })
        }
      }

      if (data.amenity_ids !== undefined) {
        await tx.room_properties.deleteMany({ where: { room_type_id: roomTypeId } })
        if (data.amenity_ids.length > 0) {
          await tx.room_properties.createMany({
            data: data.amenity_ids.map(id => ({
              room_type_id: roomTypeId,
              amenity_id: id
            }))
          })
        }
      }
    })

    return NextResponse.json({ success: true, message: 'Room type updated successfully' })
  } catch (error) {
    console.error('Update room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)

    if (isNaN(roomTypeId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomType = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    // Soft delete
    await prisma.room_types.update({
      where: { id: roomTypeId },
      data: { is_active: false }
    })

    return NextResponse.json({ success: true, message: 'Room type deleted' })
  } catch (error) {
    console.error('Delete room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
