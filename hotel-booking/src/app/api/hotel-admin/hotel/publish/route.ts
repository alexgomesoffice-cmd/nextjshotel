import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const { payload, error } = await requireAuth(req, ["HOTEL_ADMIN"]);
    if (error) return error;

    const hotelId = payload.hotel_id;
    if (!hotelId) {
      return NextResponse.json(
        { success: false, message: "No hotel associated with this admin" },
        { status: 400 }
      );
    }

    // Fetch the current hotel status
    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      select: { approval_status: true },
    });

    if (!hotel) {
      return NextResponse.json(
        { success: false, message: "Hotel not found" },
        { status: 404 }
      );
    }

    if (hotel.approval_status === "SUSPENDED") {
      return NextResponse.json(
        { success: false, message: "Hotel is suspended by system administrator. Please contact support." },
        { status: 403 }
      );
    }

    if (hotel.approval_status === "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Hotel is already published" },
        { status: 400 }
      );
    }

    // Update status to PUBLISHED
    const updatedHotel = await prisma.hotels.update({
      where: { id: hotelId },
      data: { 
        approval_status: "PUBLISHED",
        published_at: new Date()
      },
      select: { id: true, name: true, approval_status: true, published_at: true },
    });

    return NextResponse.json({
      success: true,
      message: "Hotel published successfully",
      data: updatedHotel,
    });
  } catch (error: any) {
    console.error("Failed to publish hotel:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
