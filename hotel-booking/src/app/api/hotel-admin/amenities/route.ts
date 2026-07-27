import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

// ─── GET /api/hotel-admin/amenities ────────────────────────────────────────
// Amenities are fully global now (System-Admin-owned) — Hotel Admin just
// lists what's available to pick from, grouped by context. There is no
// POST here anymore: Hotel Admin can no longer create a custom amenity
// directly. If something's missing, use POST /api/hotel-admin/master-data-requests
// (category: AMENITY) instead.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const amenities = await prisma.amenities.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })

    const grouped = {
      HOTEL: amenities.filter((a) => a.context === 'HOTEL'),
      ROOM: amenities.filter((a) => a.context === 'ROOM'),
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error) {
    console.error('Failed to fetch hotel amenities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}