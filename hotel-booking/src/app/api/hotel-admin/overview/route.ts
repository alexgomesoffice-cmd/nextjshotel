import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/hotel-admin/overview
 * Returns hotel-specific stats for the hotel admin dashboard landing page.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    // Fetch stats in parallel
    const [
      roomTypesCount,
      roomsTotal,
      roomsAvailable,
      roomsOccupied,
      roomsMaintenance,
      bookingsTotal,
      bookingsReserved,
      bookingsBooked,
      bookingsCancelled,
      bookingsCheckedIn,
      bookingsCheckedOut,
      totalRevenueData,
      recentBookings
    ] = await Promise.all([
      // Room Types
      prisma.room_types.count({ where: { hotel_id: hotelId, is_active: true } }),
      
      // Physical Rooms
      prisma.room_details.count({ where: { room_type: { hotel_id: hotelId }, deleted_at: null } }),
      prisma.room_details.count({ where: { room_type: { hotel_id: hotelId }, deleted_at: null, status: 'AVAILABLE' } }),
      prisma.room_details.count({ where: { room_type: { hotel_id: hotelId }, deleted_at: null, status: 'UNAVAILABLE' } }),
      prisma.room_details.count({ where: { room_type: { hotel_id: hotelId }, deleted_at: null, status: 'MAINTENANCE' } }),

      // Bookings
      prisma.user_bookings.count({ where: { hotel_id: hotelId } }),
      prisma.user_bookings.count({ where: { hotel_id: hotelId, status: 'RESERVED' } }),
      prisma.user_bookings.count({ where: { hotel_id: hotelId, status: 'BOOKED' } }),
      prisma.user_bookings.count({ where: { hotel_id: hotelId, status: 'CANCELLED' } }),
      prisma.user_bookings.count({ where: { hotel_id: hotelId, status: 'CHECKED_IN' } }),
      prisma.user_bookings.count({ where: { hotel_id: hotelId, status: 'CHECKED_OUT' } }),

      // Revenue (Total of paid/booked bookings)
      prisma.user_bookings.aggregate({
        where: { hotel_id: hotelId, status: { in: ['BOOKED', 'CHECKED_IN', 'CHECKED_OUT'] } },
        _sum: { total_price: true }
      }),

      // Recent activity
      prisma.user_bookings.findMany({
        where: { hotel_id: hotelId },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          end_user: { select: { name: true } }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        roomTypes: roomTypesCount,
        rooms: {
          total: roomsTotal,
          available: roomsAvailable,
          occupied: roomsOccupied,
          maintenance: roomsMaintenance
        },
        bookings: {
          total: bookingsTotal,
          reserved: bookingsReserved,
          booked: bookingsBooked,
          cancelled: bookingsCancelled,
          checkedIn: bookingsCheckedIn,
          checkedOut: bookingsCheckedOut
        },
        revenue: {
          total: Number(totalRevenueData._sum.total_price || 0)
        },
        recentActivity: recentBookings.map(b => ({
          id: b.id,
          reference: b.booking_reference,
          user: b.end_user.name,
          amount: Number(b.total_price),
          status: b.status,
          date: b.created_at
        }))
      }
    })
  } catch (error) {
    console.error('Failed to fetch hotel overview stats:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
