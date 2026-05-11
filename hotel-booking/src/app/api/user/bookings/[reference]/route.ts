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
            room_detail: {
              select: {
                id: true,
                room_number: true,
                floor: true,
                ac: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error: any) {
    console.error("Fetch booking error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
