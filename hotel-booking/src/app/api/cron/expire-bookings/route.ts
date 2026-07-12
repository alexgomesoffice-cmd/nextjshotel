// filepath: src/app/api/cron/expire-bookings/route.ts
// Called by Vercel Cron (or any cron scheduler) every minute.
// Finds all RESERVED bookings whose reserved_until has passed and marks them EXPIRED.
// Also releases the room_trackers for those bookings.
// Protected by CRON_SECRET env var.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitToRoom } from '@/lib/socket-emit';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const expiredBookings = await prisma.user_bookings.findMany({
      where: {
        status: 'RESERVED',
        reserved_until: { lt: now },
      },
      select: { id: true, booking_reference: true, hotel_id: true, end_user_id: true },
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({ success: true, expired: 0, message: 'Nothing to expire' });
    }

    const expiredIds = expiredBookings.map((b) => b.id);

    await prisma.$transaction([
      prisma.user_bookings.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED', reserved_until: null },
      }),
      prisma.room_trackers.deleteMany({
        where: {
          booking_id: { in: expiredIds },
          status: 'RESERVED',
        },
      }),
    ]);

    console.log(`[Cron] Expired ${expiredBookings.length} bookings:`, expiredBookings.map(b => b.booking_reference));

    // ── Live updates ─────────────────────────────────────────────────────────
    // For each expired booking, notify the booking channel and the hotel admin.
    // Also fire a generic availability update so the hotel page refreshes counts.
    const uniqueHotelIds = [...new Set(expiredBookings.map(b => b.hotel_id).filter(Boolean))];

    for (const b of expiredBookings) {
      void emitToRoom(`booking:${b.booking_reference}`, 'booking:status_changed', {
        reference: b.booking_reference,
        status: 'EXPIRED',
      });
      if (b.hotel_id) {
        void emitToRoom(`hotel-admin:${b.hotel_id}`, "booking:status_changed", {
          reference: b.booking_reference,
          status: "EXPIRED",
          hotel_id: b.hotel_id,
        });
        void emitToRoom("hotel-admin:all", "booking:status_changed", {
          reference: b.booking_reference,
          status: "EXPIRED",
          hotel_id: b.hotel_id,
        });
      }

      // Emit to end user
      if (b.end_user_id) {
        void emitToRoom(`user:${b.end_user_id}`, "booking:status_changed", {
          reference: b.booking_reference,
          status: "EXPIRED",
        });
      }
    }
    
    // ── Emitting room availability updates ──────────────────────────────────
    for (const hotelId of uniqueHotelIds) {
      if (hotelId) {
        void emitToRoom(`hotel:${hotelId}:availability`, 'room:availability_changed', { hotel_id: hotelId });
      }
    }

    return NextResponse.json({
      success: true,
      expired: expiredBookings.length,
      references: expiredBookings.map((b) => b.booking_reference),
    });
  } catch (error: unknown) {
    console.error('[Cron] expire-bookings error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
