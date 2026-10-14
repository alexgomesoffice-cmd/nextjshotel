import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { cancelBookingSchema } from '@/lib/validations/booking'
import { emitToRoom } from '@/lib/socket-emit'

type Params = { params: Promise<{ reference: string }> }

type CancellationResult =
  | { status: 'NOT_FOUND' }
  | { status: 'FORBIDDEN' }
  | { status: 'EXPIRED' }
  | { status: 'CANNOT_CANCEL'; bookingStatus: string }
  | { status: 'CONFLICT' }
  | { status: 'CANCELLED'; bookingId: number; hotelId: number; endUserId: number }

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['END_USER'])
  if (error) return error

  const { reference } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const validation = cancelBookingSchema.safeParse(body)
  if (!validation.success) {
    const message = validation.error.issues?.[0]?.message ?? 'Invalid request body'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }

  try {
    const result: CancellationResult = await prisma.$transaction(async (tx) => {
      const booking = await tx.user_bookings.findUnique({
        where: { booking_reference: reference },
        select: {
          id: true,
          status: true,
          end_user_id: true,
          hotel_id: true,
          reserved_until: true,
          room_bookings: { select: { room_detail_id: true } },
        },
      })

      if (!booking) return { status: 'NOT_FOUND' }
      if (booking.end_user_id !== payload.actor_id) return { status: 'FORBIDDEN' }

      if (booking.status === 'RESERVED' && booking.reserved_until && booking.reserved_until <= new Date()) {
        const expired = await tx.user_bookings.updateMany({
          where: { id: booking.id, status: 'RESERVED' },
          data: { status: 'EXPIRED', reserved_until: null },
        })
        if (expired.count !== 1) return { status: 'CONFLICT' }

        await tx.room_trackers.deleteMany({
          where: { booking_id: booking.id, status: 'RESERVED' },
        })
        return { status: 'EXPIRED' }
      }

      if (booking.status !== 'RESERVED' && booking.status !== 'BOOKED') {
        return { status: 'CANNOT_CANCEL', bookingStatus: booking.status }
      }

      const cancelled = await tx.user_bookings.updateMany({
        where: { id: booking.id, status: booking.status },
        data: { status: 'CANCELLED', reserved_until: null },
      })
      if (cancelled.count !== 1) return { status: 'CONFLICT' }

      await tx.room_trackers.deleteMany({ where: { booking_id: booking.id } })

      const roomDetailIds = booking.room_bookings.map((roomBooking) => roomBooking.room_detail_id)
      if (roomDetailIds.length > 0) {
        await tx.room_details.updateMany({
          where: { id: { in: roomDetailIds }, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        })
      }

      return {
        status: 'CANCELLED',
        bookingId: booking.id,
        hotelId: booking.hotel_id,
        endUserId: booking.end_user_id,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.status === 'NOT_FOUND') {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }
    if (result.status === 'FORBIDDEN') {
      return NextResponse.json({ success: false, message: 'You can only cancel your own bookings' }, { status: 403 })
    }
    if (result.status === 'CANNOT_CANCEL') {
      return NextResponse.json(
        { success: false, message: `Cannot cancel a booking with status: ${result.bookingStatus}` },
        { status: 400 },
      )
    }
    if (result.status === 'CONFLICT') {
      return NextResponse.json({ success: false, message: 'Booking status changed. Refresh and try again.' }, { status: 409 })
    }

    const status = result.status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED'
    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { hotel_id: true, end_user_id: true },
    })
    const hotelId = result.status === 'CANCELLED' ? result.hotelId : booking?.hotel_id
    const endUserId = result.status === 'CANCELLED' ? result.endUserId : booking?.end_user_id

    if (hotelId !== undefined) {
      void emitToRoom(`hotel-admin:${hotelId}`, 'booking:status_changed', { reference, status, hotel_id: hotelId })
      void emitToRoom(`hotel:${hotelId}:availability`, 'room:availability_changed', { hotel_id: hotelId })
    }
    if (endUserId !== undefined) {
      void emitToRoom(`user:${endUserId}`, 'booking:status_changed', { reference, status })
    }

    if (result.status === 'EXPIRED') {
      return NextResponse.json(
        { success: false, message: 'Reservation already expired and cannot be cancelled' },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, message: 'Booking cancelled' })
  } catch (error: unknown) {
    console.error('Cancel booking error:', error)
    return NextResponse.json({ success: false, message: 'Failed to cancel booking' }, { status: 500 })
  }
}
