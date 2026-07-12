// filepath: src/app/api/bookings/[reference]/expire/route.ts
// Called by the client (ReservationTimer) when countdown hits 0.
// Also called by the cron job indirectly.
// Marks a RESERVED booking as EXPIRED and releases room_trackers.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { emitToRoom } from '@/lib/socket-emit';

type Params = { params: Promise<{ reference: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['END_USER']);
  if (error) return error;

  try {
    const { reference } = await params;

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { id: true, status: true, end_user_id: true, hotel_id: true, reserved_until: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (booking.end_user_id !== payload.actor_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (booking.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: `Cannot expire a booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED', reserved_until: null },
      }),
      // DELETE trackers to free the room dates for future reservations
      prisma.room_trackers.deleteMany({ where: { booking_id: booking.id } }),
    ]);

    void emitToRoom(`booking:${reference}`, 'booking:status_changed', {
      reference,
      status: 'EXPIRED',
    });

    if (booking.hotel_id) {
      void emitToRoom(`hotel-admin:${booking.hotel_id}`, 'booking:status_changed', {
        reference,
        status: 'EXPIRED',
        hotel_id: booking.hotel_id,
      });
      void emitToRoom('hotel-admin:all', 'booking:status_changed', {
        reference,
        status: 'EXPIRED',
        hotel_id: booking.hotel_id,
      });
      void emitToRoom(`hotel:${booking.hotel_id}:availability`, 'room:availability_changed', {
        hotel_id: booking.hotel_id,
      });
    }

    if (booking.end_user_id) {
      void emitToRoom(`user:${booking.end_user_id}`, 'booking:status_changed', {
        reference,
        status: 'EXPIRED',
      });
    }

    return NextResponse.json({ success: true, message: 'Booking expired' });
  } catch (error: any) {
    console.error('expire booking error:', error);
    return NextResponse.json({ success: false, message: 'Failed to expire booking' }, { status: 500 });
  }
}
