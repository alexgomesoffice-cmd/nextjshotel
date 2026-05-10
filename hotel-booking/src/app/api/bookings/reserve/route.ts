import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { payload, error } = await requireAuth(req, ["END_USER"]);
    if (error) return error;

    const body = await req.json();
    const {
      hotel_id,
      room_type_id,
      check_in,
      check_out,
      guests,
      quantity,
      special_request,
    } = body;

    // Basic Validation
    if (!hotel_id || !room_type_id || !check_in || !check_out || !guests || !quantity) {
      return NextResponse.json(
        { success: false, message: "Missing required booking parameters" },
        { status: 400 }
      );
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid dates provided" },
        { status: 400 }
      );
    }

    if (checkInDate < today) {
      return NextResponse.json(
        { success: false, message: "Check-in date cannot be in the past" },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { success: false, message: "Check-out must be after check-in" },
        { status: 400 }
      );
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Verify room type and hotel
    const roomType = await prisma.room_types.findUnique({
      where: { id: Number(room_type_id) },
    });

    if (!roomType || roomType.hotel_id !== Number(hotel_id)) {
      return NextResponse.json(
        { success: false, message: "Invalid room type or hotel" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);

    // Concurrency control via interactive transaction to prevent double booking
    const bookingResult = await prisma.$transaction(async (tx) => {
      // 1. Find physical rooms (room_details) of this type
      const physicalRooms = await tx.room_details.findMany({
        where: {
          room_type_id: roomType.id,
          status: "AVAILABLE",
          deleted_at: null,
        },
      });

      if (physicalRooms.length < qty) {
        throw new Error("Not enough physical rooms configured for this type");
      }

      // 2. Check room_trackers to see which physical rooms are already booked/reserved for these dates
      const bookedRooms = await tx.room_trackers.findMany({
        where: {
          room_detail_id: { in: physicalRooms.map((r) => r.id) },
          status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
          // A room is busy if its stay overlaps with the requested dates.
          // Overlap condition: existing_check_in < requested_check_out AND existing_check_out > requested_check_in
          check_in: { lt: checkOutDate },
          check_out: { gt: checkInDate },
        },
        select: { room_detail_id: true },
      });

      const bookedRoomIds = new Set(bookedRooms.map((r) => r.room_detail_id));
      const availableRooms = physicalRooms.filter((r) => !bookedRoomIds.has(r.id));

      if (availableRooms.length < qty) {
        throw new Error("Rooms are sold out for the selected dates");
      }

      // 3. Select the required number of rooms
      const selectedRooms = availableRooms.slice(0, qty);

      // 4. Calculate total price (Simplified: Base Price * Nights * Quantity)
      const pricePerNight = Number(roomType.base_price);
      const totalPrice = pricePerNight * nights * qty;

      // Generate a unique 8-character booking reference (e.g. SV-A8B9C2)
      const refCode = "SV-" + crypto.randomBytes(3).toString("hex").toUpperCase();

      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 10); // Hold for 10 minutes

      // 5. Create user_bookings
      const booking = await tx.user_bookings.create({
        data: {
          booking_reference: refCode,
          end_user_id: payload.actor_id,
          hotel_id: Number(hotel_id),
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: Number(guests),
          rooms_count: qty,
          special_request: special_request || null,
          status: "RESERVED",
          reserved_until: reservedUntil,
          total_price: totalPrice,
          advance_amount: 0,
        },
      });

      // 6. Create room_bookings and room_trackers
      for (const room of selectedRooms) {
        const subtotal = Number(room.price) * nights; // using individual room price if configured, else base_price

        await tx.room_bookings.create({
          data: {
            booking_id: booking.id,
            room_type_id: roomType.id,
            room_detail_id: room.id,
            price_per_night: room.price,
            nights: nights,
            subtotal: subtotal,
          },
        });

        await tx.room_trackers.create({
          data: {
            booking_id: booking.id,
            room_detail_id: room.id,
            check_in: checkInDate,
            check_out: checkOutDate,
            status: "RESERVED",
          },
        });
      }

      return booking;
    });

    return NextResponse.json({
      success: true,
      message: "Reservation successful",
      data: {
        booking_reference: bookingResult.booking_reference,
        reserved_until: bookingResult.reserved_until,
      },
    });
  } catch (error: any) {
    console.error("Booking Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process reservation",
      },
      { status: error.message?.includes("sold out") ? 409 : 500 }
    );
  }
}
