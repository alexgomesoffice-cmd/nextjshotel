import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

// Room types no longer carry price/bed config directly (moved to the
// physical room level) — this aggregates room_details per type instead of
// showing one flat BASE PRICE/BED like the old design assumed.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)
    if (isNaN(hotelId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const roomTypes = await prisma.room_types.findMany({
      where: { hotel_id: hotelId },
      include: {
        type_images: { where: { is_cover: true }, take: 1 },
        room_variants: {
          include: {
            _count: {
              select: {
                room_details: { where: { deleted_at: null } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const data = roomTypes.map((rt: (typeof roomTypes)[number]) => {
      const roomCount = rt.room_variants.reduce((sum, variant) => sum + variant._count.room_details, 0)
      const startingPrice = rt.room_variants.length ? Math.min(...rt.room_variants.map((variant) => Number(variant.price))) : null
      return {
        id: rt.id,
        name: rt.name,
        description: rt.description,
        is_active: rt.is_active,
        variant_count: rt.room_variants.length,
        room_count: roomCount,
        starting_price: startingPrice,
        cover_image_url: rt.type_images?.[0]?.image_url ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch hotel rooms:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}