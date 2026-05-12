import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ reference: string }> }

async function expireBooking(bookingId: number) {
  await prisma.$transaction([
    prisma.user_bookings.update({
      where: { id: bookingId },
      data: { status: 'EXPIRED', reserved_until: null },
    }),
    prisma.room_trackers.updateMany({
      where: { booking_id: bookingId, status: 'RESERVED' },
      data: { status: 'EXPIRED' },
    }),
  ])
}

export async function GET(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, [
    'END_USER',
    'HOTEL_ADMIN',
    'HOTEL_SUB_ADMIN',
    'SYSTEM_ADMIN',
  ])
  if (error) return error

  const { reference } = await params
  const booking = await prisma.user_bookings.findUnique({
    where: { booking_reference: reference },
    include: {
      hotel: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: { select: { name: true } },
          images: { take: 1, orderBy: { sort_order: 'asc' }, select: { image_url: true } },
        },
      },
      room_bookings: {
        include: {
          room_type: { select: { id: true, name: true } },
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

  if (booking.status === 'RESERVED' && booking.reserved_until && new Date(booking.reserved_until) < new Date()) {
    await expireBooking(booking.id)
    booking.status = 'EXPIRED'
    booking.reserved_until = null
  }

  return NextResponse.json({ success: true, data: booking })
}
