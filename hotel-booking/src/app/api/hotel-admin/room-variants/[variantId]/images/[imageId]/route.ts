import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string; imageId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { variantId, imageId } = await params
    const vId = parseInt(variantId)
    const imgId = parseInt(imageId)
    if (isNaN(vId) || isNaN(imgId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const image = await prisma.room_images.findUnique({
      where: { id: imgId },
      include: { room_variant: { include: { room_type: true } } },
    })
    if (!image || image.room_variant_id !== vId || image.room_variant?.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    await prisma.room_images.delete({ where: { id: imgId } })
    return NextResponse.json({ success: true, message: 'Photo removed' })
  } catch (error) {
    console.error('Delete variant image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}