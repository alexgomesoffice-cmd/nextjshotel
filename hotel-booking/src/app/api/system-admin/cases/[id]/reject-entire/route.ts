import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { rejectEntireCase } from '@/lib/case-engine'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }
const schema = z.object({ reason: z.string().min(1, 'Rejection reason is required') })

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const caseId = parseInt(id)
    if (isNaN(caseId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const result = schema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 })
    }

    const c = await prisma.cases.findUnique({ where: { id: caseId } })
    if (!c) return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 })
    if (c.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: 'Case has already been decided' }, { status: 400 })
    }

    await rejectEntireCase(caseId, result.data.reason, auth.payload.actor_id)

    return NextResponse.json({ success: true, message: 'Case rejected' })
  } catch (error) {
    console.error('Failed to reject case:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}