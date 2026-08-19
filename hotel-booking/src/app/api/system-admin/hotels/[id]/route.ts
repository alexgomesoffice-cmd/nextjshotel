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
    const hotelId = Number.parseInt(id, 10)
    if (Number.isNaN(hotelId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      include: {
        detail: true,
        city: { select: { id: true, name: true } },
        hotel_type: { select: { id: true, name: true } },
        hotel_admin: {
          select: {
            id: true, name: true, email: true, is_active: true, is_blocked: true,
            detail: { select: { phone: true, address: true, manager_name: true, manager_phone: true, emergency_contact1: true, emergency_contact2: true } },
          },
        },
        owner_detail: {
          include: { images: { where: { is_active: true }, orderBy: { created_at: 'desc' } } },
        },
        documents: { orderBy: { created_at: 'desc' } },
        images: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }, { created_at: 'asc' }] },
        hotel_amenities: {
          include: { amenity: true },
          orderBy: { amenity: { name: 'asc' } },
        },
        policies: { where: { deleted_at: null }, orderBy: [{ is_active: 'desc' }, { name: 'asc' }] },
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

    const [roomTypes, bookingAggregate, bookingStatusRows] = await Promise.all([
      prisma.room_types.findMany({
        where: { hotel_id: hotelId },
        select: {
          id: true,
          room_variants: {
            select: {
              id: true,
              price: true,
              _count: { select: { room_details: { where: { deleted_at: null } } } },
            },
          },
        },
      }),
      prisma.user_bookings.aggregate({ where: { hotel_id: hotelId }, _count: { id: true }, _sum: { total_price: true } }),
      prisma.user_bookings.groupBy({ by: ['status'], where: { hotel_id: hotelId }, _count: { id: true } }),
    ])

    const variantCount = roomTypes.reduce((sum, type) => sum + type.room_variants.length, 0)
    const roomCount = roomTypes.reduce((sum, type) => sum + type.room_variants.reduce((variantSum, variant) => variantSum + variant._count.room_details, 0), 0)
    const bookingsByStatus = Object.fromEntries(bookingStatusRows.map((row) => [row.status, row._count.id]))

    return NextResponse.json({
      success: true,
      data: {
        ...hotel,
        stats: {
          room_type_count: roomTypes.length,
          variant_count: variantCount,
          room_count: roomCount,
          amenity_count: hotel.hotel_amenities.length,
          gallery_count: hotel.images.length,
          document_count: hotel.documents.length,
          policy_count: hotel.policies.length,
          booking_count: bookingAggregate._count.id,
          booking_value_total: bookingAggregate._sum.total_price ? Number(bookingAggregate._sum.total_price) : 0,
          bookings_by_status: bookingsByStatus,
        },
      },
    })
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