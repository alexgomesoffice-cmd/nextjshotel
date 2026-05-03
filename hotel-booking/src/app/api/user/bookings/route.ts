import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { BookingStatus, Prisma } from '@prisma/client'

/**
 * GET /api/user/bookings
 * requireAuth(['END_USER'])
 * Returns: all user_bookings for this end user, paginated.
 * Includes: hotel name + city, room bookings with room type name, status, price.
 * Query params: page?, limit?, status?
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['END_USER'])
    if (auth.error) return auth.error

    const userId = auth.payload.actor_id
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'))
    const statusFilter = searchParams.get('status')
    const skip = (page - 1) * limit

    const where: Prisma.user_bookingsWhereInput = { end_user_id: userId }

    if (statusFilter && Object.values(BookingStatus).includes(statusFilter as BookingStatus)) {
      where.status = statusFilter as BookingStatus
    }

    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          booking_reference: true,
          status: true,
          check_in: true,
          check_out: true,
          total_price: true,
          advance_amount: true,
          guests: true,
          reserved_until: true,
          created_at: true,
          hotel: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: { select: { name: true } },
              images: {
                where: { is_cover: true },
                take: 1,
                select: { image_url: true },
              },
            },
          },
          room_bookings: {
            select: {
              id: true,
              price_per_night: true,
              nights: true,
              subtotal: true,
              room_type: {
                select: { id: true, name: true },
              },
              room_detail: {
                select: {
                  id: true,
                  room_number: true,
                  floor: true,
                  ac: true,
                },
              },
            },
          },
        },
      }),
      prisma.user_bookings.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch user bookings:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
