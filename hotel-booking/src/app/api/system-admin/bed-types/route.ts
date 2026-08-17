import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createBedTypeSchema } from '@/lib/validations/metadata'
import { validateFulfillsRequest, markRequestFulfilledTx, notifyRequestFulfilled } from '@/lib/master-data-fulfillment'

// Bed types are fully global now — no is_default/hotel_id, no context.
// Same shape as system-admin/amenities, minus icon/context.

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const where = { name: { contains: search } }

    const [bedTypes, total] = await Promise.all([
      prisma.bed_types.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { room_variant_bed_types: true } } },
      }),
      prisma.bed_types.count({ where }),
    ])

    const data = bedTypes.map((b: (typeof bedTypes)[number]) => ({
      id: b.id,
      name: b.name,
      is_active: b.is_active,
      created_at: b.created_at,
      usage_count: b._count.room_variant_bed_types,
    }))

    return NextResponse.json({
      success: true,
      data: { bedTypes: data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    })
  } catch (error) {
    console.error('Failed to fetch bed types:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createBedTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 },
      )
    }

    const { name, is_active } = result.data
    const existing = await prisma.bed_types.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: `A bed type named "${name}" already exists.` },
        { status: 409 },
      )
    }

    const fulfillsRequestId = typeof body.fulfills_request_id === 'number' ? body.fulfills_request_id : undefined
    const { request, error } = await validateFulfillsRequest(fulfillsRequestId, 'BED_TYPE')
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 })

    const bedType = await prisma.$transaction(async (tx) => {
      const created = await tx.bed_types.create({ data: { name, is_active } })
      if (request) await markRequestFulfilledTx(tx, request.id, auth.payload.actor_id, created.id)
      return created
    })

    if (request) await notifyRequestFulfilled({ id: request.id, requested_by: request.requested_by, category: 'BED_TYPE' }, name)

    return NextResponse.json({ success: true, message: 'Bed type created successfully', data: bedType })
  } catch (error) {
    console.error('Failed to create bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}