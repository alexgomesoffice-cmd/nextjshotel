import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateAmenitySchema } from '@/lib/validations/metadata'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const amenityId = parseInt(id)

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
        return NextResponse.json({ success: false, message: 'Cannot edit hotel-specific amenities' }, { status: 403 })
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
