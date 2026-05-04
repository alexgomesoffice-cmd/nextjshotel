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
    const bedTypeId = parseInt(resolvedParams.id)

    if (isNaN(bedTypeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const bedType = await prisma.bed_types.findUnique({
      where: { id: bedTypeId }
    })

    if (!bedType) {
      return NextResponse.json({ success: false, message: 'Bed type not found' }, { status: 404 })
    }

    // Hotel admins can only delete their custom bed types
    if (bedType.hotel_id !== hotelId || bedType.is_default) {
      return NextResponse.json({ success: false, message: 'Forbidden. Cannot delete global defaults or bed types belonging to other hotels.' }, { status: 403 })
    }

    // Soft delete
    await prisma.bed_types.update({
      where: { id: bedTypeId },
      data: { is_active: false }
    })

    return NextResponse.json({ success: true, message: 'Bed type deleted (deactivated)' })
  } catch (error) {
    console.error('Failed to delete bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
