import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/system-admin/overview
 * Returns platform-wide stats for the system admin dashboard landing page.
 *
 * Response shape:
 * {
 *   hotels:    { total, published, draft, suspended }
 *   users:     { total, active, blocked }
 *   bookings:  { total, reserved, booked, cancelled }
 *   cities:    { total, active }
 *   admins:    { total }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const [
      hotelsTotal,
      hotelsPublished,
      hotelsDraft,
      hotelsSuspended,
      usersTotal,
      usersBlocked,
      bookingsTotal,
      bookingsReserved,
      bookingsBooked,
      bookingsCancelled,
      citiesTotal,
      citiesActive,
      adminsTotal,
    ] = await Promise.all([
      // Hotels
      prisma.hotels.count({ where: { deleted_at: null } }),
      prisma.hotels.count({ where: { deleted_at: null, approval_status: 'PUBLISHED' } }),
      prisma.hotels.count({ where: { deleted_at: null, approval_status: 'DRAFT' } }),
      prisma.hotels.count({ where: { deleted_at: null, approval_status: 'SUSPENDED' } }),

      // End users
      prisma.end_users.count({ where: { deleted_at: null } }),
      prisma.end_users.count({ where: { deleted_at: null, is_blocked: true } }),

      // Bookings
      prisma.user_bookings.count(),
      prisma.user_bookings.count({ where: { status: 'RESERVED' } }),
      prisma.user_bookings.count({ where: { status: 'BOOKED' } }),
      prisma.user_bookings.count({ where: { status: 'CANCELLED' } }),

      // Cities
      prisma.cities.count(),
      prisma.cities.count({ where: { is_active: true } }),

      // System admins (excluding soft-deleted)
      prisma.system_admins.count({ where: { deleted_at: null } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        hotels: {
          total: hotelsTotal,
          published: hotelsPublished,
          draft: hotelsDraft,
          suspended: hotelsSuspended,
        },
        users: {
          total: usersTotal,
          active: usersTotal - usersBlocked,
          blocked: usersBlocked,
        },
        bookings: {
          total: bookingsTotal,
          reserved: bookingsReserved,
          booked: bookingsBooked,
          cancelled: bookingsCancelled,
        },
        cities: {
          total: citiesTotal,
          active: citiesActive,
        },
        admins: {
          total: adminsTotal,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch overview stats:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
