import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Accommodation types ───────────────────────────────────────────────────────

interface VariantCapacity {
  max_occupancy: number;
  available_count: number;
}

export interface AccommodationResult {
  requestedGuests:          number;
  requestedRooms:           number | null;
  matchType:                'PRIMARY' | 'SUGGESTED' | 'ALTERNATIVE';
  minimumRoomsRequired:     number | null;
  canAccommodateGuests:     boolean;
  withinRequestedRoomLimit: boolean;
  suggestedMessage:         string;
}

/**
 * Greedy capacity engine.
 * Flattens variant slots into a descending pool, fills greedily until
 * requestedGuests is met, then classifies the result into one of three tiers.
 *
 * requestedRooms = null  →  unbounded (user gave guests but no room limit)
 */
function computeAccommodation(
  variantCapacities: VariantCapacity[],
  requestedGuests:   number,
  requestedRooms:    number | null,
): AccommodationResult {
  // Build pool of individual room slots from each available variant
  const pool: number[] = [];
  for (const v of variantCapacities) {
    if (v.max_occupancy > 0 && v.available_count > 0) {
      for (let i = 0; i < v.available_count; i++) {
        pool.push(v.max_occupancy);
      }
    }
  }

  // Sort descending — largest rooms first (greedy)
  pool.sort((a, b) => b - a);

  const totalCapacity = pool.reduce((s, c) => s + c, 0);

  if (pool.length === 0 || totalCapacity < requestedGuests) {
    return {
      requestedGuests,
      requestedRooms,
      matchType:                'ALTERNATIVE',
      minimumRoomsRequired:     null,
      canAccommodateGuests:     false,
      withinRequestedRoomLimit: false,
      suggestedMessage:         `Can accommodate up to ${totalCapacity} guest${totalCapacity !== 1 ? 's' : ''} on your selected dates.`,
    };
  }

  // Greedy fill
  let cumulative = 0;
  let roomsUsed  = 0;
  for (const cap of pool) {
    if (cumulative >= requestedGuests) break;
    cumulative += cap;
    roomsUsed++;
  }

  const minimumRoomsRequired = roomsUsed;
  const withinLimit = requestedRooms === null || minimumRoomsRequired <= requestedRooms;

  if (withinLimit) {
    const rw = minimumRoomsRequired === 1 ? 'room' : 'rooms';
    const limitNote = requestedRooms !== null
      ? ` · up to ${requestedRooms} ${requestedRooms === 1 ? 'room' : 'rooms'}`
      : '';
    return {
      requestedGuests,
      requestedRooms,
      matchType:                'PRIMARY',
      minimumRoomsRequired,
      canAccommodateGuests:     true,
      withinRequestedRoomLimit: true,
      suggestedMessage:         `Fits your search · ${requestedGuests} guest${requestedGuests !== 1 ? 's' : ''}${limitNote} · ${minimumRoomsRequired} ${rw} needed.`,
    };
  }

  return {
    requestedGuests,
    requestedRooms,
    matchType:                'SUGGESTED',
    minimumRoomsRequired,
    canAccommodateGuests:     true,
    withinRequestedRoomLimit: false,
    suggestedMessage:         `Can accommodate ${requestedGuests} guest${requestedGuests !== 1 ? 's' : ''} with ${minimumRoomsRequired} room${minimumRoomsRequired !== 1 ? 's' : ''} instead of ${requestedRooms}.`,
  };
}

/**
 * Accommodation tier sort order (PRIMARY < SUGGESTED < ALTERNATIVE).
 * Within the same tier, fewer rooms required comes first.
 */
const TIER_ORDER: Record<AccommodationResult['matchType'], number> = {
  PRIMARY:     0,
  SUGGESTED:   1,
  ALTERNATIVE: 2,
};

// ─── Room-detail availability WHERE ───────────────────────────────────────────

