import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const amenityId = parseInt(resolvedParams.id)

    if (isNaN(amenityId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const amenity = await prisma.amenities.findUnique({
      where: { id: amenityId }
    })

    if (!amenity) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 })
    }

    // Hotel admins can only delete their custom amenities
    if (amenity.hotel_id !== hotelId || amenity.is_default) {
      return NextResponse.json({ success: false, message: 'Forbidden. Cannot delete global defaults or amenities belonging to other hotels.' }, { status: 403 })
    }

    // Since it's hotel custom, we can either soft delete or hard delete. 
    // Soft delete is safer if it's attached to room types or hotel.
    await prisma.amenities.update({
      where: { id: amenityId },
      data: { is_active: false }
    })

    return NextResponse.json({ success: true, message: 'Amenity deleted (deactivated)' })
  } catch (error) {
    console.error('Failed to delete amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
