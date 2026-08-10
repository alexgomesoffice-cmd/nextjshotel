import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/hotel-admin/room-facilities
 * Fully global, System-Admin-owned list (AC, Non-Smoking, Balcony, etc.) —
 * Hotel Admin only selects from this when configuring a room variant.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const facilities = await prisma.room_facilities.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: facilities })
  } catch (error) {
    console.error('Failed to fetch room facilities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}