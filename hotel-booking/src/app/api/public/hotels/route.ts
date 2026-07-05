import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function buildRoomDetailWhere(checkIn?: string | null, checkOut?: string | null) {
  const base: Record<string, unknown> = { status: 'AVAILABLE', deleted_at: null };
  if (checkIn && checkOut) {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
      (base as Record<string, unknown>).room_trackers = {
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

    const where: Record<string, unknown> = { approval_status: 'PUBLISHED', deleted_at: null };

    if (location) {
      const locStr = location.split(',')[0].trim();
      (where as Record<string, unknown>).OR = [
        { name:    { contains: locStr } },
        { address: { contains: locStr } },
        { city:    { name: { contains: locStr } } },
      ];
    }
    if (hotelTypesStr) {
      (where as Record<string, unknown>).hotel_type = { name: { in: hotelTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) } };
    }
    if (roomTypesStr || bedTypesStr) {
      const rtc: Record<string, unknown> = {};
      if (roomTypesStr) rtc.name = { in: roomTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) };
      if (bedTypesStr)  rtc.room_bed_types = { some: { bed_type: { name: { in: bedTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) } } } };
      (where as Record<string, unknown>).room_types = { some: rtc };
    }
    if (starsStr) {
      where.detail = { star_rating: { in: starsStr.split(',').map(Number).filter(Boolean) } };
    }
    if (amenitiesStr) {
      const amenityIds = amenitiesStr.split(',').map(Number).filter(Boolean);
      const existingAnd = ((where as Record<string, unknown>)['AND'] as Array<Record<string, unknown>> | undefined) ?? [];
      existingAnd.push({
        OR: [
          { hotel_amenities: { some: { amenity_id: { in: amenityIds } } } },
          { room_types: { some: { room_properties: { some: { amenity_id: { in: amenityIds } } } } } },
        ],
      });
      (where as Record<string, unknown>)['AND'] = existingAnd;
    }
    if (minPrice || maxPrice) {
      const pc: Record<string, number> = {};
      if (minPrice) pc.gte = Number(minPrice);
      if (maxPrice) pc.lte = Number(maxPrice);
      const existingRoomTypes = ((where as Record<string, unknown>)['room_types'] as Record<string, unknown> | undefined) ?? {};
      const existingSome = ((existingRoomTypes as Record<string, unknown>)['some'] as Record<string, unknown> | undefined) ?? {};
      (where as Record<string, unknown>)['room_types'] = { ...existingRoomTypes, some: { ...existingSome, base_price: pc } };
    }
    if (guests) {
      const g = parseInt(guests);
      const existingRoomTypes = ((where as Record<string, unknown>)['room_types'] as Record<string, unknown> | undefined) ?? {};
      const existingSome = ((existingRoomTypes as Record<string, unknown>)['some'] as Record<string, unknown> | undefined) ?? {};
      (where as Record<string, unknown>)['room_types'] = { ...existingRoomTypes, some: { ...existingSome, max_occupancy: { gte: g } } };
    }

    let orderBy: Record<string, unknown> | undefined = { created_at: 'desc' };
    const isPriceSort = sort === 'price_asc' || sort === 'price_desc';
    if (isPriceSort) orderBy = undefined; // We will sort in memory
    if (sort === 'rating') orderBy = { detail: { guest_rating: 'desc' } };

    const roomTypesInclude = includeRooms
      ? {
          where:  { is_active: true },
          take:   4,
          select: {
            id:            true,
            name:          true,
            base_price:    true,
            max_occupancy: true,
            room_size:     true,
            type_images: {
              where:  { is_cover: true },
              take:   1,
              select: { image_url: true },
            },
            room_bed_types: {
              select: { count: true, bed_type: { select: { name: true } } },
            },
            room_details: {
              where:  buildRoomDetailWhere(checkIn, checkOut),
              select: { id: true },
            },
          },
        }
      : { where: { is_active: true }, select: { base_price: true } };

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
        skip: isPriceSort ? undefined : skip,
        take: isPriceSort ? undefined : limit,
        orderBy,
      }),
    ]);

    let hotels = allHotelsOrPage;

    if (isPriceSort) {
      hotels.sort((a, b) => {
        const rtsA = a.room_types as Array<Record<string, unknown>>;
        const rtsB = b.room_types as Array<Record<string, unknown>>;
        const priceA = rtsA.length > 0 ? Math.min(...rtsA.map((rt) => Number(String(rt.base_price)))) : Infinity;
        const priceB = rtsB.length > 0 ? Math.min(...rtsB.map((rt) => Number(String(rt.base_price)))) : Infinity;
        return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
      });
      hotels = hotels.slice(skip, skip + limit);
    }

    const formattedHotels = hotels.map((hotel) => {
      const rts = hotel.room_types as Array<Record<string, unknown>>;
      const startingPrice = rts.length > 0
        ? Math.min(...rts.map((rt) => Number(String(rt.base_price))))
        : null;

      const base = {
        id:                hotel.id,
        name:              hotel.name,
        slug:              hotel.slug,
        city:              hotel.city?.name,
        hotel_type:        hotel.hotel_type?.name,
        star_rating:       hotel.detail?.star_rating  ? Number(hotel.detail.star_rating)  : null,
        guest_rating:      hotel.detail?.guest_rating ? Number(hotel.detail.guest_rating) : null,
        cover_image:       hotel.images[0]?.image_url || null,
        starting_price:    startingPrice,
        address:           hotel.address,
        amenities:         (hotel.hotel_amenities || []).slice(0, 3).map((ha) => String(((ha as Record<string, unknown>).amenity as Record<string, unknown>).name)),
      };

      if (!includeRooms) return base;

      const room_types = rts.map((rt) => {
        const rtRec = rt as Record<string, unknown>;
        const roomBedTypes = ((rtRec.room_bed_types as Array<Record<string, unknown>> | undefined) ?? []);
        return {
          id:              rtRec.id,
          name:            rtRec.name,
          base_price:      Number(String(rtRec.base_price)),
          max_occupancy:   rtRec.max_occupancy,
          room_size:       (rtRec.room_size as string) ?? null,
          cover_image:     ((rtRec.type_images as Array<Record<string, unknown>> | undefined)?.[0] as Record<string, unknown> | undefined)?.image_url ?? null,
          bed_types:       roomBedTypes.map((rbt) => ({
            name:  String(((rbt as Record<string, unknown>).bed_type as Record<string, unknown>).name),
            count: (rbt as Record<string, unknown>).count,
          })),
          available_count: (((rtRec.room_details as Array<unknown> | undefined) ?? [])).length,
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
    return NextResponse.json({ success: false, message: 'Failed to fetch hotels' }, { status: 500 });
  }
}
