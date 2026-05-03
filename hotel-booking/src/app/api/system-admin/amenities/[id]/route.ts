import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateAmenitySchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

// ─── PATCH /api/system-admin/amenities/[id] ───────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const amenityId = parseInt(id)
    if (isNaN(amenityId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    const result = updateAmenitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const amenityExists = await prisma.amenities.findUnique({ where: { id: amenityId } })
    if (!amenityExists) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 })
    }

    // System admins can only edit global default amenities
    if (!amenityExists.is_default || amenityExists.hotel_id !== null) {
      return NextResponse.json(
        { success: false, message: 'Cannot edit hotel-specific amenities' },
        { status: 403 }
      )
    }

    const updatedAmenity = await prisma.amenities.update({
      where: { id: amenityId },
      data: result.data,
    })

    return NextResponse.json({ success: true, message: 'Amenity updated', data: updatedAmenity })
  } catch (error) {
    console.error('Failed to update amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/system-admin/amenities/[id] ──────────────────────────────
// Only global default amenities can be deleted by system admin.
// Deactivates if in use by hotel_amenities or room_properties; hard deletes otherwise.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

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

    if (!amenity.is_default || amenity.hotel_id !== null) {
      return NextResponse.json(
        { success: false, message: 'Only global default amenities can be deleted via this endpoint' },
        { status: 403 }
      )
    }

    const usageCount = amenity._count.hotel_amenities + amenity._count.room_properties
    if (usageCount > 0) {
      // In use — deactivate rather than delete to preserve FK integrity
      await prisma.amenities.update({
        where: { id: amenityId },
        data: { is_active: false },
      })
      return NextResponse.json({
        success: true,
        message: `Amenity deactivated. It is in use by ${usageCount} hotel(s)/room type(s) and cannot be permanently deleted.`,
      })
    }

    // Not in use — hard delete
    await prisma.amenities.delete({ where: { id: amenityId } })
    return NextResponse.json({ success: true, message: 'Amenity deleted permanently' })
  } catch (error) {
    console.error('Failed to delete amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
