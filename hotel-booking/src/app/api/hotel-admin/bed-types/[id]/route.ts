import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

/**
 * DELETE /api/hotel-admin/bed-types/[id]
 * Only hotel-specific custom bed types (bed_type.hotel_id = payload.hotel_id) can be deleted.
 * Global default bed types (is_default = true) cannot be deleted by hotel admin.
 * Blocked if the bed type is currently assigned to any room type (room_bed_types).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!
    const { id } = await params
    const bedTypeId = parseInt(id)

    if (isNaN(bedTypeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const bedType = await prisma.bed_types.findUnique({
      where: { id: bedTypeId },
      include: {
        _count: { select: { room_bed_types: true } },
      },
    })

    if (!bedType) {
      return NextResponse.json({ success: false, message: 'Bed type not found' }, { status: 404 })
    }

    // Hotel admin can only delete their own hotel-specific bed types
    if (bedType.hotel_id !== hotelId) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete global default bed types or bed types from another hotel' },
        { status: 403 }
      )
    }

    if (bedType._count.room_bed_types > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete — this bed type is currently used by ${bedType._count.room_bed_types} room type(s). Remove it from those room types first.`,
        },
        { status: 409 }
      )
    }

    await prisma.bed_types.delete({ where: { id: bedTypeId } })
    return NextResponse.json({ success: true, message: 'Custom bed type deleted' })
  } catch (error) {
    console.error('Failed to delete bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
