import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string; roomTypeId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id, roomTypeId } = await params
    const hotelIdNumber = parseInt(id)
    const roomTypeIdNumber = parseInt(roomTypeId)
    if (isNaN(hotelIdNumber) || isNaN(roomTypeIdNumber)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const roomType = await prisma.room_types.findFirst({
      where: { id: roomTypeIdNumber, hotel_id: hotelIdNumber },
      include: {
        hotel: { select: { id: true, name: true } },
        type_images: { orderBy: { sort_order: 'asc' } },
        room_variants: {
          include: {
            facilities: { include: { facility: true } },
            bed_types: { include: { bed_type: true } },
            variant_images: { orderBy: { sort_order: 'asc' } },
            room_details: { where: { deleted_at: null }, select: { id: true, room_number: true, floor: true, status: true } },
            pricing_rules: { orderBy: { end_date: 'asc' } },
          },
          orderBy: { price: 'asc' },
        },
      },
    })

    if (!roomType) {
      return NextResponse.json({ success: false, message: 'Room type not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: roomType })
  } catch (error) {
    console.error('Failed to fetch room type details:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
