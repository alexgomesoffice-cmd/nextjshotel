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
      include: { room_details: { select: { price: true } } },
      orderBy: { name: 'asc' },
    })

    const data = roomTypes.map((rt: (typeof roomTypes)[number]) => {
      const prices = rt.room_details.map((r) => parseFloat(r.price.toString()))
      return {
        id: rt.id,
        name: rt.name,
        is_active: rt.is_active,
        room_count: rt.room_details.length,
        min_price: prices.length ? Math.min(...prices) : null,
        max_price: prices.length ? Math.max(...prices) : null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch hotel rooms:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}