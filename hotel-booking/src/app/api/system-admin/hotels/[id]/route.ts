import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateHotelSchema } from '@/lib/validations/hotel'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)

    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      include: {
        detail: true,
        city: true,
        hotel_type: true,
        hotel_admin: {
          select: { name: true, email: true, is_active: true, is_blocked: true },
        },
        images: {
          orderBy: { sort_order: 'asc' },
        },
      },
    })

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: hotel })
  } catch (error) {
    console.error('Failed to fetch hotel:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)

    const body = await req.json()
    const result = updateHotelSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const hotelExists = await prisma.hotels.findUnique({ where: { id: hotelId, deleted_at: null } })
    if (!hotelExists) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    const {
      description,
      short_description,
      check_in_time,
      check_out_time,
      advance_deposit_percent,
      cancellation_policy,
      cancellation_hours,
      refund_percent,
      ...hotelData
    } = result.data

    const updatedHotel = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotels.update({
        where: { id: hotelId },
        data: hotelData,
      })

      // Update details if any detail fields are provided
      if (
        description !== undefined ||
        short_description !== undefined ||
        check_in_time !== undefined ||
        check_out_time !== undefined ||
        advance_deposit_percent !== undefined ||
        cancellation_policy !== undefined ||
        cancellation_hours !== undefined ||
        refund_percent !== undefined
      ) {
        await tx.hotel_details.update({
          where: { hotel_id: hotelId },
          data: {
            description,
            short_description,
            check_in_time,
            check_out_time,
            advance_deposit_percent,
            cancellation_policy,
            cancellation_hours,
            refund_percent,
          },
        })
      }

      return hotel
    })

    return NextResponse.json({ success: true, message: 'Hotel updated', data: updatedHotel })
  } catch (error) {
    console.error('Failed to update hotel:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)

    const hotelExists = await prisma.hotels.findUnique({ where: { id: hotelId, deleted_at: null } })
    if (!hotelExists) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    const now = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.hotels.update({
        where: { id: hotelId },
        data: { deleted_at: now },
      })
      await tx.hotel_admins.updateMany({
        where: { hotel_id: hotelId },
        data: { deleted_at: now, is_active: false },
      })
      await tx.hotel_sub_admins.updateMany({
        where: { hotel_id: hotelId },
        data: { deleted_at: now, is_active: false },
      })
    })

    return NextResponse.json({ success: true, message: 'Hotel deleted successfully' })
  } catch (error) {
    console.error('Failed to delete hotel:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
