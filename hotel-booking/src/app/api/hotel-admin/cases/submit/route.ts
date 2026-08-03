import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { submitCase, getLatestCase } from '@/lib/case-engine'

/**
 * POST /api/hotel-admin/cases/submit
 * Flips the open DRAFTING case to PENDING, locking further edits until the
 * System Admin decides it.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    await submitCase(hotelId)
    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Submitted for review', data: { currentCase } })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 400 })
  }
}