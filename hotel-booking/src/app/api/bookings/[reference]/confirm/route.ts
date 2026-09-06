// filepath: src/app/api/bookings/[reference]/confirm/route.ts
// POST: Upgrade booking from RESERVED → BOOKED.
// Called when the guest confirms the temporary reservation.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { emitToRoom } from '@/lib/socket-emit';
import { OneRoomTypeBookingError, hasMultipleRoomTypes } from '@/lib/booking-room-type';

type Params = { params: Promise<{ reference: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['END_USER', 'HOTEL_ADMIN', 'HOTEL_SUB_ADMIN']);
  if (error) return error;

  try {
    const { reference } = await params;

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: {
        id: true,
        status: true,
        end_user_id: true,
        hotel_id: true,
        reserved_until: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (payload.actor_type === 'END_USER' && booking.end_user_id !== payload.actor_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (
      (payload.actor_type === 'HOTEL_ADMIN' || payload.actor_type === 'HOTEL_SUB_ADMIN') &&
      payload.hotel_id !== booking.hotel_id
    ) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (booking.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: `Booking is already ${booking.status}` },
        { status: 400 }
      );
    }

    if (booking.reserved_until && new Date(booking.reserved_until) < new Date()) {
      await prisma.$transaction([
        prisma.user_bookings.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } }),
        prisma.room_trackers.deleteMany({ where: { booking_id: booking.id, status: 'RESERVED' } }),
      ]);

      return NextResponse.json(
        { success: false, message: 'Reservation has expired. Please book again.' },
        { status: 409 }
      );
    }

    const confirmation = await prisma.$transaction(async (tx) => {
      const currentBooking = await tx.user_bookings.findUnique({
        where: { id: booking.id },
        include: {
          room_bookings: {
            select: { room_variant: { select: { room_type_id: true } } },
          },
        },
      });

      if (!currentBooking || currentBooking.status !== 'RESERVED') {
        return { expired: false, alreadyChanged: true };
      }

      if (currentBooking.reserved_until && new Date(currentBooking.reserved_until) < new Date()) {
        await tx.user_bookings.update({
          where: { id: currentBooking.id },
          data: { status: 'EXPIRED', reserved_until: null },
        });
        await tx.room_trackers.deleteMany({ where: { booking_id: currentBooking.id, status: 'RESERVED' } });
        return { expired: true, alreadyChanged: false };
      }

      if (hasMultipleRoomTypes(currentBooking.room_bookings.map((roomBooking) => roomBooking.room_variant.room_type_id))) {
        throw new OneRoomTypeBookingError();
      }

      await tx.user_bookings.update({
        where: { id: currentBooking.id },
        data: { status: 'BOOKED', reserved_until: null },
      });
      await tx.room_trackers.updateMany({
        where: { booking_id: currentBooking.id, status: 'RESERVED' },
        data: { status: 'BOOKED' },
      });
      return { expired: false, alreadyChanged: false };
    });

    if (confirmation.expired) {
      return NextResponse.json(
        { success: false, message: 'Reservation has expired. Please book again.' },
        { status: 409 }
      );
    }
    if (confirmation.alreadyChanged) {
      return NextResponse.json(
        { success: false, message: `Booking is already ${booking.status}` },
        { status: 400 }
      );
    }

    // ── Live updates ──────────────────────────────────────────────────────────
    // 1. Notify hotel admin
    void emitToRoom(`hotel-admin:${booking.hotel_id}`, "booking:status_changed", {
      reference,
      status: "BOOKED",
      hotel_id: booking.hotel_id,
    });

    // 2. Notify end user
    if (booking.end_user_id) {
      void emitToRoom(`user:${booking.end_user_id}`, "booking:status_changed", {
        reference,
        status: "BOOKED",
      });
    }

    return NextResponse.json({ success: true, message: 'Booking confirmed' });
  } catch (error: unknown) {
    console.error('confirm booking error:', error);
    if (error instanceof OneRoomTypeBookingError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
