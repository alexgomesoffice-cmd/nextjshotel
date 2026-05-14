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

    // Build room detail where clause for availability filtering
    const buildRoomDetailWhere = (checkIn?: string | null, checkOut?: string | null) => {
      const where: Record<string, unknown> = { status: 'AVAILABLE', deleted_at: null };
      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
          where.room_trackers = {
            none: {
              status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
              check_in: { lt: checkOutDate },
              check_out: { gt: checkInDate },
            }
          };
        }
      }
      return where;
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
              where: buildRoomDetailWhere(checkIn, checkOut),
              include: {
                room_images: {
                  orderBy: { sort_order: 'asc' }
                }
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
      const room_variants = groupRoomVariants(room.room_details)
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
        available_rooms_count: room.room_details.length,
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