import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { reserveBookingSchema } from "@/lib/validations/booking";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { payload, error } = await requireAuth(req, ["END_USER"]);
    if (error) return error;

    const body = await req.json();
    const parsedBody = reserveBookingSchema.safeParse({
      hotel_id: Number(body.hotel_id),
      check_in: body.check_in,
      check_out: body.check_out,
      guests: Number(body.guests),
      room_selections: Array.isArray(body.room_selections)
        ? body.room_selections.map((selection: any) => ({
            room_type_id: Number(selection?.room_type_id ?? selection?.roomTypeId),
            variant_id: Number(selection?.variant_id ?? selection?.variantId),
            quantity: Number(selection?.quantity),
          }))
        : body.room_type_id !== undefined && body.quantity !== undefined
        ? [
            {
              room_type_id: Number(body.room_type_id),
              variant_id: Number(body.variant_id ?? 0),
              quantity: Number(body.quantity),
            },
          ]
        : [],
      special_request: body.special_request,
    });

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error.issues[0]?.message || "Invalid booking payload",
        },
        { status: 400 }
      );
    }

    const {
      hotel_id,
      room_selections,
      check_in,
      check_out,
      guests,
      special_request,
    } = parsedBody.data;

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

    // Enforce 1-year maximum booking window
    const maxAllowedDate = new Date();
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1);
    if (checkInDate > maxAllowedDate) {
      return NextResponse.json(
        { success: false, message: "Check-in date cannot be more than 1 year from today" },
        { status: 400 }
      );
    }
    if (checkOutDate > maxAllowedDate) {
      return NextResponse.json(
        { success: false, message: "Check-out date cannot be more than 1 year from today" },
        { status: 400 }
      );
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const normalizedSelections = room_selections;
    const roomTypeIds = [...new Set(normalizedSelections.map((selection) => selection.room_type_id))];

    const roomTypes = await prisma.room_types.findMany({
      where: { id: { in: roomTypeIds } },
    });

    if (roomTypes.length !== roomTypeIds.length) {
      return NextResponse.json(
        { success: false, message: "Invalid room type or hotel" },
        { status: 400 }
      );
    }

    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]));
    if (roomTypes.some((rt) => rt.hotel_id !== Number(hotel_id))) {
      return NextResponse.json(
        { success: false, message: "Invalid room type or hotel" },
        { status: 400 }
      );
    }

    const totalQuantity = normalizedSelections.reduce((sum, selection) => sum + selection.quantity, 0);

    // Concurrency control via interactive transaction to prevent double booking
    const bookingResult = await prisma.$transaction(async (tx) => {
      let totalPrice = 0;
      const selectedRoomsByType: Array<{ roomTypeId: number; rooms: any[] }> = [];

      for (const selection of normalizedSelections) {
        const roomType = roomTypeMap.get(selection.room_type_id);
        if (!roomType) {
          throw new Error("Invalid room type or hotel");
        }

        const variantRoom = await tx.room_details.findUnique({
          where: { id: selection.variant_id },
        });

        if (!variantRoom || variantRoom.room_type_id !== selection.room_type_id) {
          throw new Error("Invalid room variant");
        }

        const physicalRooms = await tx.room_details.findMany({
          where: {
            room_type_id: roomType.id,
            status: "AVAILABLE",
            deleted_at: null,
            price: variantRoom.price,
            ac: variantRoom.ac,
            smoking_allowed: variantRoom.smoking_allowed,
            pet_allowed: variantRoom.pet_allowed,
          },
        });

        if (physicalRooms.length < selection.quantity) {
          throw new Error(`Not enough physical rooms configured for the selected variant of ${roomType.name}`);
        }

        const bookedRooms = await tx.room_trackers.findMany({
          where: {
            room_detail_id: { in: physicalRooms.map((r) => r.id) },
            status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
            check_in: { lt: checkOutDate },
            check_out: { gt: checkInDate },
          },
          select: { room_detail_id: true },
        });

        const bookedRoomIds = new Set(bookedRooms.map((r) => r.room_detail_id));
        const availableRooms = physicalRooms.filter((r) => !bookedRoomIds.has(r.id));

        if (availableRooms.length < selection.quantity) {
          throw new Error("Rooms are sold out for the selected dates");
        }

        const selectedRooms = availableRooms.slice(0, selection.quantity);

        // Re-confirm no tracker was inserted between our read and this write (race condition guard)
        const conflictCheck = await tx.room_trackers.findFirst({
          where: {
            room_detail_id: { in: selectedRooms.map((r) => r.id) },
            status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
            check_in: { lt: checkOutDate },
            check_out: { gt: checkInDate },
          },
        });
        if (conflictCheck) {
          throw new Error("Rooms are sold out for the selected dates");
        }

        totalPrice += selectedRooms.reduce((sum, room) => sum + Number(room.price) * nights, 0);
        selectedRoomsByType.push({ roomTypeId: roomType.id, rooms: selectedRooms });
      }

      const refCode = "SV-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 5);

      const booking = await tx.user_bookings.create({
        data: {
          booking_reference: refCode,
          end_user_id: payload.actor_id,
          hotel_id: Number(hotel_id),
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: Number(guests),
          rooms_count: totalQuantity,
          special_request: special_request || null,
          status: "RESERVED",
          reserved_until: reservedUntil,
          total_price: totalPrice,
          advance_amount: 0,
        },
      });

      for (const selection of selectedRoomsByType) {
        for (const room of selection.rooms) {
          const subtotal = Number(room.price) * nights;

          await tx.room_bookings.create({
            data: {
              booking_id: booking.id,
              room_type_id: selection.roomTypeId,
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
