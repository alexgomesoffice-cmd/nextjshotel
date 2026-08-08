import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/hotel-admin/room-types
 * Lists this hotel's own (already-approved, live) room types.
 * Bed types are NOT included here — they live per physical room
 * (room_details), not per room type.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const roomTypes = await prisma.room_types.findMany({
      where: { hotel_id: hotelId, is_active: true },
      include: {
        room_type_amenities: { include: { amenity: true } },
        type_images: { orderBy: { sort_order: 'asc' } },
        _count: { select: { room_details: { where: { deleted_at: null } } } },
      },
      orderBy: { created_at: 'desc' },
    })

    const formatted = roomTypes.map((rt) => {
      const { _count, ...rest } = rt
      return { ...rest, room_count: _count.room_details }
    })

    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    console.error('Fetch room types error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/room-types
 * Disabled — room type creation is no longer a direct write. Use
 * POST /api/hotel-admin/room-types/propose instead, which stages the
 * creation into your draft case for System Admin review (name,
 * description, one photo, room amenities — no price/occupancy, those
 * live on the physical room).
 */
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Room types are created from the Rooms page (New Room Type), not this endpoint. Use POST /api/hotel-admin/room-types/propose.' },
    { status: 410 }
  )
}