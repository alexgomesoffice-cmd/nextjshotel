import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const updateSchema = z.object({
  is_cover: z.boolean().optional(),
  sort_order: z.number().optional()
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, imageId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)
    const imageId = parseInt(resolvedParams.imageId)

    if (isNaN(roomId) || isNaN(imageId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_type: true }
    })

    if (!room || room.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    const image = await prisma.room_images.findUnique({ where: { id: imageId } })
    if (!image || image.room_detail_id !== roomId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ success: false, message: 'Validation error' }, { status: 400 })

    const updates: { is_cover?: boolean; sort_order?: number } = {}
    if (result.data.is_cover === true) {
      await prisma.room_images.updateMany({
        where: { room_detail_id: roomId },
        data: { is_cover: false }
      })
      updates.is_cover = true
    }
    if (result.data.sort_order !== undefined) updates.sort_order = result.data.sort_order

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, imageId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const resolvedParams = await params
    const roomId = parseInt(resolvedParams.id)
    const imageId = parseInt(resolvedParams.imageId)

    if (isNaN(roomId) || isNaN(imageId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const room = await prisma.room_details.findUnique({
      where: { id: roomId },
      include: { room_type: true }
    })

    if (!room || room.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 })
    }

    const image = await prisma.room_images.findUnique({ where: { id: imageId } })
    if (!image || image.room_detail_id !== roomId) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    // Delete file from disk
    try {
      const filepath = path.join(process.cwd(), 'public', image.image_url)
      await fs.unlink(filepath)
    } catch (e) {
      console.warn('Could not delete image file:', e)
    }

    await prisma.room_images.delete({ where: { id: imageId } })

    if (image.is_cover) {
      const next = await prisma.room_images.findFirst({
        where: { room_detail_id: roomId },
        orderBy: { sort_order: 'asc' }
      })
      if (next) await prisma.room_images.update({ where: { id: next.id }, data: { is_cover: true } })
    }

    return NextResponse.json({ success: true, message: 'Deleted' })
  } catch (error) {
    console.error('Delete room image error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
