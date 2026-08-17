import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createRoomFacilitySchema } from '@/lib/validations/metadata'
import { validateFulfillsRequest, markRequestFulfilledTx, notifyRequestFulfilled } from '@/lib/master-data-fulfillment'

// Fully global, System-Admin-owned — same shape as bed_types.
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

    const [facilities, total] = await Promise.all([
      prisma.room_facilities.findMany({
        where, skip, take: limit, orderBy: { name: 'asc' },
        include: { _count: { select: { room_variant_facilities: true } } },
      }),
      prisma.room_facilities.count({ where }),
    ])

    const data = facilities.map((f: (typeof facilities)[number]) => ({
      id: f.id, name: f.name, is_active: f.is_active, created_at: f.created_at,
      usage_count: f._count.room_variant_facilities,
    }))

    return NextResponse.json({
      success: true,
      data: { roomFacilities: data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    })
  } catch (error) {
    console.error('Failed to fetch room facilities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createRoomFacilitySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const { name, is_active } = result.data
    const existing = await prisma.room_facilities.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ success: false, message: `A room facility named "${name}" already exists.` }, { status: 409 })
    }

    const fulfillsRequestId = typeof body.fulfills_request_id === 'number' ? body.fulfills_request_id : undefined
    const { request, error } = await validateFulfillsRequest(fulfillsRequestId, 'ROOM_FACILITY')
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 })

    const facility = await prisma.$transaction(async (tx) => {
      const created = await tx.room_facilities.create({ data: { name, is_active } })
      if (request) await markRequestFulfilledTx(tx, request.id, auth.payload.actor_id, created.id)
      return created
    })

    if (request) await notifyRequestFulfilled({ id: request.id, requested_by: request.requested_by, category: 'ROOM_FACILITY' }, name)

    return NextResponse.json({ success: true, message: 'Room facility created successfully', data: facility })
  } catch (error) {
    console.error('Failed to create room facility:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}