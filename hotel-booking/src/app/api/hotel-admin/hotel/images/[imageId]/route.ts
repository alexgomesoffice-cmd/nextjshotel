import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { stageFieldChange, getLatestCase } from '@/lib/case-engine'

/**
 * DELETE /api/hotel-admin/hotel/images/[imageId]
 * Proposes removal of a live gallery photo — stages it into the draft case
 * rather than deleting immediately. The photo stays live until approved.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const resolvedParams = await params
    const imageId = parseInt(resolvedParams.imageId)
    if (isNaN(imageId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const image = await prisma.hotel_images.findUnique({ where: { id: imageId } })
    if (!image || image.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    if (body.is_cover !== true && body.is_cover !== false) {
      return NextResponse.json({ success: false, message: 'Invalid cover flag' }, { status: 400 })
    }

    try {
      await stageFieldChange({
        hotelId,
        hotelAdminId,
        entityType: 'HOTEL_IMAGE',
        entityId: imageId,
        fieldName: 'is_cover',
        previousValue: image.is_cover,
        proposedValue: body.is_cover,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e.message || 'Failed to stage cover update' }, { status: 400 })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Cover proposal staged — pending review', data: { currentCase } })
  } catch (error) {
    console.error('Patch image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })
    const resolvedParams = await params
    const imageId = parseInt(resolvedParams.imageId)

    if (isNaN(imageId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const image = await prisma.hotel_images.findUnique({ where: { id: imageId } })
    if (!image || image.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    try {
      await stageFieldChange({
        hotelId,
        hotelAdminId,
        entityType: 'HOTEL_IMAGE',
        entityId: imageId,
        fieldName: 'deleted',
        previousValue: image.image_url,
        proposedValue: true,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e.message || 'Failed to stage removal' }, { status: 400 })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Removal proposed — pending review', data: { currentCase } })
  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}