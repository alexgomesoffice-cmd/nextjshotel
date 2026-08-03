import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { discardSingleField, getLatestCase } from '@/lib/case-engine'

/**
 * DELETE /api/hotel-admin/cases/field-changes/[fcId]
 * Removes one staged field from the open DRAFTING case (the "✕" beside a
 * single row in Draft Center / Property). Not available once submitted.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fcId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const resolvedParams = await params
    const fcId = parseInt(resolvedParams.fcId)
    if (isNaN(fcId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    await discardSingleField(hotelId, fcId)
    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Change discarded', data: { currentCase } })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 400 })
  }
}