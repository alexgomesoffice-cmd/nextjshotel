import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
    if (error) return error

    const { reference } = await params

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      include: {
        hotel: {
          include: {
            city: true,
            images: true,
          },
        },
        end_user: {
          include: {
            end_user_details: true,
          },
        },
        room_bookings: {
          include: {
            room_type: true,
            room_detail: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    if (payload.actor_type !== 'SYSTEM_ADMIN' && booking.hotel.id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    // Serialize dates and prices
    const serialized = {
      ...booking,
      check_in: booking.check_in.toISOString(),
      check_out: booking.check_out.toISOString(),
      created_at: booking.created_at.toISOString(),
      reserved_until: booking.reserved_until?.toISOString() || null,
      total_price: Number(booking.total_price),
      advance_amount: Number(booking.advance_amount),
      room_bookings: booking.room_bookings.map(rb => ({
        ...rb,
        price_per_night: Number(rb.price_per_night),
        subtotal: Number(rb.subtotal),
      })),
    }

    return NextResponse.json({ success: true, data: serialized })
  } catch (error) {
    console.error('[hotel-admin] GET /bookings/[reference] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}