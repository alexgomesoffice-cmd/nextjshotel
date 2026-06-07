import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const hotelTypesStr = searchParams.get('hotel_types');
    const roomTypesStr = searchParams.get('room_types');
    const bedTypesStr = searchParams.get('bed_types');
    const starsStr = searchParams.get('stars');
    const amenitiesStr = searchParams.get('amenities');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const guests = searchParams.get('guests');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build the query conditions
    const where: any = {
      approval_status: 'PUBLISHED',
      deleted_at: null,
    };

    // Location filter
    if (location) {
      const parts = location.split(',').map((p) => p.trim());
      const locStr = parts[0];
      where.OR = [
        { name: { contains: locStr } },
        { address: { contains: locStr } },
        { city: { name: { contains: locStr } } },
      ];
    }

    // Hotel type filter
    if (hotelTypesStr) {
      const types = hotelTypesStr.split(',').map((t) => t.trim()).filter(Boolean);
      where.hotel_type = { name: { in: types } };
    }

    // Room type and bed type filtering
    if (roomTypesStr || bedTypesStr) {
      const roomTypeConditions: any = {};
      if (roomTypesStr) {
        const types = roomTypesStr.split(',').map((t) => t.trim()).filter(Boolean);
        roomTypeConditions.name = { in: types };
      }
      if (bedTypesStr) {
        const beds = bedTypesStr.split(',').map((t) => t.trim()).filter(Boolean);
        roomTypeConditions.room_bed_types = {
          some: { bed_type: { name: { in: beds } } },
        };
      }
      where.room_types = { some: roomTypeConditions };
    }

    // Star rating filter
    if (starsStr) {
      const stars = starsStr.split(',').map(Number).filter(Boolean);
      where.detail = { star_rating: { in: stars } };
    }

    // Amenities filter (by amenity id)
    if (amenitiesStr) {
      const amenityIds = amenitiesStr.split(',').map(Number).filter(Boolean);
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { hotel_amenities: { some: { amenity_id: { in: amenityIds } } } },
          { room_types: { some: { room_type_amenities: { some: { amenity_id: { in: amenityIds } } } } } }
        ]
      });
    }

    // Price range filter — on room_types base_price
    if (minPrice || maxPrice) {
      const priceCondition: any = {};
      if (minPrice) priceCondition.gte = Number(minPrice);
      if (maxPrice) priceCondition.lte = Number(maxPrice);
      where.room_types = {
        ...where.room_types,
        some: {
          ...(where.room_types?.some || {}),
          base_price: priceCondition,
        },
      };
    }

    // Guests filter — at least one room type must accommodate them
    if (guests) {
      const guestCount = parseInt(guests);
      where.room_types = {
        ...where.room_types,
        some: {
          ...(where.room_types?.some || {}),
          max_occupancy: { gte: guestCount },
        },
      };
    }

    // Sort order
    let orderBy: any = { created_at: 'desc' };
    if (sort === 'price_asc') orderBy = { room_types: { _min: { base_price: 'asc' } } };
    if (sort === 'price_desc') orderBy = { room_types: { _min: { base_price: 'desc' } } };
    if (sort === 'rating') orderBy = { detail: { guest_rating: 'desc' } };

    // Run count and data fetch in parallel
    const [total, hotels] = await Promise.all([
      prisma.hotels.count({ where }),
      prisma.hotels.findMany({
        where,
        include: {
          city: true,
          hotel_type: true,
          images: {
            where: { is_cover: true },
            take: 1,
          },
          detail: true,
          room_types: {
            where: { is_active: true },
            select: { base_price: true },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    // Format response
    const formattedHotels = hotels.map((hotel) => {
      const startingPrice =
        hotel.room_types.length > 0
          ? Math.min(...hotel.room_types.map((rt) => Number(rt.base_price)))
          : null;

      return {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        city: hotel.city?.name,
        hotel_type: hotel.hotel_type?.name,
        star_rating: hotel.detail?.star_rating ? Number(hotel.detail.star_rating) : null,
        guest_rating: hotel.detail?.guest_rating ? Number(hotel.detail.guest_rating) : null,
        cover_image: hotel.images[0]?.image_url || null,
        short_description: hotel.detail?.short_description,
        starting_price: startingPrice,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedHotels,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch hotels:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}
