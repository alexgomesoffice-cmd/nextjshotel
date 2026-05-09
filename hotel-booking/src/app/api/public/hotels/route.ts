import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const checkIn = searchParams.get('check_in');
    const checkOut = searchParams.get('check_out');
    const guests = searchParams.get('guests');
    const roomsCount = searchParams.get('rooms');
    const hotelTypesStr = searchParams.get('hotel_types');
    const roomTypesStr = searchParams.get('room_types');
    const bedTypesStr = searchParams.get('bed_types');

    // Build the query conditions
    const where: any = {
      approval_status: 'PUBLISHED',
      deleted_at: null,
    };

    if (location) {
      // Split location and search in city name or hotel name/address
      const parts = location.split(',').map((p) => p.trim());
      const locStr = parts[0];
      where.OR = [
        { name: { contains: locStr } },
        { address: { contains: locStr } },
        { city: { name: { contains: locStr } } },
      ];
    }

    if (hotelTypesStr) {
      const types = hotelTypesStr.split(',').map((t) => t.trim());
      where.hotel_type = { name: { in: types } };
    }

    // Room type and bed type filtering requires filtering on relations
    if (roomTypesStr || bedTypesStr) {
      const roomTypeConditions: any = {};
      
      if (roomTypesStr) {
        const types = roomTypesStr.split(',').map((t) => t.trim());
        roomTypeConditions.name = { in: types };
      }
      
      if (bedTypesStr) {
        const beds = bedTypesStr.split(',').map((t) => t.trim());
        roomTypeConditions.room_bed_types = {
          some: { bed_type: { name: { in: beds } } },
        };
      }

      where.room_types = { some: roomTypeConditions };
    }

    const hotels = await prisma.hotels.findMany({
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
            select: { base_price: true }
        }
      },
      // Note: Full availability checking using trackers/bookings can be complex and 
      // should ideally be added here based on exact dates & rooms required.
    });

    // Process to format nicely for frontend
    const formattedHotels = hotels.map(hotel => {
        // Calculate starting price
        const startingPrice = hotel.room_types.length > 0 
            ? Math.min(...hotel.room_types.map(rt => Number(rt.base_price)))
            : null;

        return {
            id: hotel.id,
            name: hotel.name,
            slug: hotel.slug,
            city: hotel.city?.name,
            hotel_type: hotel.hotel_type?.name,
            star_rating: hotel.detail?.star_rating,
            guest_rating: hotel.detail?.guest_rating,
            cover_image: hotel.images[0]?.image_url || null,
            short_description: hotel.detail?.short_description,
            starting_price: startingPrice
        }
    });

    return NextResponse.json({ success: true, data: formattedHotels });
  } catch (error) {
    console.error('Failed to fetch hotels:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}
