import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Builds the `where` clause for room_details availability filtering.
 * room_details are accessed via room_variants now (not directly from room_types).
 */
function buildRoomDetailWhere(checkIn?: string | null, checkOut?: string | null) {
  const base: Record<string, unknown> = { status: 'AVAILABLE', deleted_at: null };
  if (checkIn && checkOut) {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
      base.room_trackers = {
        none: {
          status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
          check_in:  { lt: co },
          check_out: { gt: ci },
        },
      };
    }
  }
  return base;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const location      = searchParams.get('location');
    const hotelTypesStr = searchParams.get('hotel_types');
    const roomTypesStr  = searchParams.get('room_types');
    const bedTypesStr   = searchParams.get('bed_types');
    const starsStr      = searchParams.get('stars');
    const amenitiesStr  = searchParams.get('amenities');
    const minPrice      = searchParams.get('min_price');
    const maxPrice      = searchParams.get('max_price');
    const guests        = searchParams.get('guests');
    const sort          = searchParams.get('sort') || 'newest';
    const page          = parseInt(searchParams.get('page') || '1');
    const limit         = parseInt(searchParams.get('limit') || '12');
    const skip          = (page - 1) * limit;
    const includeRooms  = searchParams.get('include_rooms') === 'true';
    const checkIn       = searchParams.get('check_in');
    const checkOut      = searchParams.get('check_out');
    const hasDates      = !!(checkIn && checkOut);

    // ─── Hotel-level WHERE ────────────────────────────────────────────────────
    // Only return hotels that are PUBLISHED (hotel admin has published them).
    const where: Record<string, unknown> = { approval_status: 'PUBLISHED', deleted_at: null };

    if (location) {
      const locStr = location.split(',')[0].trim();
      where.OR = [
        { name:    { contains: locStr } },
        { address: { contains: locStr } },
        { city:    { name: { contains: locStr } } },
      ];
    }

    if (hotelTypesStr) {
      where.hotel_type = {
        name: { in: hotelTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) },
      };
    }

    // ─── Room-type / variant filters ──────────────────────────────────────────
    // Pricing, occupancy, and bed types now live on room_variants (not room_types).
    // We must filter via:  room_types.some { room_variants.some { ... } }
    if (roomTypesStr || bedTypesStr || minPrice || maxPrice || guests) {
      // Start building the room_type filter clause.
      const roomTypeFilter: Record<string, unknown> = { is_active: true };

      if (roomTypesStr) {
        roomTypeFilter.name = {
          in: roomTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean),
        };
      }

      // Variant-level filters
      const variantFilter: Record<string, unknown> = { is_active: true };

      if (bedTypesStr) {
        variantFilter.bed_types = {
          some: {
            bed_type: {
              name: { in: bedTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) },
            },
          },
        };
      }

      if (minPrice || maxPrice) {
        const priceClause: Record<string, number> = {};
        if (minPrice) priceClause.gte = Number(minPrice);
        if (maxPrice) priceClause.lte = Number(maxPrice);
        variantFilter.price = priceClause;
      }

      if (guests) {
        variantFilter.max_occupancy = { gte: parseInt(guests) };
      }

      // Attach variant filter only if we have variant-level constraints
      if (Object.keys(variantFilter).length > 1) {
        roomTypeFilter.room_variants = { some: variantFilter };
      }

      where.room_types = { some: roomTypeFilter };
    }

    // ─── Star rating filter ───────────────────────────────────────────────────
    if (starsStr) {
      where.detail = {
        star_rating: { in: starsStr.split(',').map(Number).filter(Boolean) },
      };
    }

    // ─── Amenity filter ───────────────────────────────────────────────────────
    // Hotel-level amenities: hotel_amenities.amenity_id
    // Room-level amenities:  room_types.room_type_amenities.amenity_id
    if (amenitiesStr) {
      const amenityIds = amenitiesStr.split(',').map(Number).filter(Boolean);
      const existingAnd = ((where['AND'] as Array<Record<string, unknown>>) ?? []);
      existingAnd.push({
        OR: [
          { hotel_amenities: { some: { amenity_id: { in: amenityIds } } } },
          { room_types: { some: { room_type_amenities: { some: { amenity_id: { in: amenityIds } } } } } },
        ],
      });
      where['AND'] = existingAnd;
    }

    // ─── Ordering ─────────────────────────────────────────────────────────────
    let orderBy: Record<string, unknown> | undefined = { created_at: 'desc' };
    const isPriceSort = sort === 'price_asc' || sort === 'price_desc';
    if (isPriceSort) orderBy = undefined; // sorted in memory after fetch
    if (sort === 'rating') orderBy = { detail: { guest_rating: 'desc' } };

    // ─── Room-types include shape ─────────────────────────────────────────────
    // When include_rooms=true we resolve the cheapest variant per room type
    // and count available physical rooms via room_variants → room_details.
    const roomTypesInclude = includeRooms
      ? {
          where:  { is_active: true },
          take:   4,
          select: {
            id:          true,
            name:        true,
            type_images: {
              where:  { is_cover: true, room_type_id: { not: null } },
              take:   1,
              select: { image_url: true },
            },
            // Fetch active variants to derive cheapest price, occupancy, beds,
            // and available room count.
            room_variants: {
              where:  { is_active: true },
              select: {
                id:            true,
                price:         true,
                max_occupancy: true,
                room_size:     true,
                bed_types: {
                  select: {
                    count:    true,
                    bed_type: { select: { name: true } },
                  },
                },
                room_details: {
                  where:  buildRoomDetailWhere(checkIn, checkOut),
                  select: { id: true },
                },
              },
            },
          },
        }
      : {
          // Minimal select: just enough to compute starting_price from variants.
          where:  { is_active: true },
          select: {
            room_variants: {
              where:  { is_active: true },
              select: { price: true },
            },
          },
        };

    // ─── Query ────────────────────────────────────────────────────────────────
    const [total, allHotelsOrPage] = await Promise.all([
      prisma.hotels.count({ where }),
      prisma.hotels.findMany({
        where,
        include: {
          city:       true,
          hotel_type: true,
          images:     { where: { is_cover: true }, take: 1 },
          detail:     true,
          room_types: roomTypesInclude as Record<string, unknown>,
          hotel_amenities: {
            include: { amenity: { select: { name: true } } },
          },
        },
        skip:    isPriceSort ? undefined : skip,
        take:    isPriceSort ? undefined : limit,
        orderBy,
      }),
    ]);

    let hotels = allHotelsOrPage;

    // ─── In-memory price sort ─────────────────────────────────────────────────
    if (isPriceSort) {
      hotels.sort((a, b) => {
        const rtsA = a.room_types as Array<Record<string, unknown>>;
        const rtsB = b.room_types as Array<Record<string, unknown>>;

        const minVariantPrice = (rts: Array<Record<string, unknown>>) => {
          const prices: number[] = [];
          for (const rt of rts) {
            const variants = (rt.room_variants as Array<Record<string, unknown>> | undefined) ?? [];
            for (const v of variants) prices.push(Number(String(v.price)));
          }
          return prices.length > 0 ? Math.min(...prices) : Infinity;
        };

        const priceA = minVariantPrice(rtsA);
        const priceB = minVariantPrice(rtsB);
        return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
      });
      hotels = hotels.slice(skip, skip + limit);
    }

    // ─── Format response ──────────────────────────────────────────────────────
    const formattedHotels = hotels.map((hotel) => {
      const rts = hotel.room_types as Array<Record<string, unknown>>;

      // Derive the cheapest base price across all room type variants.
      const allVariantPrices: number[] = [];
      for (const rt of rts) {
        const variants = (rt.room_variants as Array<Record<string, unknown>> | undefined) ?? [];
        for (const v of variants) allVariantPrices.push(Number(String(v.price)));
      }
      const startingPrice = allVariantPrices.length > 0 ? Math.min(...allVariantPrices) : null;

      const base = {
        id:             hotel.id,
        name:           hotel.name,
        slug:           hotel.slug,
        city:           hotel.city?.name,
        hotel_type:     hotel.hotel_type?.name,
        star_rating:    hotel.detail?.star_rating  ? Number(hotel.detail.star_rating)  : null,
        guest_rating:   hotel.detail?.guest_rating ? Number(hotel.detail.guest_rating) : null,
        cover_image:    hotel.images[0]?.image_url || null,
        starting_price: startingPrice,
        address:        hotel.address,
        amenities:      (hotel.hotel_amenities || [])
          .slice(0, 3)
          .map((ha) => String(((ha as Record<string, unknown>).amenity as Record<string, unknown>).name)),
      };

      if (!includeRooms) return base;

      // Build the full room_types array with variant-derived fields.
      const room_types = rts.map((rt) => {
        const rtRec    = rt as Record<string, unknown>;
        const variants = (rtRec.room_variants as Array<Record<string, unknown>> | undefined) ?? [];

        // Pick cheapest variant for display price, occupancy, size, and beds.
        const sorted = [...variants].sort((a, b) => Number(String(a.price)) - Number(String(b.price)));
        const cheapest = sorted[0] as Record<string, unknown> | undefined;

        // Collect bed types from the cheapest variant (representative config).
        const bedTypes = cheapest
          ? ((cheapest.bed_types as Array<Record<string, unknown>>) ?? []).map((rbt) => ({
              name:  String(((rbt as Record<string, unknown>).bed_type as Record<string, unknown>).name),
              count: (rbt as Record<string, unknown>).count,
            }))
          : [];

        // Sum up available physical room count across ALL active variants.
        const availableCount = variants.reduce((sum, v) => {
          const details = (v.room_details as Array<unknown> | undefined) ?? [];
          return sum + details.length;
        }, 0);

        // Cover image comes from room_type-level images.
        const typeImages = (rtRec.type_images as Array<Record<string, unknown>> | undefined) ?? [];
        const coverImage = typeImages[0]?.image_url ?? null;

        return {
          id:              rtRec.id,
          name:            rtRec.name,
          base_price:      cheapest ? Number(String(cheapest.price)) : null,
          max_occupancy:   cheapest?.max_occupancy ?? null,
          room_size:       cheapest ? ((cheapest.room_size as string) ?? null) : null,
          cover_image:     coverImage,
          bed_types:       bedTypes,
          available_count: availableCount,
          dates_filtered:  hasDates,
        };
      });

      return {
        ...base,
        room_types,
        total_room_types: rts.length,
        has_dates:        hasDates,
      };
    });

    return NextResponse.json({
      success:    true,
      data:       formattedHotels,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to fetch hotels:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch hotels' },
      { status: 500 },
    );
  }
}
