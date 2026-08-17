import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { notifyHotelAdmin } from '@/lib/notifications'
import { z } from 'zod'

const dismissSchema = z.object({
  reason: z.string().min(1, 'A reason is required').max(2000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const requestId = parseInt(id)
    if (isNaN(requestId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    const result = dismissSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const request = await prisma.master_data_requests.findUnique({ where: { id: requestId } })
    if (!request) return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
    if (request.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: 'This request has already been resolved.' }, { status: 400 })
    }

    const updated = await prisma.master_data_requests.update({
      where: { id: requestId },
      data: {
        status: 'DISMISSED',
        resolved_by: auth.payload.actor_id,
        resolved_at: new Date(),
        resolution_note: result.data.reason,
      },
    })

    await notifyHotelAdmin({
      recipientId: request.requested_by,
      recipientType: 'HOTEL_ADMIN',
      type: 'MASTER_DATA_REQUEST',
      title: 'Master Data Request Dismissed',
      message: `Your request for "${request.name}" was dismissed. Reason: ${result.data.reason}`,
      relatedEntityType: 'MASTER_DATA_REQUEST',
      relatedEntityId: request.id,
    })

    return NextResponse.json({ success: true, message: 'Request dismissed', data: updated })
  } catch (error) {
    console.error('Dismiss master data request error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}