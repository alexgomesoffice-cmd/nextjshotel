import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

const BOOKING_STATUSES = [
  'RESERVED',
  'BOOKED',
  'EXPIRED',
  'CANCELLED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'NO_SHOW',
] as const

type BookingStatus = (typeof BOOKING_STATUSES)[number]

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'bookings'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15')))
    const search = searchParams.get('search')?.trim() || ''
    const statusParam = searchParams.get('status') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''

    if (view === 'hotels') {
      const hotelWhere: any = { deleted_at: null }

      if (search) {
        hotelWhere.OR = [
          { name: { contains: search } },
          { city: { name: { contains: search } } },
        ]
      }

      const hotels = await prisma.hotels.findMany({
        where: hotelWhere,
        select: {
          id: true,
          name: true,
          approval_status: true,
          city: { select: { name: true } },
          images: {
            where: { is_cover: true },
            select: { image_url: true },
            orderBy: { sort_order: 'asc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      })

      const hotelIds = hotels.map((hotel) => hotel.id)

      const bookingWhere: any = hotelIds.length > 0
        ? { hotel_id: { in: hotelIds } }
        : { hotel_id: -1 }

      if (dateFrom || dateTo) {
        bookingWhere.check_in = {}
        if (dateFrom) bookingWhere.check_in.gte = new Date(dateFrom)
        if (dateTo) bookingWhere.check_in.lte = new Date(dateTo)
      }

      const [statusGroups, totalBookings, totalValue] = await Promise.all([
        prisma.user_bookings.groupBy({
          by: ['hotel_id', 'status'],
          where: bookingWhere,
          _count: { _all: true },
        }),
        prisma.user_bookings.count({ where: bookingWhere }),
        prisma.user_bookings.aggregate({ where: bookingWhere, _sum: { total_price: true } }),
      ])

      const byHotel = new Map<number, Record<string, number>>()
      for (const group of statusGroups) {
        const current = byHotel.get(group.hotel_id) || {}
        current[group.status] = group._count._all
        byHotel.set(group.hotel_id, current)
      }

      const rows = hotels.map((hotel) => {
        const counts = byHotel.get(hotel.id) || {}
        return {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city?.name ?? null,
          approval_status: hotel.approval_status,
          cover_image_url: hotel.images[0]?.image_url ?? null,
          totalBookings: Object.values(counts).reduce((sum, value) => sum + value, 0),
          reserved: counts.RESERVED ?? 0,
          booked: counts.BOOKED ?? 0,
          expired: counts.EXPIRED ?? 0,
          cancelled: counts.CANCELLED ?? 0,
          checkedIn: counts.CHECKED_IN ?? 0,
          checkedOut: counts.CHECKED_OUT ?? 0,
          noShow: counts.NO_SHOW ?? 0,
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          hotels: rows,
          summary: {
            totalBookings,
            reserved: statusGroups.filter((g) => g.status === 'RESERVED').reduce((s, g) => s + g._count._all, 0),
            booked: statusGroups.filter((g) => g.status === 'BOOKED').reduce((s, g) => s + g._count._all, 0),
            expired: statusGroups.filter((g) => g.status === 'EXPIRED').reduce((s, g) => s + g._count._all, 0),
            cancelled: statusGroups.filter((g) => g.status === 'CANCELLED').reduce((s, g) => s + g._count._all, 0),
            bookingValue: Number(totalValue._sum.total_price ?? 0),
          },
        },
      })
    }

    const hotelId = searchParams.get('hotel_id')
    const where: any = {}

    if (hotelId) where.hotel_id = parseInt(hotelId)

    if (search) {
      where.OR = [
        { booking_reference: { contains: search } },
        { end_user: { name: { contains: search } } },
        { end_user: { email: { contains: search } } },
      ]
    }

    if (statusParam && BOOKING_STATUSES.includes(statusParam as BookingStatus)) {
      where.status = statusParam
    }

    if (dateFrom || dateTo) {
      where.check_in = {}
      if (dateFrom) where.check_in.gte = new Date(dateFrom)
      if (dateTo) where.check_in.lte = new Date(dateTo)
    }

    const skip = (page - 1) * limit

    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        include: {
          hotel: { select: { id: true, name: true, slug: true } },
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
    ])

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
        bookings: serialized,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[system-admin] GET /bookings error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
