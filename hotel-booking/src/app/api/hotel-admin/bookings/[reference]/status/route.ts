import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

const ACTION_TO_STATUS = {
  check_in: 'CHECKED_IN',
  check_out: 'CHECKED_OUT',
  cancel: 'CANCELLED',
  no_show: 'NO_SHOW',
} as const

const ALLOWED_FROM = {
  check_in: ['BOOKED'],
  check_out: ['CHECKED_IN'],
  cancel: ['RESERVED', 'BOOKED', 'CHECKED_IN'],
  no_show: ['CHECKED_IN'],
} as const

const schema = z.object({
  action: z.enum(['check_in', 'check_out', 'cancel', 'no_show']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
    if (error) return error

    const { reference } = await params
    const body = await req.json()
    const { action } = schema.parse(body)

    // Get booking with hotel verification
    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      include: {
        hotel: true,
        room_bookings: {
          include: {
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

    // Validate status transition
    if (!ALLOWED_FROM[action].includes(booking.status as any)) {
      return NextResponse.json({
        success: false,
        message: `Cannot ${action.replace('_', ' ')} from ${booking.status.toLowerCase().replace('_', ' ')} status`
      }, { status: 400 })
    }

    const newStatus = ACTION_TO_STATUS[action]

    // Update booking and room trackers in transaction
    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: newStatus as any },
      }),
      prisma.room_trackers.updateMany({
        where: { booking_id: booking.id },
        data: { status: newStatus as any },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.booking_reference} updated to ${newStatus}`,
    })
  } catch (error) {
    console.error('[hotel-admin] PATCH /bookings/[reference]/status error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}