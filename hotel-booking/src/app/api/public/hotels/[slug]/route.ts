import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Hotel slug is required' },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotels.findUnique({
      where: { 
        slug,
        approval_status: 'PUBLISHED',
        deleted_at: null
      },
      include: {
        city: true,
        hotel_type: true,
        detail: true,
        images: {
          orderBy: { sort_order: 'asc' }
        },
        hotel_amenities: {
          include: {
            amenity: true
          }
        },
        custom_amenities: {
          where: { is_active: true }
        },
        room_types: {
          where: { is_active: true },
          include: {
            room_details: {
              where: { 
                status: 'AVAILABLE',
                deleted_at: null
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

    return NextResponse.json({ success: true, data: hotel });

  } catch (error) {
    console.error('Failed to fetch hotel details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch hotel details' },
      { status: 500 }
    );
  }
}
