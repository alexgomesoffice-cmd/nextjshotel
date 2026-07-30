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
        owner_detail: true,
        documents: true,
        images: {
          orderBy: { sort_order: 'asc' },
        },
        cases: {
          where: { status: 'PENDING' },
          include: { field_changes: { select: { id: true } } },
          orderBy: { submitted_at: 'desc' },
          take: 1,
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
      check_in_time,
      check_out_time,
      advance_deposit_percent,
      star_rating,
      website,
      reception_no1,
      reception_no2,
      emergency_contact_name,
      emergency_contact_designation,
      emergency_contact_phone1,
      emergency_contact_phone2,
      emergency_contact_email,
      ...hotelData
    } = result.data

    const detailsData = {
      description,
      check_in_time,
      check_out_time,
      advance_deposit_percent,
      star_rating,
      website,
      reception_no1,
      reception_no2,
      emergency_contact_name,
      emergency_contact_designation,
      emergency_contact_phone1,
      emergency_contact_phone2,
      emergency_contact_email,
    }
    const hasDetailsUpdate = Object.values(detailsData).some((v) => v !== undefined)

    const updatedHotel = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotels.update({
        where: { id: hotelId },
        data: hotelData,
      })

      if (hasDetailsUpdate) {
        await tx.hotel_details.update({
          where: { hotel_id: hotelId },
          data: detailsData,
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