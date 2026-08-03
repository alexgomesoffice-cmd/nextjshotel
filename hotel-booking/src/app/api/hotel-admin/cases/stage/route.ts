import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { stageFieldChange, getLatestCase } from '@/lib/case-engine'
import { z } from 'zod'

const changeSchema = z.object({
  entityType: z.string(),
  entityId: z.number().nullable(),
  fieldName: z.string().nullable(),
  previousValue: z.any(),
  proposedValue: z.any(),
})

const bodySchema = z.object({
  changes: z.array(changeSchema).min(1),
})

/**
 * POST /api/hotel-admin/cases/stage
 * Stages one or more field changes into the hotel's open DRAFTING case
 * (creating it if needed). Rejects if a case is currently PENDING review.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const body = await req.json()
    const result = bodySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    for (const change of result.data.changes) {
      await stageFieldChange({
        hotelId,
        hotelAdminId,
        entityType: change.entityType,
        entityId: change.entityId,
        fieldName: change.fieldName,
        previousValue: change.previousValue,
        proposedValue: change.proposedValue,
      })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Saved to draft', data: { currentCase } })
  } catch (error: any) {
    console.error('Failed to stage changes:', error)
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 400 })
  }
}