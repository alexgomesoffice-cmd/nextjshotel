import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getLatestCase, discardCase } from '@/lib/case-engine'

/**
 * GET /api/hotel-admin/cases
 * Returns the hotel's most recent case (DRAFTING/PENDING/APPROVED/REJECTED),
 * with every staged field change — or null if none exists yet.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, data: { currentCase } })
  } catch (error) {
    console.error('Failed to fetch current case:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/hotel-admin/cases
 * Discards the open DRAFTING case (all staged, unsubmitted changes).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    await discardCase(hotelId)
    return NextResponse.json({ success: true, message: 'Draft discarded' })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 400 })
  }
}