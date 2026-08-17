import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { fieldLabel } from '@/lib/case-engine'

type Params = { params: Promise<{ id: string }> }

// Full case detail — resolved field diff, supporting documents, hotel info.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const caseId = parseInt(id)
    if (isNaN(caseId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const c = await prisma.cases.findUnique({
      where: { id: caseId },
      include: {
        hotel: { select: { id: true, name: true, city: { select: { name: true } }, documents: true, approval_status: true } },
        submitter: { select: { name: true, email: true } },
        field_changes: { orderBy: { id: 'asc' } },
      },
    })

    if (!c) return NextResponse.json({ success: false, message: 'Case not found' }, { status: 404 })

    const fields = c.field_changes.map((fc: (typeof c.field_changes)[number]) => ({
      id: fc.id,
      entityType: fc.entity_type,
      entityId: fc.entity_id,
      fieldName: fc.field_name,
      label: fc.field_name ? fieldLabel(fc.field_name) : `New ${fc.entity_type.toLowerCase().replace('_', ' ')}`,
      previousValue: fc.previous_value,
      proposedValue: fc.proposed_value,
      status: fc.status,
      rejectionReason: fc.rejection_reason,
    }))

    const amenitiesList = await prisma.amenities.findMany({ select: { id: true, name: true } })
    const amenitiesMap: Record<number, string> = {}
    for (const a of amenitiesList) {
      amenitiesMap[a.id] = a.name
    }

    return NextResponse.json({
      success: true,
      data: {
        id: c.id,
        status: c.status,
        hotel: { id: c.hotel.id, name: c.hotel.name, city: c.hotel.city?.name ?? null, isFirstCase: c.hotel.approval_status === 'UNPUBLISHED' },
        submittedBy: c.submitter.name,
        submittedByEmail: c.submitter.email,
        submittedAt: c.submitted_at,
        updatedAt: c.updated_at,
        fields,
        documents: c.hotel.documents,
        amenitiesMap,
      },
    })
  } catch (error) {
    console.error('Failed to fetch case:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}