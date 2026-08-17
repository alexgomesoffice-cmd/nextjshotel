import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { notifySystemAdmins } from '@/lib/notifications'
import { z } from 'zod'

const createSchema = z.object({
  category: z.enum(['AMENITY', 'BED_TYPE', 'ROOM_FACILITY']),
  name: z.string().min(2).max(150),
  note: z.string().min(1).max(2000),
  context: z.enum(['HOTEL', 'ROOM']).nullable().optional(),
})

/**
 * GET /api/hotel-admin/master-data-requests
 * This hotel's own requests across all three categories — entirely
 * separate from the case/review system (System Admin creates the item
 * manually, no field-level review involved).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const requests = await prisma.master_data_requests.findMany({
      where: { hotel_id: hotelId },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('Fetch master data requests error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const CATEGORY_LABEL: Record<string, string> = { AMENITY: 'Amenity', BED_TYPE: 'Bed Type', ROOM_FACILITY: 'Room Facility' }

/**
 * POST /api/hotel-admin/master-data-requests
 * Submits a new request. context is required for AMENITY, ignored otherwise.
 * hotel_id/requested_by/status/resolved_by/created_entity_id are always
 * server-derived — never accepted from the client body.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const body = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const { category, name, note, context } = result.data

    if (category === 'AMENITY' && !context) {
      return NextResponse.json({ success: false, message: 'Select whether this amenity is for the Hotel or a Room.' }, { status: 400 })
    }

    // Duplicate-pending protection — same hotel, category, name (and
    // context, for amenities) with an existing PENDING request.
    const duplicate = await prisma.master_data_requests.findFirst({
      where: {
        hotel_id: hotelId,
        category,
        name: { equals: name },
        status: 'PENDING',
        ...(category === 'AMENITY' ? { context } : {}),
      },
    })
    if (duplicate) {
      return NextResponse.json({ success: false, message: `A pending request for "${name}" already exists.` }, { status: 400 })
    }

    const request = await prisma.master_data_requests.create({
      data: {
        hotel_id: hotelId,
        requested_by: hotelAdminId,
        category,
        name,
        note,
        context: category === 'AMENITY' ? context : null,
      },
    })

    const hotel = await prisma.hotels.findUnique({ where: { id: hotelId }, select: { name: true } })
    await notifySystemAdmins({
      type: 'MASTER_DATA_REQUEST',
      title: 'New Master Data Request',
      message: `${hotel?.name ?? 'A hotel'} requested a new ${CATEGORY_LABEL[category]}: "${name}"`,
      relatedEntityType: 'MASTER_DATA_REQUEST',
      relatedEntityId: request.id,
    })

    return NextResponse.json({ success: true, message: 'Request submitted', data: request })
  } catch (error) {
    console.error('Create master data request error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}