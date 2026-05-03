import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

/**
 * DELETE /api/hotel-admin/amenities/[id]
 * Only hotel-specific custom amenities (amenity.hotel_id = payload.hotel_id) can be deleted.
 * Global default amenities (is_default = true) cannot be deleted by hotel admin.
 * Blocked if the amenity is currently assigned to any room type (room_properties).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!
    const { id } = await params
    const amenityId = parseInt(id)

    if (isNaN(amenityId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const amenity = await prisma.amenities.findUnique({
      where: { id: amenityId },
      include: {
        _count: {
          select: {
            hotel_amenities: true,
            room_properties: true,
          },
        },
      },
    })

    if (!amenity) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 })
    }

    // Hotel admin can only delete their own hotel-specific amenities
    if (amenity.hotel_id !== hotelId) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete global default amenities or amenities from another hotel' },
        { status: 403 }
      )
    }

    const usageCount = amenity._count.hotel_amenities + amenity._count.room_properties
    if (usageCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete — this amenity is currently in use by ${usageCount} hotel or room type configuration(s). Remove it from those first.`,
        },
        { status: 409 }
      )
    }

    await prisma.amenities.delete({ where: { id: amenityId } })
    return NextResponse.json({ success: true, message: 'Custom amenity deleted' })
  } catch (error) {
    console.error('Failed to delete amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
