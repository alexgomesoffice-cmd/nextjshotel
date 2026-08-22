import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

/**
 * GET /api/user/bookings/[reference]
 * Fetch a single booking by reference for the authenticated user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { payload, error } = await requireAuth(req, ["END_USER"]);
    if (error) return error;

    const { reference } = await params;

    const booking = await prisma.user_bookings.findFirst({
      where: {
        booking_reference: reference,
        end_user_id: payload.actor_id,
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: { select: { name: true } },
            images: { take: 1, orderBy: { sort_order: "asc" } },
          },
        },
        room_bookings: {
          include: {
            room_type: { select: { id: true, name: true } },
            room_variant: {
              select: {
                id: true,
                room_size: true,
                max_occupancy: true,
                variant_images: { orderBy: { sort_order: "asc" }, select: { image_url: true, is_cover: true } },
                bed_types: { select: { count: true, bed_type: { select: { name: true } } } },
                facilities: { select: { facility: { select: { name: true } } } },
              },
            },
            nightly_rates: {
              orderBy: { stay_date: "asc" },
              select: { stay_date: true, price: true, pricing_rule_name: true },
            },
          },
        },
        end_user: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status === 'RESERVED' && booking.reserved_until && new Date(booking.reserved_until) < new Date()) {
      await prisma.$transaction([
        prisma.user_bookings.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED', reserved_until: null },
        }),
        prisma.room_trackers.deleteMany({
          where: { booking_id: booking.id, status: 'RESERVED' },
        }),
      ])
      booking.status = 'EXPIRED'
      booking.reserved_until = null
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error: unknown) {
    console.error("Fetch booking error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
