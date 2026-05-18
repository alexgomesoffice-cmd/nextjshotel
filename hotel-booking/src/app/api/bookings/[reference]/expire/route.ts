// filepath: src/app/api/bookings/[reference]/expire/route.ts
// Called by the client (ReservationTimer) when countdown hits 0.
// Also called by the cron job indirectly.
// Marks a RESERVED booking as EXPIRED and releases room_trackers.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

type Params = { params: Promise<{ reference: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['END_USER']);
  if (error) return error;

  try {
    const { reference } = await params;

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { id: true, status: true, end_user_id: true, reserved_until: true },
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
        data: { status: 'EXPIRED' },
      }),
      // DELETE trackers to free the room dates for future reservations
      prisma.room_trackers.deleteMany({ where: { booking_id: booking.id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Booking expired' });
  } catch (error: any) {
    console.error('expire booking error:', error);
    return NextResponse.json({ success: false, message: 'Failed to expire booking' }, { status: 500 });
  }
}
