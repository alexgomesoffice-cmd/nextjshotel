import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string, imageId: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)
    const imageId = parseInt(resolvedParams.imageId)

    if (isNaN(roomTypeId) || isNaN(imageId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const roomType = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const image = await prisma.room_images.findUnique({
      where: { id: imageId }
    })

    if (!image || image.room_type_id !== roomTypeId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    // Delete file from disk
    try {
      const filepath = path.join(process.cwd(), 'public', image.image_url)
      await fs.unlink(filepath)
    } catch (e) {
      console.warn('Could not delete image file from disk:', e)
    }

    // Delete from DB
    await prisma.room_images.delete({ where: { id: imageId } })

    // If it was cover, make another one cover
    if (image.is_cover) {
      const firstAvailable = await prisma.room_images.findFirst({
        where: { room_type_id: roomTypeId },
        orderBy: { sort_order: 'asc' }
      })
      
      if (firstAvailable) {
        await prisma.room_images.update({
          where: { id: firstAvailable.id },
          data: { is_cover: true }
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    console.error('Delete room image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  is_cover: z.boolean().optional(),
  sort_order: z.number().optional()
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string, imageId: string } }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomTypeId = parseInt(resolvedParams.id)
    const imageId = parseInt(resolvedParams.imageId)

    if (isNaN(roomTypeId) || isNaN(imageId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const roomType = await prisma.room_types.findUnique({ where: { id: roomTypeId } })
    if (!roomType || roomType.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    const body = await req.json()
    const result = updateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error' }, { status: 400 })
    }

    const image = await prisma.room_images.findUnique({
      where: { id: imageId }
    })

    if (!image || image.room_type_id !== roomTypeId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    const updates: any = {}

    if (result.data.is_cover === true) {
      // Remove cover from all others
      await prisma.room_images.updateMany({
        where: { room_type_id: roomTypeId },
        data: { is_cover: false }
      })
      updates.is_cover = true
    }

    if (result.data.sort_order !== undefined) {
      updates.sort_order = result.data.sort_order
    }

    if (Object.keys(updates).length > 0) {
      await prisma.room_images.update({
        where: { id: imageId },
        data: updates
      })
    }

    return NextResponse.json({ success: true, message: 'Updated' })
  } catch (error) {
    console.error('Update room image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
