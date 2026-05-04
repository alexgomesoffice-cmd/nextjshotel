import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().nullable().optional(),
  base_price: z.number().min(0),
  room_size: z.string().max(50).nullable().optional(),
  max_occupancy: z.number().min(1),
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const roomTypes = await prisma.room_types.findMany({
      where: { 
        hotel_id: hotelId,
        is_active: true
      },
      include: {
        room_bed_types: {
          include: { bed_type: true }
        },
        room_properties: {
          include: { amenity: true }
        },
        type_images: {
          orderBy: { sort_order: 'asc' }
        },
        _count: {
          select: { room_details: { where: { deleted_at: null } } }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // To prevent sending Prisma's _count object down, let's format the response slightly
    const formatted = roomTypes.map(rt => {
      const { _count, ...rest } = rt
      return {
        ...rest,
        room_count: _count.room_details
      }
    })

    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    console.error('Fetch room types error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const body = await req.json()
    const result = createSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const data = result.data

    const newRoomType = await prisma.$transaction(async (tx) => {
      // 1. Create room type
      const roomType = await tx.room_types.create({
        data: {
          hotel_id: hotelId,
          name: data.name,
          description: data.description,
          base_price: data.base_price,
          room_size: data.room_size,
          max_occupancy: data.max_occupancy,
          cancellation_policy: data.cancellation_policy || 'FLEXIBLE',
          cancellation_hours: data.cancellation_hours,
          refund_percent: data.refund_percent,
          check_in_time: data.check_in_time,
          check_out_time: data.check_out_time,
        }
      })

      // 2. Attach bed types
      if (data.bed_types && data.bed_types.length > 0) {
        await tx.room_bed_types.createMany({
          data: data.bed_types.map(bt => ({
            room_type_id: roomType.id,
            bed_type_id: bt.bed_type_id,
            count: bt.count
          }))
        })
      }

      // 3. Attach amenities
      if (data.amenity_ids && data.amenity_ids.length > 0) {
        await tx.room_properties.createMany({
          data: data.amenity_ids.map(id => ({
            room_type_id: roomType.id,
            amenity_id: id
          }))
        })
      }

      return roomType
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Room type created successfully',
      data: newRoomType 
    })
  } catch (error) {
    console.error('Create room type error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
