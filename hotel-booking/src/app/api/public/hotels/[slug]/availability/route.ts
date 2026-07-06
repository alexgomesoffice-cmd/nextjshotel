import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupRoomVariants } from '@/lib/room-grouping';

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
      return NextResponse.json(
        { success: false, message: 'Hotel slug is required' },
        { status: 400 }
      );
    }

    // Validate date range: not more than 1 year from today
    if (checkIn && checkOut) {
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      const maxAllowed = new Date();
      maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);
      if (!isNaN(ci.getTime()) && ci > maxAllowed) {
        return NextResponse.json(
          { success: false, message: 'Check-in date cannot be more than 1 year from today' },
          { status: 400 }
        );
      }
      if (!isNaN(co.getTime()) && co > maxAllowed) {
        return NextResponse.json(
          { success: false, message: 'Check-out date cannot be more than 1 year from today' },
          { status: 400 }
        );
      }
    }

    // Build room detail where clause for availability filtering
    const buildRoomDetailWhere = () => {
      return { status: 'AVAILABLE' as const, deleted_at: null };
    };

    const hotel = await prisma.hotels.findUnique({
      where: {
        slug,
        approval_status: 'PUBLISHED',
        deleted_at: null
      },
      include: {
        room_types: {
          where: { is_active: true },
          include: {
            room_details: {
              where: buildRoomDetailWhere(),
              include: {
                room_images: {
                  orderBy: { sort_order: 'asc' }
                },
                room_trackers: {
                  where: {
                    status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
                    ...(checkIn && checkOut
                      ? {
                          check_in: { lt: new Date(checkOut) },
                          check_out: { gt: new Date(checkIn) },
                        }
                      : {}),
                  },
                  select: {
                    status: true,
                    check_in: true,
                    check_out: true,
                  },
                },
              }
            },
            type_images: {
              orderBy: { sort_order: 'asc' }
            },
            room_bed_types: {
              include: {
                bed_type: true
              }
            },
            room_properties: {
              include: {
                amenity: true
              }
            }
          }
        }
      }
    });

    if (!hotel) {
      return NextResponse.json(
        { success: false, message: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const roomTypes = hotel.room_types.map((room) => {
      const room_variants = groupRoomVariants(room.room_details, { checkIn, checkOut })
      const available_rooms_count = room_variants.reduce((sum, variant) => sum + variant.available_count, 0)
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        base_price: Number(room.base_price),
        max_occupancy: room.max_occupancy,
        room_size: room.room_size,
        type_images: room.type_images,
        room_bed_types: room.room_bed_types,
        room_properties: room.room_properties,
        available_rooms_count,
        room_variants,
      }
    });

    return NextResponse.json({
      success: true,
      data: roomTypes
    });

  } catch (error) {
    console.error('Availability API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}