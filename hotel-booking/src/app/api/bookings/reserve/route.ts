import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { reserveBookingSchema } from "@/lib/validations/booking";
import { getEffectivePriceRange } from "@/lib/pricing-resolver";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { emitToRoom } from "@/lib/socket-emit";

/**
 * POST /api/bookings/reserve
 * Rewritten against the Room Type -> Room Variant -> Physical Room
 * architecture. `selection.variant_id` is a room_variants.id (the
 * validation schema always meant this — the old implementation
 * mistakenly queried room_details with it, and referenced columns
 * (price/ac/smoking_allowed/pet_allowed/room_type_id) that no longer
 * exist on room_details at all). Pricing is resolved night-by-night via
 * the shared pricing resolver and snapshotted into
 * room_booking_nightly_rates — never recalculated from live pricing
 * later.
 */
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
        ? body.room_selections.map((selection: unknown) => {
            const candidate = selection as Record<string, unknown>;
            return {
              room_type_id: Number(candidate.room_type_id ?? candidate.roomTypeId),
              variant_id: Number(candidate.variant_id ?? candidate.variantId),
              quantity: Number(candidate.quantity),
            };
          })
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
        { success: false, message: parsedBody.error.issues[0]?.message || "Invalid booking payload" },
        { status: 400 }
      );
    }

    const { hotel_id, room_selections, check_in, check_out, guests, special_request } = parsedBody.data;

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid dates provided" }, { status: 400 });
    }
    if (checkInDate < today) {
      return NextResponse.json({ success: false, message: "Check-in date cannot be in the past" }, { status: 400 });
    }
    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ success: false, message: "Check-out must be after check-in" }, { status: 400 });
    }

    const maxAllowedDate = new Date();
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1);
    if (checkInDate > maxAllowedDate || checkOutDate > maxAllowedDate) {
      return NextResponse.json({ success: false, message: "Dates cannot be more than 1 year from today" }, { status: 400 });
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    const variantIds = [...new Set(room_selections.map((s) => s.variant_id))];
    const variants = await prisma.room_variants.findMany({
      where: { id: { in: variantIds } },
      include: { room_type: true },
    });
    if (variants.length !== variantIds.length || variants.some((v) => v.room_type.hotel_id !== hotel_id || v.room_type_id === undefined)) {
      return NextResponse.json({ success: false, message: "Invalid room selection" }, { status: 400 });
    }
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    for (const s of room_selections) {
      const v = variantMap.get(s.variant_id);
      if (!v || v.room_type_id !== s.room_type_id) {
        return NextResponse.json({ success: false, message: "Invalid room selection" }, { status: 400 });
      }
    }

    const normalizedSelections = [...room_selections.reduce((groups, selection) => {
      const existing = groups.get(selection.variant_id);
      groups.set(selection.variant_id, existing
        ? { ...existing, quantity: existing.quantity + selection.quantity }
        : selection);
      return groups;
    }, new Map<number, (typeof room_selections)[number]>()).values()];

    // Resolve nightly pricing for every distinct variant ONCE, outside the
    // transaction (pure read, no need to hold it up) — reused per room.
    const priceRangeByVariant = new Map<number, Awaited<ReturnType<typeof getEffectivePriceRange>>>();
    for (const variantId of variantIds) {
      priceRangeByVariant.set(variantId, await getEffectivePriceRange(variantId, checkInDate, checkOutDate));
    }

    const totalQuantity = normalizedSelections.reduce((sum, s) => sum + s.quantity, 0);

    const bookingResult = await prisma.$transaction(async (tx) => {
      let totalPrice = 0;
      const selectedRoomsByVariant: Array<{ roomTypeId: number; variantId: number; rooms: Array<{ id: number }> }> = [];

      for (const selection of normalizedSelections) {
        const physicalRooms = await tx.room_details.findMany({
          where: { room_variant_id: selection.variant_id, status: "AVAILABLE", deleted_at: null },
        });
        if (physicalRooms.length < selection.quantity) {
          throw new Error("Rooms are sold out for the selected room configuration");
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

        // Race-condition guard: re-confirm no tracker landed between our read and this write.
        const conflictCheck = await tx.room_trackers.findFirst({
          where: {
            room_detail_id: { in: selectedRooms.map((r) => r.id) },
            status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
            check_in: { lt: checkOutDate },
            check_out: { gt: checkInDate },
          },
        });
        if (conflictCheck) throw new Error("Rooms are sold out for the selected dates");

        const priceRange = priceRangeByVariant.get(selection.variant_id)!;
        totalPrice += priceRange.subtotal * selectedRooms.length;
        selectedRoomsByVariant.push({ roomTypeId: selection.room_type_id, variantId: selection.variant_id, rooms: selectedRooms });
      }

      const refCode = "SV-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 5);

      const booking = await tx.user_bookings.create({
        data: {
          booking_reference: refCode,
          end_user_id: payload.actor_id,
          hotel_id,
          check_in: checkInDate,
          check_out: checkOutDate,
          guests,
          rooms_count: totalQuantity,
          special_request: special_request || null,
          status: "RESERVED",
          reserved_until: reservedUntil,
          total_price: totalPrice,
        },
      });

      for (const group of selectedRoomsByVariant) {
        const priceRange = priceRangeByVariant.get(group.variantId)!;
        const avgPricePerNight = Math.round((priceRange.subtotal / nights) * 100) / 100;

        for (const room of group.rooms) {
          const roomBooking = await tx.room_bookings.create({
            data: {
              booking_id: booking.id,
              room_type_id: group.roomTypeId,
              room_variant_id: group.variantId,
              room_detail_id: room.id,
              price_per_night: avgPricePerNight,
              nights,
              subtotal: priceRange.subtotal,
            },
          });

          // One row per booked night — the historical snapshot. Never
          // recalculated from pricing_rules later, per design.
          await tx.room_booking_nightly_rates.createMany({
            data: priceRange.nights.map((n) => ({
              room_booking_id: roomBooking.id,
              stay_date: n.date,
              price: n.resolved.effectivePrice,
              pricing_rule_id: n.resolved.discount?.ruleId ?? null,
              pricing_rule_name: n.resolved.discount?.name ?? null,
            })),
          });

          await tx.room_trackers.create({
            data: { booking_id: booking.id, room_detail_id: room.id, check_in: checkInDate, check_out: checkOutDate, status: "RESERVED" },
          });
        }
      }

      return booking;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    void emitToRoom(`hotel:${hotel_id}:availability`, "room:availability_changed", { hotel_id });
    void emitToRoom(`hotel-admin:${hotel_id}`, "booking:created", {
      reference: bookingResult.booking_reference, hotel_id, status: "RESERVED", reserved_until: bookingResult.reserved_until,
    });
    void emitToRoom("hotel-admin:all", "booking:created", {
      reference: bookingResult.booking_reference, hotel_id, status: "RESERVED", reserved_until: bookingResult.reserved_until,
    });

    return NextResponse.json({
      success: true,
      message: "Reservation successful",
      data: { booking_reference: bookingResult.booking_reference, reserved_until: bookingResult.reserved_until },
    });
  } catch (error: unknown) {
    console.error("Booking Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process reservation";
    return NextResponse.json(
      { success: false, message },
      { status: message.includes("sold out") ? 409 : 500 }
    );
  }
}