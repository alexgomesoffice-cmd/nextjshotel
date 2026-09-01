import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePriceRange, type PricingRuleLike } from '@/lib/pricing-resolver';
import { validateBookingDateRange, getStayNights } from '@/lib/date-policy';

/**
 * GET /api/public/hotels/[slug]/availability
 * Rewritten against Room Type -> Room Variant -> Physical Room. Real
 * variants are queried directly — nothing is grouped/recreated at query
 * time anymore (room-grouping.ts is retired). Effective pricing is
 * resolved via the same shared resolver bookings use for every requested
 * stay night. `pricing` remains the first-night representative for existing
 * cards; `pricing_nights` and `pricing_subtotal` expose the full stay quote.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get('check_in');
    const checkOut = searchParams.get('check_out');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Hotel slug is required' }, { status: 400 });
    }

    if (!!checkIn !== !!checkOut) {
      return NextResponse.json({ success: false, message: 'Both check_in and check_out are required' }, { status: 400 });
    }

    if (checkIn && checkOut) {
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      if (isNaN(ci.getTime()) || isNaN(co.getTime()) || co <= ci) {
        return NextResponse.json({ success: false, message: 'Invalid stay dates' }, { status: 400 });
      }

      // Validate using centralized date policy
      const dateValidation = validateBookingDateRange(ci, co);
      if (!dateValidation.isValid) {
        return NextResponse.json({ success: false, message: dateValidation.message }, { status: 400 });
      }
    }

    const pricingCheckIn = checkIn ? new Date(checkIn) : new Date();
    const pricingCheckOut = checkOut ? new Date(checkOut) : new Date(pricingCheckIn.getTime() + 24 * 60 * 60 * 1000);

    const hotel = await prisma.hotels.findUnique({
      where: { slug, approval_status: 'PUBLISHED', deleted_at: null },
      include: {
        room_types: {
          where: { is_active: true },
          include: {
            type_images: { orderBy: { sort_order: 'asc' } },
            room_type_amenities: { include: { amenity: true } },
            room_variants: {
              where: { is_active: true },
              include: {
                variant_images: { orderBy: { sort_order: 'asc' } },
                facilities: { include: { facility: true } },
                bed_types: { include: { bed_type: true } },
                pricing_rules: { where: { status: 'ACTIVE' } },
                room_details: {
                  where: { status: 'AVAILABLE', deleted_at: null },
                  include: {
                    room_trackers: {
                      where: {
                        status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
                        ...(checkIn && checkOut
                          ? { check_in: { lt: new Date(checkOut) }, check_out: { gt: new Date(checkIn) } }
                          : {}),
                      },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 });
    }

    const roomTypes = hotel.room_types.map((rt) => {
      const variants = rt.room_variants.map((v) => {
        const availableCount = v.room_details.filter((r) => r.room_trackers.length === 0).length;
        const pricingRange = resolvePriceRange(Number(v.price), v.pricing_rules as PricingRuleLike[], pricingCheckIn, pricingCheckOut);
        const resolved = pricingRange.nights[0]?.resolved;
        return {
          id: v.id,
          room_size: v.room_size,
          max_occupancy: v.max_occupancy,
          facilities: v.facilities.map((f) => f.facility),
          bed_types: v.bed_types.map((b) => ({ bed_type: b.bed_type, count: b.count })),
          variant_images: v.variant_images,
          pricing: resolved,
          pricing_nights: pricingRange.nights.map((night) => ({
            stay_date: night.date,
            ...night.resolved,
          })),
          pricing_subtotal: pricingRange.subtotal,
          total_rooms: v.room_details.length,
          available_count: availableCount,
        };
      });
      const availableRoomsCount = variants.reduce((sum, v) => sum + v.available_count, 0);

      return {
        id: rt.id,
        hotel_id: hotel.id,
        name: rt.name,
        description: rt.description,
        type_images: rt.type_images,
        room_type_amenities: rt.room_type_amenities,
        available_rooms_count: availableRoomsCount,
        room_variants: variants,
      };
    });

    return NextResponse.json({ success: true, data: roomTypes });
  } catch (error) {
    console.error('Availability API Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch availability' }, { status: 500 });
  }
}