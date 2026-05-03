import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/public/amenities
 * No auth. Returns all global default amenities grouped by context.
 * Query params:
 *   context? = 'HOTEL' | 'ROOM'  → filter to one context only
 *   flat?    = '1'               → return flat array instead of grouped object
 * Used by: hotel detail pages, room type detail pages, hotel creation form amenity checklist
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contextFilter = searchParams.get('context') as 'HOTEL' | 'ROOM' | null
    const flat = searchParams.get('flat') === '1'

    const where: {
      is_default: boolean
      hotel_id: null
      is_active: boolean
      context?: 'HOTEL' | 'ROOM'
    } = {
      is_default: true,
      hotel_id: null,
      is_active: true,
    }

    if (contextFilter && (contextFilter === 'HOTEL' || contextFilter === 'ROOM')) {
      where.context = contextFilter
    }

    const amenities = await prisma.amenities.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        context: true,
        is_active: true,
      },
    })

    if (flat) {
      return NextResponse.json({ success: true, data: amenities })
    }

    // Grouped by context
    const grouped = {
      HOTEL: amenities.filter((a) => a.context === 'HOTEL'),
      ROOM: amenities.filter((a) => a.context === 'ROOM'),
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error) {
    console.error('Failed to fetch public amenities:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch amenities' },
      { status: 500 }
    )
  }
}