function buildRoomDetailWhere(checkIn?: string | null, checkOut?: string | null) {
  const base: Record<string, unknown> = { status: 'AVAILABLE', deleted_at: null };
  if (checkIn && checkOut) {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
      base.room_trackers = {
        none: {
          status:    { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
          check_in:  { lt: co },
          check_out: { gt: ci },
        },
      };
    }
  }
  return base;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

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
    const guestsParam   = searchParams.get('guests');
    const roomsParam    = searchParams.get('rooms');
    const sort          = searchParams.get('sort') || 'newest';
    const page          = parseInt(searchParams.get('page') || '1');
    const limit         = parseInt(searchParams.get('limit') || '12');
    const skip          = (page - 1) * limit;
    const includeRooms  = searchParams.get('include_rooms') === 'true';
    const checkIn       = searchParams.get('check_in');
    const checkOut      = searchParams.get('check_out');
    const hasDates      = !!(checkIn && checkOut);

    // Parse capacity parameters
    const requestedGuests: number | null = guestsParam ? parseInt(guestsParam) : null;
    // null = unbounded (guest supplied no room limit)
    const requestedRooms:  number | null = roomsParam  ? parseInt(roomsParam)  : null;

    // ─── Hotel-level WHERE ────────────────────────────────────────────────────
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
    // NOTE: max_occupancy >= guests is intentionally NOT included here.
    // Guest capacity is now evaluated post-fetch via the greedy capacity engine,
    // which supports multi-room combinations and correct SUGGESTED tier logic.
    if (roomTypesStr || bedTypesStr || minPrice || maxPrice) {
      const roomTypeFilter: Record<string, unknown> = { is_active: true };

      if (roomTypesStr) {
        roomTypeFilter.name = {
          in: roomTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean),
        };
      }

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
    if (isPriceSort) orderBy = undefined;
    if (sort === 'rating') orderBy = { detail: { guest_rating: 'desc' } };

    // Fetch all rows (skip DB pagination) when we need to sort in memory —
    // either for price sort, or when accommodation sort is active.
    const needsMemorySort = isPriceSort || (requestedGuests !== null && includeRooms);

    // ─── Room-types include shape ─────────────────────────────────────────────
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
          where:  { is_active: true },
          select: {
            room_variants: {
              where:  { is_active: true },
              select: { price: true },
            },
          },
        };

    // ─── Query ────────────────────────────────────────────────────────────────
    const [total, allHotels] = await Promise.all([
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
        skip:    needsMemorySort ? undefined : skip,
        take:    needsMemorySort ? undefined : limit,
        orderBy,
      }),
    ]);

    let hotels = allHotels;

    // ─── In-memory price sort (existing behaviour) ────────────────────────────
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
    }

    // ─── Format response ──────────────────────────────────────────────────────
    const formattedHotels = hotels.map((hotel) => {
      const rts = hotel.room_types as Array<Record<string, unknown>>;

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

      if (!includeRooms) return { ...base, accommodation: null };

      // ─── Build room_types array ───────────────────────────────────────────
      // Collect variant capacities for the accommodation engine in the same pass.
      const variantCapacities: VariantCapacity[] = [];

      const room_types = rts.map((rt) => {
        const rtRec    = rt as Record<string, unknown>;
        const variants = (rtRec.room_variants as Array<Record<string, unknown>> | undefined) ?? [];

        const sorted   = [...variants].sort((a, b) => Number(String(a.price)) - Number(String(b.price)));
        const cheapest = sorted[0] as Record<string, unknown> | undefined;

        const bedTypes = cheapest
          ? ((cheapest.bed_types as Array<Record<string, unknown>>) ?? []).map((rbt) => ({
              name:  String(((rbt as Record<string, unknown>).bed_type as Record<string, unknown>).name),
              count: (rbt as Record<string, unknown>).count,
            }))
          : [];

        let availableCount = 0;
        for (const v of variants) {
          const details    = (v.room_details as Array<unknown> | undefined) ?? [];
          const maxOcc     = (v.max_occupancy as number | null) ?? 0;
          const avail      = details.length;
          availableCount  += avail;

          // Feed the capacity engine
          if (maxOcc > 0 && avail > 0) {
            variantCapacities.push({ max_occupancy: maxOcc, available_count: avail });
          }
        }

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

      // ─── Accommodation classification ─────────────────────────────────────
      const accommodation: AccommodationResult | null =
        requestedGuests !== null
          ? computeAccommodation(variantCapacities, requestedGuests, requestedRooms)
          : null;

      return {
        ...base,
        room_types,
        total_room_types: rts.length,
        has_dates:        hasDates,
        accommodation,
      };
    });

    // ─── Accommodation sort (when guests param is present) ────────────────────
    if (requestedGuests !== null && includeRooms) {
      type FormattedHotel = (typeof formattedHotels)[number];

      formattedHotels.sort((a: FormattedHotel, b: FormattedHotel) => {
        const aA = (a as Record<string, unknown>).accommodation as AccommodationResult | null;
        const bA = (b as Record<string, unknown>).accommodation as AccommodationResult | null;

        const aTier = aA ? (TIER_ORDER[aA.matchType] ?? 3) : 3;
        const bTier = bA ? (TIER_ORDER[bA.matchType] ?? 3) : 3;

        if (aTier !== bTier) return aTier - bTier;

        // Within same tier: fewer rooms required first
        const aR = aA?.minimumRoomsRequired ?? Infinity;
        const bR = bA?.minimumRoomsRequired ?? Infinity;
        return aR - bR;
      });
    }

    // ─── Paginate (only needed when we fetched all rows for memory sort) ──────
    const pagedHotels = needsMemorySort
      ? formattedHotels.slice(skip, skip + limit)
      : formattedHotels;

    return NextResponse.json({
      success:    true,
      data:       pagedHotels,
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
