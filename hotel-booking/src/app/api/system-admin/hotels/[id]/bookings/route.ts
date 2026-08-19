import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

const STATUSES = ['RESERVED', 'BOOKED', 'EXPIRED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'] as const

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = Number(id)
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid hotel id' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')))
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''
    const skip = (page - 1) * limit

    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      select: {
        id: true,
        name: true,
        approval_status: true,
        address: true,
        city: { select: { name: true } },
        images: {
          where: { is_cover: true },
          select: { image_url: true },
          orderBy: { sort_order: 'asc' },
          take: 1,
        },
      },
    })

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    const where: any = { hotel_id: hotelId }

    if (search) {
      where.OR = [
        { booking_reference: { contains: search } },
        { end_user: { name: { contains: search } } },
        { end_user: { email: { contains: search } } },
      ]
    }

    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.check_in = {}
      if (dateFrom) where.check_in.gte = new Date(dateFrom)
      if (dateTo) where.check_in.lte = new Date(dateTo)
    }

    const [bookings, total, statusGroups, totalValue] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        include: {
          end_user: { select: { id: true, name: true, email: true } },
          room_bookings: {
            select: {
              room_type: { select: { name: true } },
              room_detail: { select: { room_number: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.user_bookings.count({ where }),
      prisma.user_bookings.groupBy({ by: ['status'], where: { hotel_id: hotelId }, _count: { _all: true } }),
      prisma.user_bookings.aggregate({ where: { hotel_id: hotelId }, _sum: { total_price: true } }),
    ])

    const counts = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all]))

    const serialized = bookings.map((booking) => ({
      ...booking,
      total_price: Number(booking.total_price),
      check_in: booking.check_in.toISOString(),
      check_out: booking.check_out.toISOString(),
      created_at: booking.created_at.toISOString(),
      reserved_until: booking.reserved_until?.toISOString() ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          ...hotel,
          cover_image_url: hotel.images[0]?.image_url ?? null,
        },
        bookings: serialized,
        summary: {
          total: Object.values(counts).reduce((sum, value) => sum + Number(value), 0),
          reserved: counts.RESERVED ?? 0,
          booked: counts.BOOKED ?? 0,
          expired: counts.EXPIRED ?? 0,
          cancelled: counts.CANCELLED ?? 0,
          checkedIn: counts.CHECKED_IN ?? 0,
          checkedOut: counts.CHECKED_OUT ?? 0,
          noShow: counts.NO_SHOW ?? 0,
          bookingValue: Number(totalValue._sum.total_price ?? 0),
        },
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[system-admin] GET /hotels/[id]/bookings error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
