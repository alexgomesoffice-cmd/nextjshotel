import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { approveRemaining } from '@/lib/case-engine'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const caseId = parseInt(id)
    if (isNaN(caseId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const c = await prisma.cases.findUnique({ where: { id: caseId } })
    if (!c) return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 })
    if (c.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: 'Case has already been decided' }, { status: 400 })
    }

    await approveRemaining(caseId, auth.payload.actor_id)

    return NextResponse.json({ success: true, message: 'Remaining changes approved' })
  } catch (error) {
    console.error('Failed to approve case:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}