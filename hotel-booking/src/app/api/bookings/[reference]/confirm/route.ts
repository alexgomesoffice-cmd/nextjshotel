// filepath: src/app/api/bookings/[reference]/confirm/route.ts
// PATCH: Upgrade booking from RESERVED → BOOKED.
// Called when payment is confirmed or hotel manually confirms.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { emitToRoom } from '@/lib/socket-emit';

type Params = { params: Promise<{ reference: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
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

    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: 'BOOKED', reserved_until: null },
      }),
      prisma.room_trackers.updateMany({
        where: { booking_id: booking.id, status: 'RESERVED' },
        data: { status: 'BOOKED' },
      }),
    ]);

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
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
