// filepath: src/app/api/cron/expire-bookings/route.ts
// Called by Vercel Cron (or any cron scheduler) every minute.
// Finds all RESERVED bookings whose reserved_until has passed and marks them EXPIRED.
// Also releases the room_trackers for those bookings.
// Protected by CRON_SECRET env var.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      select: { id: true, booking_reference: true },
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({ success: true, expired: 0, message: 'Nothing to expire' });
    }

    const expiredIds = expiredBookings.map((b) => b.id);

    await prisma.$transaction([
      prisma.user_bookings.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      }),
      prisma.room_trackers.updateMany({
        where: {
          booking_id: { in: expiredIds },
          status: 'RESERVED',
        },
        data: { status: 'EXPIRED' },
      }),
    ]);

    console.log(`[Cron] Expired ${expiredBookings.length} bookings:`, expiredBookings.map(b => b.booking_reference));

    return NextResponse.json({
      success: true,
      expired: expiredBookings.length,
      references: expiredBookings.map((b) => b.booking_reference),
    });
  } catch (error: any) {
    console.error('[Cron] expire-bookings error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
