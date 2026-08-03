import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/hotel-admin/hotel
 * Full live snapshot for the Property page — everything Hotel Admin can
 * view/propose changes to. There is no PATCH here anymore: every one of
 * these fields is reviewed content now, staged via
 * POST /api/hotel-admin/cases/stage instead of written directly.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      include: {
        city: { select: { id: true, name: true } },
        hotel_type: { select: { id: true, name: true } },
        detail: true,
        images: { orderBy: { sort_order: 'asc' } },
        hotel_amenities: { include: { amenity: { select: { id: true, name: true, icon: true } } } },
        owner_detail: { include: { images: true } },
        hotel_admin: { include: { detail: true, images: true } },
        documents: true,
        policies: { where: { deleted_at: null }, orderBy: { created_at: 'asc' } },
      },
    })

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: hotel })
  } catch (error) {
    console.error('Failed to fetch hotel details:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}