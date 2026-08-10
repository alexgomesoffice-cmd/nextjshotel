import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const addBedTypeSchema = z.object({
  name: z.string().min(2).max(100)
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    // bed_types is fully global (System-Admin-owned) — no hotel_id/is_default
    // columns exist on it anymore, so there's nothing to filter by hotel.
    const bedTypes = await prisma.bed_types.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: bedTypes })
  } catch (error) {
    console.error('Failed to fetch bed types:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Bed types are global and managed by the System Admin. Use POST /api/hotel-admin/master-data-requests (category: BED_TYPE) to request a new one.' },
    { status: 410 }
  )
}