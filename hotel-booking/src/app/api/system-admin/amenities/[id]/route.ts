import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateAmenitySchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

// ─── PATCH /api/system-admin/amenities/[id] ───────────────────────────────
// Amenities are fully global now — every row is editable by System Admin,
// there's no more "is this a hotel-specific one" check needed. If name or
// context changes, re-checks the [name, context] uniqueness constraint. {new one}
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
        { status: 400 },
      )
    }

    const amenityExists = await prisma.amenities.findUnique({ where: { id: amenityId } })
    if (!amenityExists) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 })
    }

    const nextName = result.data.name ?? amenityExists.name
    const nextContext = result.data.context ?? amenityExists.context

    if (nextName !== amenityExists.name || nextContext !== amenityExists.context) {
      const duplicate = await prisma.amenities.findFirst({
        where: { name: { equals: nextName }, context: nextContext, id: { not: amenityId } },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `An amenity named "${nextName}" already exists for ${nextContext.toLowerCase()} context.` },
          { status: 409 },
        )
      }
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
// Deactivates if in use (by hotel_amenities or room_type_amenities);
// hard deletes otherwise. No more is_default/hotel_id gate — every amenity
// is System-Admin-owned now, so any of them can be deleted this way.
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
        _count: { select: { hotel_amenities: true, room_type_amenities: true } },
      },
    })

    if (!amenity) {
      return NextResponse.json({ success: false, message: 'Amenity not found' }, { status: 404 })
    }

    const usageCount = amenity._count.hotel_amenities + amenity._count.room_type_amenities
    if (usageCount > 0) {
      await prisma.amenities.update({ where: { id: amenityId }, data: { is_active: false } })
      return NextResponse.json({
        success: true,
        message: `Amenity deactivated. It is in use by ${usageCount} hotel(s)/room type(s) and cannot be permanently deleted.`,
      })
    }

    await prisma.amenities.delete({ where: { id: amenityId } })
    return NextResponse.json({ success: true, message: 'Amenity deleted permanently' })
  } catch (error) {
    console.error('Failed to delete amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}