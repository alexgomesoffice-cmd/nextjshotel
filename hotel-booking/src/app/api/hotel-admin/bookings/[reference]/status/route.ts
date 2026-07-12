import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { emitToRoom } from '@/lib/socket-emit'

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
    if (!(ALLOWED_FROM[action] as readonly string[]).includes(booking.status)) {
      return NextResponse.json({
        success: false,
        message: `Cannot ${action.replace('_', ' ')} from ${booking.status.toLowerCase().replace('_', ' ')} status`
      }, { status: 400 })
    }

    const newStatus = ACTION_TO_STATUS[action]

    // For terminal actions, DELETE tracker rows so the room dates are freed
    // and can be re-reserved. History is preserved in user_bookings/room_bookings.
    // For check_in, update the tracker status only.
    const isTerminal = action === 'cancel' || action === 'no_show' || action === 'check_out'

    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: newStatus as any },
      }),
      isTerminal
        ? prisma.room_trackers.deleteMany({ where: { booking_id: booking.id } })
        : prisma.room_trackers.updateMany({
            where: { booking_id: booking.id },
            data: { status: newStatus as any },
          }),
    ])

    // ── Live updates ─────────────────────────────────────────────────────────
    void emitToRoom(`booking:${booking.booking_reference}`, 'booking:status_changed', {
      reference: booking.booking_reference,
      status: newStatus,
    })
    void emitToRoom(`hotel-admin:${booking.hotel_id}`, 'booking:status_changed', {
      reference: booking.booking_reference,
      status: newStatus,
      hotel_id: booking.hotel_id,
    })
    void emitToRoom('hotel-admin:all', 'booking:status_changed', {
      reference: booking.booking_reference,
      status: newStatus,
      hotel_id: booking.hotel_id,
    })

    // Notify end user
    if (booking.end_user_id) {
      void emitToRoom(`user:${booking.end_user_id}`, 'booking:status_changed', {
        reference: booking.booking_reference,
        status: newStatus,
      })
    }

    // Terminal actions free rooms — tell the hotel page to refresh availability
    if (isTerminal) {
      void emitToRoom(`hotel:${booking.hotel_id}:availability`, 'room:availability_changed', {
        hotel_id: booking.hotel_id,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.booking_reference} updated to ${newStatus}`,
    })
  } catch (error) {
    console.error('[hotel-admin] PATCH /bookings/[reference]/status error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}