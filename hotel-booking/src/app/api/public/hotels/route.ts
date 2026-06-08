import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function buildRoomDetailWhere(checkIn?: string | null, checkOut?: string | null) {
  const base: any = { status: 'AVAILABLE', deleted_at: null };
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

    const where: any = { approval_status: 'PUBLISHED', deleted_at: null };

    if (location) {
      const locStr = location.split(',')[0].trim();
      where.OR = [
        { name:    { contains: locStr } },
        { address: { contains: locStr } },
        { city:    { name: { contains: locStr } } },
      ];
    }
    if (hotelTypesStr) {
      where.hotel_type = { name: { in: hotelTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) } };
    }
    if (roomTypesStr || bedTypesStr) {
      const rtc: any = {};
      if (roomTypesStr) rtc.name = { in: roomTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) };
      if (bedTypesStr)  rtc.room_bed_types = { some: { bed_type: { name: { in: bedTypesStr.split(',').map((t: string) => t.trim()).filter(Boolean) } } } };
      where.room_types = { some: rtc };
    }
    if (starsStr) {
      where.detail = { star_rating: { in: starsStr.split(',').map(Number).filter(Boolean) } };
    }
    if (amenitiesStr) {
      const amenityIds = amenitiesStr.split(',').map(Number).filter(Boolean);
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { hotel_amenities: { some: { amenity_id: { in: amenityIds } } } },
          { room_types: { some: { room_properties: { some: { amenity_id: { in: amenityIds } } } } } },
        ],
      });
    }
    if (minPrice || maxPrice) {
      const pc: any = {};
      if (minPrice) pc.gte = Number(minPrice);
      if (maxPrice) pc.lte = Number(maxPrice);
      where.room_types = { ...where.room_types, some: { ...(where.room_types?.some || {}), base_price: pc } };
    }
    if (guests) {
      const g = parseInt(guests);
      where.room_types = { ...where.room_types, some: { ...(where.room_types?.some || {}), max_occupancy: { gte: g } } };
    }

    let orderBy: any = { created_at: 'desc' };
    if (sort === 'price_asc')  orderBy = { room_types: { _min: { base_price: 'asc'  } } };
    if (sort === 'price_desc') orderBy = { room_types: { _min: { base_price: 'desc' } } };
    if (sort === 'rating')     orderBy = { detail: { guest_rating: 'desc' } };

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

    const [total, hotels] = await Promise.all([
      prisma.hotels.count({ where }),
      prisma.hotels.findMany({
        where,
        include: {
          city:       true,
          hotel_type: true,
          images:     { where: { is_cover: true }, take: 1 },
          detail:     true,
          room_types: roomTypesInclude as any,
        },
        skip,
        take:    limit,
        orderBy,
      }),
    ]);

    const formattedHotels = hotels.map((hotel) => {
      const rts = hotel.room_types as any[];
      const startingPrice = rts.length > 0
        ? Math.min(...rts.map((rt: any) => Number(rt.base_price)))
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
        short_description: hotel.detail?.short_description,
        starting_price:    startingPrice,
      };

      if (!includeRooms) return base;

      const room_types = rts.map((rt: any) => ({
        id:              rt.id,
        name:            rt.name,
        base_price:      Number(rt.base_price),
        max_occupancy:   rt.max_occupancy,
        room_size:       rt.room_size ?? null,
        cover_image:     rt.type_images?.[0]?.image_url ?? null,
        bed_types:       (rt.room_bed_types ?? []).map((rbt: any) => ({
          name:  rbt.bed_type.name,
          count: rbt.count,
        })),
        available_count: rt.room_details?.length ?? 0,
        dates_filtered:  hasDates,
      }));

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
