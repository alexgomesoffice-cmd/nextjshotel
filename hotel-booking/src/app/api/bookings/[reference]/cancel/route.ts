import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { cancelBookingSchema } from '@/lib/validations/booking'

type Params = { params: Promise<{ reference: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, [
    'END_USER',
    'HOTEL_ADMIN',
    'HOTEL_SUB_ADMIN',
    'SYSTEM_ADMIN',
  ])
  if (error) return error

  const { reference } = await params
  const body = await req.json().catch(() => ({}))
  const validation = cancelBookingSchema.safeParse(body)
  if (!validation.success) {
    const message = validation.error.issues?.[0]?.message ?? 'Invalid request body'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }

  try {
    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: {
        id: true,
        status: true,
        end_user_id: true,
        hotel_id: true,
        reserved_until: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    if (payload.actor_type === 'END_USER' && booking.end_user_id !== payload.actor_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    if (
      (payload.actor_type === 'HOTEL_ADMIN' || payload.actor_type === 'HOTEL_SUB_ADMIN') &&
      payload.hotel_id !== booking.hotel_id
    ) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED' || booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT' || booking.status === 'NO_SHOW') {
      return NextResponse.json(
        { success: false, message: `Cannot cancel a booking with status: ${booking.status}` },
        { status: 400 }
      )
    }

    if (booking.status === 'RESERVED' && booking.reserved_until && new Date(booking.reserved_until) < new Date()) {
      await prisma.$transaction([
        prisma.user_bookings.update({ where: { id: booking.id }, data: { status: 'EXPIRED', reserved_until: null } }),
        prisma.room_trackers.updateMany({
          where: { booking_id: booking.id, status: 'RESERVED' },
          data: { status: 'EXPIRED' },
        }),
      ])

      return NextResponse.json(
        { success: false, message: 'Reservation already expired and cannot be cancelled' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', reserved_until: null },
      }),
      prisma.room_trackers.updateMany({
        where: {
          booking_id: booking.id,
          status: { in: ['RESERVED', 'BOOKED'] },
        },
        data: { status: 'CANCELLED' },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Booking cancelled' })
  } catch (error: unknown) {
    console.error('cancel booking error:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel booking'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
