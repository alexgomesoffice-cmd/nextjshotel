import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { rejectFieldChange } from '@/lib/case-engine'
import { z } from 'zod'

type Params = { params: Promise<{ id: string; fcId: string }> }
const schema = z.object({ reason: z.string().min(1, 'Rejection reason is required') })

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id, fcId } = await params
    const caseId = parseInt(id)
    const fieldChangeId = parseInt(fcId)
    if (isNaN(caseId) || isNaN(fieldChangeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const result = schema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 })
    }

    const fc = await prisma.case_field_changes.findUnique({ where: { id: fieldChangeId } })
    if (!fc || fc.case_id !== caseId) {
      return NextResponse.json({ success: false, message: 'Field change not found' }, { status: 404 })
    }

    await rejectFieldChange(fieldChangeId, result.data.reason, auth.payload.actor_id)

    return NextResponse.json({ success: true, message: 'Field rejected' })
  } catch (error) {
    console.error('Failed to reject field:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}