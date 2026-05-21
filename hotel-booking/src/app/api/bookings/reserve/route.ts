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
      room_selections,
      check_in,
      check_out,
      guests,
      quantity,
      special_request,
    } = body;

    const selections = Array.isArray(room_selections)
      ? room_selections.map((selection: any) => ({
          room_type_id: Number(selection?.room_type_id ?? selection?.roomTypeId),
          quantity: Number(selection?.quantity),
        }))
      : room_type_id !== undefined && quantity !== undefined
      ? [{ room_type_id: Number(room_type_id), quantity: Number(quantity) }]
      : [];

    // Basic Validation
    if (
      !hotel_id ||
      !check_in ||
      !check_out ||
      !guests ||
      selections.length === 0 ||
      selections.some(sel => !sel.room_type_id || sel.quantity < 1)
    ) {
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

    const groupedSelections = selections.reduce<Record<number, { room_type_id: number; quantity: number }>>((acc, selection) => {
      if (!acc[selection.room_type_id]) {
        acc[selection.room_type_id] = { ...selection };
      } else {
        acc[selection.room_type_id].quantity += selection.quantity;
      }
      return acc;
    }, {});

    const normalizedSelections = Object.values(groupedSelections);
    const roomTypeIds = normalizedSelections.map((selection) => selection.room_type_id);

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

        const physicalRooms = await tx.room_details.findMany({
          where: {
            room_type_id: roomType.id,
            status: "AVAILABLE",
            deleted_at: null,
          },
        });

        if (physicalRooms.length < selection.quantity) {
          throw new Error("Not enough physical rooms configured for one of the selected room types");
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
